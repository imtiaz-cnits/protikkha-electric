/**
 * Protikkha Electric - Electrical Financial & Costing Calculation Engine
 * 
 * Implements strict decimal arithmetic for:
 * - Line item gross/net & invoice subtotal
 * - Proportional Cost of Goods Sold (COGS) on cut-length cable sales
 * - Gross Profit and Gross Margin % calculations
 * - Warranty expiration and validity checks
 * - Invariant: Initial Purchase Cost === Allocated COGS + Remaining Inventory Value
 */

export interface LineItemInput {
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  costPrice?: number;
}

export interface LineItemCalculated {
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineGross: number;
  lineDiscount: number;
  lineNet: number;
  cogs: number;
  grossProfit: number;
}

export interface InvoiceCalculationInput {
  items: LineItemInput[];
  invoiceDiscount?: number;
  deliveryCharge?: number;
  paidAmount?: number;
}

export interface InvoiceCalculationResult {
  items: LineItemCalculated[];
  subtotal: number;
  invoiceDiscount: number;
  deliveryCharge: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  totalCogs: number;
  totalGrossProfit: number;
  grossMarginPercent: number;
}

/**
 * Calculate financial totals and profit margins for an electrical sales invoice
 */
export function calculateInvoiceTotals(input: InvoiceCalculationInput): InvoiceCalculationResult {
  const calculatedItems: LineItemCalculated[] = [];
  let subtotal = 0;
  let totalCogs = 0;

  for (const item of input.items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    const cost = Math.max(0, Number(item.costPrice) || 0);
    const discount = Math.max(0, Number(item.discountAmount) || 0);

    const lineGross = parseFloat((qty * price).toFixed(2));
    const lineDiscount = Math.min(lineGross, discount);
    const lineNet = parseFloat((lineGross - lineDiscount).toFixed(2));
    const cogs = parseFloat((qty * cost).toFixed(2));
    const grossProfit = parseFloat((lineNet - cogs).toFixed(2));

    subtotal = parseFloat((subtotal + lineNet).toFixed(2));
    totalCogs = parseFloat((totalCogs + cogs).toFixed(2));

    calculatedItems.push({
      quantity: qty,
      unitPrice: price,
      costPrice: cost,
      lineGross,
      lineDiscount,
      lineNet,
      cogs,
      grossProfit,
    });
  }

  const invoiceDiscount = Math.min(subtotal, Math.max(0, Number(input.invoiceDiscount) || 0));
  const deliveryCharge = Math.max(0, Number(input.deliveryCharge) || 0);
  const totalAmount = parseFloat((subtotal - invoiceDiscount + deliveryCharge).toFixed(2));
  const paidAmount = Math.max(0, Number(input.paidAmount) || 0);
  const dueAmount = parseFloat(Math.max(0, totalAmount - paidAmount).toFixed(2));

  const totalGrossProfit = parseFloat((subtotal - invoiceDiscount - totalCogs).toFixed(2));
  const netRevenue = subtotal - invoiceDiscount;
  const grossMarginPercent = netRevenue > 0
    ? parseFloat(((totalGrossProfit / netRevenue) * 100).toFixed(2))
    : 0;

  return {
    items: calculatedItems,
    subtotal,
    invoiceDiscount,
    deliveryCharge,
    totalAmount,
    paidAmount,
    dueAmount,
    totalCogs,
    totalGrossProfit,
    grossMarginPercent,
  };
}

/**
 * Cable Cut-Length Inventory Valuation & Proportional Cost Allocation
 * 
 * Given initial reel length and cost, calculates:
 * - Unit cost per meter
 * - Allocated COGS for cut length sold
 * - Remaining meters in inventory
 * - Remaining asset value
 * - Invariant: Initial Cost === Allocated COGS + Remaining Value
 */
export function calculateCutLengthCosting(
  initialReelMeters: number,
  totalReelCost: number,
  cutMetersSold: number,
  sellingPricePerMeter: number
) {
  const totalMeters = Math.max(0.001, Number(initialReelMeters) || 100);
  const reelCost = Math.max(0, Number(totalReelCost) || 0);
  const soldMeters = Math.min(totalMeters, Math.max(0, Number(cutMetersSold) || 0));
  const sellPrice = Math.max(0, Number(sellingPricePerMeter) || 0);

  const unitCostPerMeter = parseFloat((reelCost / totalMeters).toFixed(4));
  const cogsAllocated = parseFloat((soldMeters * unitCostPerMeter).toFixed(2));
  const revenue = parseFloat((soldMeters * sellPrice).toFixed(2));
  const grossProfit = parseFloat((revenue - cogsAllocated).toFixed(2));
  const marginPercent = revenue > 0 ? parseFloat(((grossProfit / revenue) * 100).toFixed(2)) : 0;

  const remainingMeters = parseFloat((totalMeters - soldMeters).toFixed(3));
  const remainingValue = parseFloat((reelCost - cogsAllocated).toFixed(2));

  return {
    unitCostPerMeter,
    soldMeters,
    revenue,
    cogsAllocated,
    grossProfit,
    marginPercent,
    remainingMeters,
    remainingValue,
    // Invariant verification check
    isReconciled: Math.abs((cogsAllocated + remainingValue) - reelCost) < 0.01,
  };
}

