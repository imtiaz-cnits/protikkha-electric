import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type StockMovementType =
  | "PURCHASE_INWARD"
  | "SALE_OUTWARD"
  | "INTERNAL_ISSUE_OUTWARD"
  | "INTERNAL_ISSUE_INWARD"
  | "PURCHASE_RETURN_OUTWARD"
  | "SALE_RETURN_INWARD"
  | "HARVEST_INWARD"
  | "DAMAGE_LOSS"
  | "RETURN_INWARD"
  | "ADJUSTMENT"
  | "SCRAP_CABLE_LOSS"
  | "ADJUSTMENT_ADD"
  | "ADJUSTMENT_SUBTRACT"
  | "TRANSFER_DISPATCH_OUTWARD"
  | "TRANSFER_RECEIVE_INWARD"
  | "DRUM_ISSUE_OUTWARD"
  | "DRUM_RETURN_INWARD";

export type StockReferenceType =
  | "ORDER"
  | "PURCHASE"
  | "INTERNAL_TRANSFER"
  | "TRANSFER"
  | "CABLE_DRUM"
  | "HARVEST"
  | "EGG_COLLECTION"
  | "ADJUSTMENT"
  | "RETURN"
  | "PURCHASE_RETURN"
  | "SALE_RETURN";

export interface RecordStockMovementParams {
  productId: bigint | number;
  businessUnitId?: bigint | number | null;
  movementType: StockMovementType;
  quantity: number; // positive quantity
  unitPrice?: number;
  referenceType: StockReferenceType;
  referenceId?: bigint | number | null;
  referenceNo?: string | null;
  date?: Date;
  note?: string | null;
  userId: bigint | number;
  allowNegativeStock?: boolean;
}

/**
 * Central Atomic Stock Movement Engine
 * Locks the product row FOR UPDATE to prevent deadlocks and race conditions.
 * Ensures stock ledger audit trail is created atomically with product quantity updates.
 */
export async function recordStockMovement(
  params: RecordStockMovementParams,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const prodId = BigInt(params.productId);
    const qty = Math.abs(Number(params.quantity || 0));
    const price = Number(params.unitPrice || 0);
    const totalVal = qty * price;

    if (qty <= 0) {
      throw new Error("Movement quantity must be greater than zero");
    }

    // 1. Lock product row FOR UPDATE
    const [currentProd]: any = await client.$queryRawUnsafe(
      "SELECT id, product_name, quantity, cost_price FROM products WHERE id = ? FOR UPDATE",
      prodId
    );

    if (!currentProd) {
      throw new Error(`Product with ID ${prodId} not found`);
    }

    const currentStock = parseFloat(String(currentProd.quantity || "0"));

    // 2. Classify if outward (deducts stock) or inward (adds stock)
    const isOutward =
      params.movementType === "SALE_OUTWARD" ||
      params.movementType === "INTERNAL_ISSUE_OUTWARD" ||
      params.movementType === "PURCHASE_RETURN_OUTWARD" ||
      params.movementType === "DAMAGE_LOSS" ||
      params.movementType === "SCRAP_CABLE_LOSS" ||
      params.movementType === "ADJUSTMENT_SUBTRACT" ||
      params.movementType === "TRANSFER_DISPATCH_OUTWARD" ||
      params.movementType === "DRUM_ISSUE_OUTWARD";

    let newStock: number;
    if (isOutward) {
      if (!params.allowNegativeStock && qty > currentStock) {
        throw new Error(
          `Insufficient stock for "${currentProd.product_name}". Current stock: ${currentStock}, Requested: ${qty}`
        );
      }
      newStock = currentStock - qty;
    } else {
      newStock = currentStock + qty;
    }

    // 3. Update products table
    await client.products.update({
      where: { id: prodId },
      data: {
        quantity: String(newStock),
        // If purchase inward, update cost price if provided
        ...(params.movementType === "PURCHASE_INWARD" && price > 0
          ? { cost_price: String(price) }
          : {}),
      },
    });

    // 4. Create immutable stock movement ledger entry
    const movement = await client.stock_movements.create({
      data: {
        product_id: prodId,
        business_unit_id: params.businessUnitId ? BigInt(params.businessUnitId) : null,
        movement_type: params.movementType,
        quantity: new Prisma.Decimal(qty.toFixed(3)),
        unit_price: new Prisma.Decimal(price.toFixed(2)),
        total_value: new Prisma.Decimal(totalVal.toFixed(2)),
        reference_type: params.referenceType,
        reference_id: params.referenceId ? BigInt(params.referenceId) : null,
        reference_no: params.referenceNo || null,
        stock_after: new Prisma.Decimal(newStock.toFixed(3)),
        date: params.date || new Date(),
        note: params.note || null,
        user_id: BigInt(params.userId),
      },
    });

    return {
      movement,
      previousStock: currentStock,
      newStock,
      productName: currentProd.product_name,
    };
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (newTx) => execute(newTx));
  }
}

