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
  | "ADJUSTMENT";

export type StockReferenceType =
  | "ORDER"
  | "PURCHASE"
  | "INTERNAL_TRANSFER"
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
      params.movementType === "DAMAGE_LOSS";

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
