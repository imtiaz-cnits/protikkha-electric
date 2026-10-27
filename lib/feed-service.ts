import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { recordStockMovement } from "@/lib/stock-service";
import { recordPartyTransaction } from "@/lib/party-ledger-service";
import { recordFinancialTransaction, getAccountByPaymentMethod } from "@/lib/financial-service";
import { logAudit } from "@/lib/audit-service";
import { convertFeedBagsToKg } from "@/lib/unit-service";

export interface RecordFeedPurchaseParams {
  supplierId: bigint | number;
  productId: bigint | number;
  bags: number;
  bagWeightKg?: number; // default 50kg
  costPricePerBag: number;
  paidAmount?: number;
  paymentMethod?: string;
  batchNo?: string;
  expiryDate?: Date;
  date?: Date;
  referenceNo?: string;
  note?: string | null;
  userId: bigint | number;
}

export interface RecordFeedSaleParams {
  customerId: bigint | number;
  productId: bigint | number;
  bags?: number;
  kg?: number;
  sellingPrice: number; // price per bag if bags sold, or per kg if kg sold
  isPerBagSale?: boolean; // true if price is per bag, false if per kg
  paidAmount?: number;
  paymentMethod?: string;
  date?: Date;
  note?: string | null;
  userId: bigint | number;
}

export interface RecordFeedPurchaseReturnParams {
  supplierId: bigint | number;
  productId: bigint | number;
  bags: number;
  bagWeightKg?: number;
  returnPricePerBag: number;
  refundReceived?: number;
  paymentMethod?: string;
  date?: Date;
  referenceNo?: string;
  note?: string | null;
  userId: bigint | number;
}

export interface RecordFeedCustomerReturnParams {
  customerId: bigint | number;
  productId: bigint | number;
  bags: number;
  bagWeightKg?: number;
  returnPricePerBag: number;
  refundPaid?: number;
  paymentMethod?: string;
  date?: Date;
  referenceNo?: string;
  note?: string | null;
  userId: bigint | number;
}

export interface RecordInternalFeedIssueParams {
  productId: bigint | number;
  destinationType: "POULTRY_FARM" | "FISH_POND";
  destinationId?: bigint | number | null;
  destinationName: string;
  bags: number;
  bagWeightKg?: number; // default 50kg
  date?: Date;
  note?: string | null;
  userId: bigint | number;
}

/**
 * Generate unique Issue Number for internal transfers
 */
function generateIssueNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ISS-${dateStr}-${randomSuffix}`;
}

/**
 * Poultry & Fish Feed Procurement (Purchase Inward)
 */
export async function recordFeedPurchase(params: RecordFeedPurchaseParams) {
  return prisma.$transaction(async (tx) => {
    const prodId = BigInt(params.productId);
    const suppId = BigInt(params.supplierId);
    const bags = Math.max(0, Number(params.bags || 0));
    const bagWeight = Number(params.bagWeightKg || 50);
    const costPerBag = Number(params.costPricePerBag || 0);
    const totalKg = convertFeedBagsToKg(bags, bagWeight);
    const totalBill = bags * costPerBag;
    const paidNum = Math.max(0, Number(params.paidAmount || 0));
    const dueNum = Math.max(0, totalBill - paidNum);
    const purDate = params.date || new Date();
    const costPerKg = bagWeight > 0 ? costPerBag / bagWeight : costPerBag;

    // Get FEED business unit
    const feedBu = await tx.business_units.findUnique({ where: { code: "FEED" } });

    // Fetch existing product for weighted average cost update
    const product = await tx.products.findUnique({ where: { id: prodId } });
    if (!product) throw new Error("Product not found");

    const currentStock = Math.max(0, parseFloat(product.quantity || "0"));
    const currentCost = parseFloat(product.cost_price || "0");
    const newTotalStock = currentStock + bags;
    const weightedAvgCost = newTotalStock > 0
      ? (currentStock * currentCost + bags * costPerBag) / newTotalStock
      : costPerBag;

    // 1. Record stock movement (in bags)
    const stockRes = await recordStockMovement(
      {
        productId: prodId,
        businessUnitId: feedBu?.id,
        movementType: "PURCHASE_INWARD",
        quantity: bags, // stock stored in bags
        unitPrice: costPerBag,
        referenceType: "PURCHASE",
        referenceNo: params.referenceNo || `PUR-FEED-${Date.now()}`,
        date: purDate,
        note: `Purchased ${bags} bags (${totalKg} kg) @ ৳${costPerBag}/bag`,
        userId: params.userId,
      },
      tx
    );

    // Update product cost_price with weighted average
    await tx.products.update({
      where: { id: prodId },
      data: {
        cost_price: weightedAvgCost.toFixed(2),
      },
    });

    // 2. Update Feed Product metadata (including batch & expiry)
    await tx.feed_products.upsert({
      where: { product_id: prodId },
      update: {
        bag_weight_kg: new Prisma.Decimal(bagWeight.toFixed(2)),
        batch_no: params.batchNo || undefined,
        expiry_date: params.expiryDate || undefined,
      },
      create: {
        product_id: prodId,
        feed_type: "Poultry/Fish Commercial Feed",
        target_type: "POULTRY",
        bag_weight_kg: new Prisma.Decimal(bagWeight.toFixed(2)),
        batch_no: params.batchNo || null,
        expiry_date: params.expiryDate || null,
        user_id: BigInt(params.userId),
      },
    });

    // 3. Update Supplier Ledger
    await recordPartyTransaction(
      {
        partyType: "SUPPLIER",
        supplierId: suppId,
        businessUnitId: feedBu?.id,
        transactionType: "INVOICE",
        referenceType: "PURCHASE",
        referenceNo: params.referenceNo,
        credit: totalBill,
        debit: paidNum,
        date: purDate,
        note: `Feed Purchase: ${bags} bags @ ৳${costPerBag}`,
        userId: params.userId,
      },
      tx
    );

    // 4. Financial Account Outflow if payment made
    if (paidNum > 0) {
      const financialAccount = await getAccountByPaymentMethod(params.paymentMethod, tx);
      if (financialAccount) {
        await recordFinancialTransaction(
          {
            accountId: financialAccount.id,
            businessUnitId: feedBu?.id,
            transactionType: "OUTFLOW",
            amount: paidNum,
            referenceType: "PURCHASE_PAYMENT",
            referenceNo: params.referenceNo,
            date: purDate,
            note: `Supplier payment for feed purchase (${params.paymentMethod || "Cash"})`,
            userId: params.userId,
          },
          tx
        );
      }
    }

    return {
      success: true,
      bags,
      totalKg,
      totalBill,
      paidAmount: paidNum,
      dueAmount: dueNum,
      costPerKg,
      weightedAvgCost,
      newStock: stockRes.newStock,
    };
  });
}

/**
 * Commercial Feed Sale (Wholesale or Retail, bag or kg)
 */
export async function recordFeedSale(params: RecordFeedSaleParams) {
  return prisma.$transaction(async (tx) => {
    const prodId = BigInt(params.productId);
    const custId = BigInt(params.customerId);
    const isPerBag = params.isPerBagSale !== false;
    const qtySold = isPerBag
      ? Math.max(0, Number(params.bags || 0))
      : Math.max(0, Number(params.kg || 0));
    const unitPrice = Number(params.sellingPrice || 0);
    const totalSaleAmount = qtySold * unitPrice;
    const paidNum = Math.max(0, Number(params.paidAmount || 0));
    const dueNum = Math.max(0, totalSaleAmount - paidNum);
    const saleDate = params.date || new Date();

    const feedBu = await tx.business_units.findUnique({ where: { code: "FEED" } });

    // Determine stock deduction: if sold in KG, convert to bags
    let stockQtyToDeduct = qtySold;
    if (!isPerBag) {
      const feedMeta = await tx.feed_products.findUnique({ where: { product_id: prodId } });
      const bagWeight = feedMeta ? Number(feedMeta.bag_weight_kg) : 50;
      stockQtyToDeduct = bagWeight > 0 ? qtySold / bagWeight : qtySold;
    }

    // 1. Deduct stock atomically
    const stockRes = await recordStockMovement(
      {
        productId: prodId,
        businessUnitId: feedBu?.id,
        movementType: "SALE_OUTWARD",
        quantity: stockQtyToDeduct,
        unitPrice,
        referenceType: "ORDER",
        date: saleDate,
        note: `Sold ${qtySold} ${isPerBag ? "bags" : "kg"} (${stockQtyToDeduct} bags deducted) @ ৳${unitPrice}`,
        userId: params.userId,
      },
      tx
    );

    // 2. Update Customer Ledger
    await recordPartyTransaction(
      {
        partyType: "CUSTOMER",
        customerId: custId,
        businessUnitId: feedBu?.id,
        transactionType: "INVOICE",
        referenceType: "ORDER",
        debit: totalSaleAmount,
        credit: paidNum,
        date: saleDate,
        note: `Feed Sale: ${qtySold} ${isPerBag ? "bags" : "kg"} @ ৳${unitPrice}`,
        userId: params.userId,
      },
      tx
    );

    // 3. Record Financial Inflow if paid
    if (paidNum > 0) {
      const financialAccount = await getAccountByPaymentMethod(params.paymentMethod, tx);
      if (financialAccount) {
        await recordFinancialTransaction(
          {
            accountId: financialAccount.id,
            businessUnitId: feedBu?.id,
            transactionType: "INFLOW",
            amount: paidNum,
            referenceType: "SALE_PAYMENT",
            date: saleDate,
            note: `Payment received for Feed Sale (${params.paymentMethod || "Cash"})`,
            userId: params.userId,
          },
          tx
        );
      }
    }

    return {
      success: true,
      quantitySold: qtySold,
      stockBagsDeducted: stockQtyToDeduct,
      totalSaleAmount,
      paidAmount: paidNum,
      dueAmount: dueNum,
      remainingStock: stockRes.newStock,
    };
  });
}

/**
 * Purchase Return to Supplier (Feed Return Outward)
 */
export async function recordFeedPurchaseReturn(params: RecordFeedPurchaseReturnParams) {
  return prisma.$transaction(async (tx) => {
    const prodId = BigInt(params.productId);
    const suppId = BigInt(params.supplierId);
    const bags = Math.max(0, Number(params.bags || 0));
    const bagWeight = Number(params.bagWeightKg || 50);
    const returnPrice = Number(params.returnPricePerBag || 0);
    const totalReturnBill = bags * returnPrice;
    const refundReceived = Math.max(0, Number(params.refundReceived || 0));
    const returnDate = params.date || new Date();

    const feedBu = await tx.business_units.findUnique({ where: { code: "FEED" } });

    // 1. Deduct stock via PURCHASE_RETURN_OUTWARD
    const stockRes = await recordStockMovement(
      {
        productId: prodId,
        businessUnitId: feedBu?.id,
        movementType: "PURCHASE_RETURN_OUTWARD",
        quantity: bags,
        unitPrice: returnPrice,
        referenceType: "PURCHASE_RETURN",
        referenceNo: params.referenceNo || `PRET-FEED-${Date.now()}`,
        date: returnDate,
        note: `Returned ${bags} bags feed to supplier`,
        userId: params.userId,
      },
      tx
    );

    // 2. Update Supplier Ledger: Debit supplier (reduces supplier payable)
    await recordPartyTransaction(
      {
        partyType: "SUPPLIER",
        supplierId: suppId,
        businessUnitId: feedBu?.id,
        transactionType: "PURCHASE_RETURN",
        referenceType: "PURCHASE_RETURN",
        referenceNo: params.referenceNo,
        debit: totalReturnBill,
        credit: refundReceived,
        date: returnDate,
        note: `Feed Purchase Return: ${bags} bags @ ৳${returnPrice}`,
        userId: params.userId,
      },
      tx
    );

    // 3. Financial Inflow if cash/bank refund received
    if (refundReceived > 0) {
      const financialAccount = await getAccountByPaymentMethod(params.paymentMethod, tx);
      if (financialAccount) {
        await recordFinancialTransaction(
          {
            accountId: financialAccount.id,
            businessUnitId: feedBu?.id,
            transactionType: "INFLOW",
            amount: refundReceived,
            referenceType: "REFUND_RECEIVED",
            referenceNo: params.referenceNo,
            date: returnDate,
            note: `Supplier refund for feed purchase return (${params.paymentMethod || "Cash"})`,
            userId: params.userId,
          },
          tx
        );
      }
    }

    return {
      success: true,
      bagsReturned: bags,
      totalReturnBill,
      refundReceived,
      remainingStock: stockRes.newStock,
    };
  });
}

/**
 * Customer Return (Feed Sale Return Inward)
 */
export async function recordFeedCustomerReturn(params: RecordFeedCustomerReturnParams) {
  return prisma.$transaction(async (tx) => {
    const prodId = BigInt(params.productId);
    const custId = BigInt(params.customerId);
    const bags = Math.max(0, Number(params.bags || 0));
    const bagWeight = Number(params.bagWeightKg || 50);
    const returnPrice = Number(params.returnPricePerBag || 0);
    const totalReturnBill = bags * returnPrice;
    const refundPaid = Math.max(0, Number(params.refundPaid || 0));
    const returnDate = params.date || new Date();

    const feedBu = await tx.business_units.findUnique({ where: { code: "FEED" } });

    // 1. Inward stock via SALE_RETURN_INWARD
    const stockRes = await recordStockMovement(
      {
        productId: prodId,
        businessUnitId: feedBu?.id,
        movementType: "SALE_RETURN_INWARD",
        quantity: bags,
        unitPrice: returnPrice,
        referenceType: "SALE_RETURN",
        referenceNo: params.referenceNo || `CRET-FEED-${Date.now()}`,
        date: returnDate,
        note: `Customer returned ${bags} bags feed`,
        userId: params.userId,
      },
      tx
    );

    // 2. Update Customer Ledger: Credit customer (reduces customer receivable)
    await recordPartyTransaction(
      {
        partyType: "CUSTOMER",
        customerId: custId,
        businessUnitId: feedBu?.id,
        transactionType: "SALE_RETURN",
        referenceType: "SALE_RETURN",
        referenceNo: params.referenceNo,
        debit: refundPaid,
        credit: totalReturnBill,
        date: returnDate,
        note: `Feed Customer Return: ${bags} bags @ ৳${returnPrice}`,
        userId: params.userId,
      },
      tx
    );

    // 3. Financial Outflow if cash/bank refund was paid back
    if (refundPaid > 0) {
      const financialAccount = await getAccountByPaymentMethod(params.paymentMethod, tx);
      if (financialAccount) {
        await recordFinancialTransaction(
          {
            accountId: financialAccount.id,
            businessUnitId: feedBu?.id,
            transactionType: "OUTFLOW",
            amount: refundPaid,
            referenceType: "REFUND_PAID",
            referenceNo: params.referenceNo,
            date: returnDate,
            note: `Refund paid to customer for returned feed (${params.paymentMethod || "Cash"})`,
            userId: params.userId,
          },
          tx
        );
      }
    }

    return {
      success: true,
      bagsReturned: bags,
      totalReturnBill,
      refundPaid,
      remainingStock: stockRes.newStock,
    };
  });
}

/**
 * MANDATORY: Internal Feed Issue Engine
 * Transfers feed inventory directly to farm sheds or fish ponds.
 * STRICT CRITERIA:
 * 1. Feed Trading stock decreases by the exact quantity.
 * 2. Receiving destination is allocated the feed cost.
 * 3. NO external sales invoice is created.
 * 4. NO customer receivable is created.
 * 5. NO sales revenue is credited.
 */
export async function recordInternalFeedIssue(params: RecordInternalFeedIssueParams) {
  return prisma.$transaction(async (tx) => {
    const prodId = BigInt(params.productId);
    const bags = Math.max(0, Number(params.bags || 0));
    const bagWeight = Number(params.bagWeightKg || 50);
    const totalKg = convertFeedBagsToKg(bags, bagWeight);
    const issueDate = params.date || new Date();
    const issueCode = generateIssueNumber();

    // 1. Fetch product to determine current unit cost
    const product = await tx.products.findUnique({
      where: { id: prodId },
    });
    if (!product) throw new Error("Feed product not found");

    const costPricePerBag = parseFloat(product.cost_price || "0");
    const unitCostPerKg = bagWeight > 0 ? costPricePerBag / bagWeight : costPricePerBag;
    const totalFeedCost = bags * costPricePerBag;

    // Get source business unit (FEED)
    const feedBu = await tx.business_units.findUnique({ where: { code: "FEED" } });
    if (!feedBu) throw new Error("FEED business unit not found");

    // 2. Deduct stock atomically with INTERNAL_ISSUE_OUTWARD movement
    const stockRes = await recordStockMovement(
      {
        productId: prodId,
        businessUnitId: feedBu.id,
        movementType: "INTERNAL_ISSUE_OUTWARD",
        quantity: bags,
        unitPrice: costPricePerBag,
        referenceType: "INTERNAL_TRANSFER",
        referenceNo: issueCode,
        date: issueDate,
        note: `Internal Issue: ${bags} bags (${totalKg} kg) issued to ${params.destinationName}`,
        userId: params.userId,
      },
      tx
    );

    // 3. Record in internal_feed_issues table
    const issueRecord = await tx.internal_feed_issues.create({
      data: {
        issue_no: issueCode,
        product_id: prodId,
        source_business_unit_id: feedBu.id,
        destination_type: params.destinationType,
        destination_id: params.destinationId ? BigInt(params.destinationId) : null,
        destination_name: params.destinationName,
        bags: new Prisma.Decimal(bags.toFixed(2)),
        bag_weight_kg: new Prisma.Decimal(bagWeight.toFixed(2)),
        total_kg: new Prisma.Decimal(totalKg.toFixed(3)),
        unit_cost_per_kg: new Prisma.Decimal(unitCostPerKg.toFixed(2)),
        total_cost: new Prisma.Decimal(totalFeedCost.toFixed(2)),
        date: issueDate,
        note: params.note || null,
        user_id: BigInt(params.userId),
      },
    });

    // 4. Audit Log
    await logAudit(
      {
        userId: params.userId,
        action: "CREATE",
        entityType: "INTERNAL_FEED_ISSUE",
        entityId: String(issueRecord.id),
        newValues: {
          issue_no: issueCode,
          destination: params.destinationName,
          bags,
          total_kg: totalKg,
          cost: totalFeedCost,
        },
      },
      tx
    );

    return {
      issueRecord,
      issueCode,
      bagsIssued: bags,
      totalKg,
      unitCostPerKg,
      totalCostAllocated: totalFeedCost,
      remainingFeedStock: stockRes.newStock,
      destinationName: params.destinationName,
    };
  });
}

/**
 * Feed Stock & Profitability Summary
 */
export async function getFeedStockAndProfitability() {
  const feedBu = await prisma.business_units.findUnique({ where: { code: "FEED" } });

  // Get all stock movements related to feed
  const movements = await prisma.stock_movements.findMany({
    where: {
      OR: [
        { business_unit_id: feedBu?.id },
        { movement_type: { in: ["INTERNAL_ISSUE_OUTWARD", "INTERNAL_ISSUE_INWARD"] } },
      ],
    },
    include: {
      products: { select: { product_name: true, quantity: true, cost_price: true, sell_price: true } },
    },
  });

  const internalIssues = await prisma.internal_feed_issues.findMany({
    orderBy: { id: "desc" },
    include: {
      products: { select: { product_name: true } },
    },
  });

  // Calculate aggregations
  let totalPurchasedBags = 0;
  let totalPurchasedCost = 0;
  let totalSoldBags = 0;
  let totalSalesRevenue = 0;
  let totalIssuedBags = 0;
  let totalIssuedCost = 0;

  for (const m of movements) {
    const q = Number(m.quantity);
    const val = Number(m.total_value);

    if (m.movement_type === "PURCHASE_INWARD") {
      totalPurchasedBags += q;
      totalPurchasedCost += val;
    } else if (m.movement_type === "SALE_OUTWARD") {
      totalSoldBags += q;
      totalSalesRevenue += val;
    } else if (m.movement_type === "INTERNAL_ISSUE_OUTWARD") {
      totalIssuedBags += q;
      totalIssuedCost += val;
    }
  }

  // Cost of goods sold for external sales only
  const avgCostPerBag = totalPurchasedBags > 0 ? totalPurchasedCost / totalPurchasedBags : 0;
  const cogsExternalSales = totalSoldBags * avgCostPerBag;
  const grossProfit = totalSalesRevenue - cogsExternalSales;

  return {
    summary: {
      total_purchased_bags: totalPurchasedBags,
      total_purchased_cost: totalPurchasedCost,
      total_sold_bags: totalSoldBags,
      total_sales_revenue: totalSalesRevenue,
      cogs_external_sales: cogsExternalSales,
      gross_profit: grossProfit,
      total_internally_issued_bags: totalIssuedBags,
      total_internally_issued_cost: totalIssuedCost,
      expected_inventory_bags: totalPurchasedBags - totalSoldBags - totalIssuedBags,
    },
    recent_internal_issues: internalIssues.slice(0, 15).map((iss) => ({
      id: Number(iss.id),
      issue_no: iss.issue_no,
      product_name: iss.products?.product_name,
      destination: iss.destination_name,
      destination_type: iss.destination_type,
      bags: Number(iss.bags),
      total_kg: Number(iss.total_kg),
      unit_cost_per_kg: Number(iss.unit_cost_per_kg),
      total_cost: Number(iss.total_cost),
      date: iss.date.toISOString().split("T")[0],
    })),
  };
}