/**
 * Get current stock and movement history for a product
 */
export async function getProductStockOverview(productId: bigint | number) {
  const prodId = BigInt(productId);
  const product = await prisma.products.findUnique({
    where: { id: prodId },
    include: {
      units: true,
      categories: true,
      brands: true,
    },
  });

  if (!product) return null;

  const movements = await prisma.stock_movements.findMany({
    where: { product_id: prodId },
    orderBy: { id: "desc" },
    take: 20,
    include: {
      business_units: { select: { code: true, name: true } },
      users: { select: { name: true } },
    },
  });

  return {
    product: {
      id: Number(product.id),
      name: product.product_name,
      current_stock: parseFloat(product.quantity || "0"),
      unit: product.units?.unit_name || "Pcs",
      cost_price: parseFloat(product.cost_price || "0"),
      sell_price: parseFloat(product.sell_price || "0"),
    },
    recent_movements: movements.map((m) => ({
      id: Number(m.id),
      movement_type: m.movement_type,
      quantity: Number(m.quantity),
      unit_price: Number(m.unit_price),
      total_value: Number(m.total_value),
      reference_no: m.reference_no,
      stock_after: Number(m.stock_after),
      date: m.date.toISOString().split("T")[0],
      note: m.note,
      business_unit: m.business_units?.name || "General",
      created_by: m.users?.name,
    })),
  };
}

/**
 * Adjust stock level directly to a target quantity (physical count or scrap adjustment)
 * Atomically computes delta, logs movement type, and records in stock_movements
 */
export async function adjustProductStock(
  productId: bigint | number,
  targetQuantity: number,
  reason: string,
  userId: bigint | number,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const prodId = BigInt(productId);
    const target = Math.max(0, Number(targetQuantity) || 0);

    const [currentProd]: any = await client.$queryRawUnsafe(
      "SELECT id, product_name, quantity, cost_price FROM products WHERE id = ? FOR UPDATE",
      prodId
    );

    if (!currentProd) {
      throw new Error(`Product with ID ${prodId} not found`);
    }

    const currentStock = parseFloat(String(currentProd.quantity || "0"));
    const delta = parseFloat((target - currentStock).toFixed(3));

    if (delta === 0) {
      return {
        previousStock: currentStock,
        newStock: currentStock,
        delta: 0,
        productName: currentProd.product_name,
      };
    }

    const isLoss = delta < 0;
    const absQty = Math.abs(delta);
    const costPrice = parseFloat(String(currentProd.cost_price || "0"));
    const totalVal = parseFloat((absQty * costPrice).toFixed(2));

    const movementType: StockMovementType = isLoss
      ? reason.toLowerCase().includes("scrap") || reason.toLowerCase().includes("cut")
        ? "SCRAP_CABLE_LOSS"
        : "DAMAGE_LOSS"
      : "ADJUSTMENT";

    await client.products.update({
      where: { id: prodId },
      data: { quantity: String(target) },
    });

    const timestamp = Date.now();
    const movement = await client.stock_movements.create({
      data: {
        product_id: prodId,
        movement_type: movementType,
        quantity: new Prisma.Decimal(absQty.toFixed(3)),
        unit_price: new Prisma.Decimal(costPrice.toFixed(2)),
        total_value: new Prisma.Decimal(totalVal.toFixed(2)),
        reference_type: "ADJUSTMENT",
        reference_no: `ADJ-${timestamp}`,
        stock_after: new Prisma.Decimal(target.toFixed(3)),
        date: new Date(),
        note: reason || "Manual Physical Count Adjustment",
        user_id: BigInt(userId),
      },
    });

    return {
      movement,
      previousStock: currentStock,
      newStock: target,
      delta,
      productName: currentProd.product_name,
    };
  };

  if (tx) {
    return execute(tx);
  } else {
    return prisma.$transaction(async (newTx) => execute(newTx));
  }
}

/**
 * Atomic Inter-Store / Warehouse Transfer Dispatch
 */