/**
 * Calculate Warranty Expiry Date & Active Status
 */
export function calculateWarrantyStatus(
  purchaseDate: Date | string,
  warrantyMonths: number,
  currentDate: Date = new Date()
): { expiryDate: Date; isExpired: boolean; daysRemaining: number } {
  const pDate = new Date(purchaseDate);
  const months = Math.max(0, Number(warrantyMonths) || 0);

  const expiryDate = new Date(pDate);
  expiryDate.setMonth(expiryDate.getMonth() + months);

  const diffTime = expiryDate.getTime() - currentDate.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;

  return {
    expiryDate,
    isExpired,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

/**
 * Landed Cost Allocation Engine
 * Apportions freight, transport, carrying and labor charges across purchase line items
 * to produce accurate capitalized inventory unit costs.
 */
export type LandedCostMethod = "BY_VALUE" | "BY_QUANTITY" | "MANUAL";

export interface LandedCostItemInput {
  productId: number | bigint;
  productName: string;
  quantity: number;
  unitPrice: number;
  manualFreightAllocation?: number;
}

export interface LandedCostItemResult {
  productId: number | bigint;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  allocatedFreight: number;
  totalLandedCost: number;
  landedCostPerUnit: number;
}

export interface LandedCostAllocationResult {
  method: LandedCostMethod;
  totalFreight: number;
  totalGoodsSubtotal: number;
  totalLandedCost: number;
  items: LandedCostItemResult[];
  isBalanced: boolean;
}

export function allocateLandedCosts(
  items: LandedCostItemInput[],
  totalFreight: number,
  method: LandedCostMethod = "BY_VALUE"
): LandedCostAllocationResult {
  const freight = Math.max(0, Number(totalFreight) || 0);
  const totalSubtotal = items.reduce((sum, item) => {
    const q = Math.max(0, Number(item.quantity) || 0);
    const p = Math.max(0, Number(item.unitPrice) || 0);
    return sum + q * p;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);

  const results: LandedCostItemResult[] = [];
  let allocatedSum = 0;

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const qty = Math.max(0, Number(it.quantity) || 0);
    const price = Math.max(0, Number(it.unitPrice) || 0);
    const lineSubtotal = parseFloat((qty * price).toFixed(2));

    let allocatedLineFreight = 0;
    if (freight > 0) {
      if (method === "BY_VALUE" && totalSubtotal > 0) {
        allocatedLineFreight = parseFloat(((lineSubtotal / totalSubtotal) * freight).toFixed(2));
      } else if (method === "BY_QUANTITY" && totalQuantity > 0) {
        allocatedLineFreight = parseFloat(((qty / totalQuantity) * freight).toFixed(2));
      } else if (method === "MANUAL") {
        allocatedLineFreight = Math.max(0, Number(it.manualFreightAllocation) || 0);
      }
    }

    // For the last item under proportional allocation, absorb any 1-cent rounding difference
    if (i === items.length - 1 && method !== "MANUAL" && freight > 0) {
      const remainingFreight = parseFloat((freight - allocatedSum).toFixed(2));
      if (Math.abs(remainingFreight - allocatedLineFreight) <= 0.05) {
        allocatedLineFreight = remainingFreight;
      }
    }

    allocatedSum = parseFloat((allocatedSum + allocatedLineFreight).toFixed(2));

    const totalLandedCost = parseFloat((lineSubtotal + allocatedLineFreight).toFixed(2));
    const landedCostPerUnit = qty > 0 ? parseFloat((totalLandedCost / qty).toFixed(2)) : price;

    results.push({
      productId: it.productId,
      productName: it.productName,
      quantity: qty,
      unitPrice: price,
      subtotal: lineSubtotal,
      allocatedFreight: allocatedLineFreight,
      totalLandedCost,
      landedCostPerUnit,
    });
  }

  const grandLandedCost = parseFloat((totalSubtotal + freight).toFixed(2));
  const sumOfLandedCosts = results.reduce((sum, r) => sum + r.totalLandedCost, 0);

  return {
    method,
    totalFreight: freight,
    totalGoodsSubtotal: totalSubtotal,
    totalLandedCost: grandLandedCost,
    items: results,
    isBalanced: Math.abs(sumOfLandedCosts - grandLandedCost) < 0.02,
  };
}
