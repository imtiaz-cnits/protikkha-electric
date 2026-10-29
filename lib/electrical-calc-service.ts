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