export async function executeTransferDispatch(
  transferId: bigint | number,
  userId: bigint | number,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const tId = BigInt(transferId);
    const transfer: any = await client.stock_transfers.findUnique({
      where: { id: tId },
      include: { transfer_items: true },
    });

    if (!transfer) throw new Error(`Transfer #${transferId} not found`);
    if (transfer.status !== "PENDING") {
      throw new Error(`Transfer is in "${transfer.status}" status; cannot dispatch.`);
    }

    for (const item of transfer.transfer_items) {
      const pId = BigInt(item.product_id);
      const qty = parseFloat(String(item.quantity || "0"));

      // 1. Lock product row FOR UPDATE
      const [prod]: any = await client.$queryRawUnsafe(
        "SELECT id, product_name, quantity, cost_price FROM products WHERE id = ? FOR UPDATE",
        pId
      );
      if (!prod) throw new Error(`Product #${item.product_id} not found`);

      const currentStock = parseFloat(String(prod.quantity || "0"));
      if (qty > currentStock) {
        throw new Error(`Insufficient stock for "${prod.product_name}". Available: ${currentStock}, Requested: ${qty}`);
      }

      const newStock = currentStock - qty;
      await client.products.update({
        where: { id: pId },
        data: { quantity: String(newStock) },
      });

      // Record outward movement
      await client.stock_movements.create({
        data: {
          product_id: pId,
          business_unit_id: transfer.from_unit_id,
          movement_type: "TRANSFER_DISPATCH_OUTWARD",
          quantity: new Prisma.Decimal(qty.toFixed(3)),
          unit_price: new Prisma.Decimal(Number(item.unit_cost || prod.cost_price || 0).toFixed(2)),
          total_value: new Prisma.Decimal((qty * Number(item.unit_cost || prod.cost_price || 0)).toFixed(2)),
          reference_type: "TRANSFER",
          reference_id: transfer.id,
          reference_no: transfer.transfer_no,
          stock_after: new Prisma.Decimal(newStock.toFixed(3)),
          date: new Date(),
          note: `Transfer dispatch to Unit #${transfer.to_unit_id}`,
          user_id: BigInt(userId),
        },
      });
    }

    const updated = await client.stock_transfers.update({
      where: { id: tId },
      data: {
        status: "DISPATCHED",
        dispatched_at: new Date(),
      },
    });

    return updated;
  };

  if (tx) return execute(tx);
  return prisma.$transaction(async (newTx) => execute(newTx));
}

/**
 * Atomic Inter-Store / Warehouse Transfer Receive
 */
export async function executeTransferReceive(
  transferId: bigint | number,
  userId: bigint | number,
  tx?: Prisma.TransactionClient
) {
  const execute = async (client: Prisma.TransactionClient) => {
    const tId = BigInt(transferId);
    const transfer: any = await client.stock_transfers.findUnique({
      where: { id: tId },
      include: { transfer_items: true },
    });

    if (!transfer) throw new Error(`Transfer #${transferId} not found`);
    if (transfer.status !== "DISPATCHED") {
      throw new Error(`Transfer is in "${transfer.status}" status; only DISPATCHED transfers can be received.`);
    }

    for (const item of transfer.transfer_items) {
      const pId = BigInt(item.product_id);
      const qty = parseFloat(String(item.received_quantity ?? item.quantity ?? "0"));

      const [prod]: any = await client.$queryRawUnsafe(
        "SELECT id, product_name, quantity, cost_price FROM products WHERE id = ? FOR UPDATE",
        pId
      );
      if (!prod) throw new Error(`Product #${item.product_id} not found`);

      const currentStock = parseFloat(String(prod.quantity || "0"));
      const newStock = currentStock + qty;

      await client.products.update({
        where: { id: pId },
        data: { quantity: String(newStock) },
      });

      // Record inward movement at destination store
      await client.stock_movements.create({
        data: {
          product_id: pId,
          business_unit_id: transfer.to_unit_id,
          movement_type: "TRANSFER_RECEIVE_INWARD",
          quantity: new Prisma.Decimal(qty.toFixed(3)),
          unit_price: new Prisma.Decimal(Number(item.unit_cost || prod.cost_price || 0).toFixed(2)),
          total_value: new Prisma.Decimal((qty * Number(item.unit_cost || prod.cost_price || 0)).toFixed(2)),
          reference_type: "TRANSFER",
          reference_id: transfer.id,
          reference_no: transfer.transfer_no,
          stock_after: new Prisma.Decimal(newStock.toFixed(3)),
          date: new Date(),
          note: `Transfer received from Unit #${transfer.from_unit_id}`,
          user_id: BigInt(userId),
        },
      });
    }

    const updated = await client.stock_transfers.update({
      where: { id: tId },
      data: {
        status: "RECEIVED",
        received_at: new Date(),
      },
    });

    return updated;
  };

  if (tx) return execute(tx);
  return prisma.$transaction(async (newTx) => execute(newTx));
}

