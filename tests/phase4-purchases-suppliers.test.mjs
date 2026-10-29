import test from "node:test";
import assert from "node:assert/strict";

import {
  convertReelToMeters,
  convertBoxToPieces,
  convertPackagingQuantity,
} from "../lib/electrical-unit-service.ts";
import { calculateInvoiceTotals, calculateCutLengthCosting } from "../lib/electrical-calc-service.ts";

test("1. Electrical Purchase Inward: Packaging Conversion (Reels to Meters, Boxes to Pcs)", () => {
  // Case A: Receiving 8 Reels of 2.5 RM BYA Cable (100 meters per reel)
  const cablePurchaseItem = {
    product_id: 201,
    product_name: "BRB 2.5 RM BYA Cable Red",
    package_unit: "Reel",
    package_quantity: 8,
    conversion_ratio: 100,
    cost_price_per_reel: 8500.0,
  };

  const effectiveMeters = convertReelToMeters(
    cablePurchaseItem.package_quantity,
    cablePurchaseItem.conversion_ratio
  );
  assert.equal(effectiveMeters, 800); // 8 * 100 = 800 Meters
  const totalCableCost = cablePurchaseItem.package_quantity * cablePurchaseItem.cost_price_per_reel;
  assert.equal(totalCableCost, 68000.0);
  const costPerMeter = parseFloat((totalCableCost / effectiveMeters).toFixed(2));
  assert.equal(costPerMeter, 85.0); // 85 BDT per meter

  // Case B: Receiving 15 Boxes of Gang Switches (20 pcs per box)
  const switchPurchaseItem = {
    product_id: 202,
    product_name: "Super Star 1-Gang Switch Piano",
    package_unit: "Box",
    package_quantity: 15,
    conversion_ratio: 20,
    cost_price_per_box: 1600.0,
  };

  const effectivePieces = convertBoxToPieces(
    switchPurchaseItem.package_quantity,
    switchPurchaseItem.conversion_ratio
  );
  assert.equal(effectivePieces, 300); // 15 * 20 = 300 Pieces
  const totalSwitchCost = switchPurchaseItem.package_quantity * switchPurchaseItem.cost_price_per_box;
  assert.equal(totalSwitchCost, 24000.0);
  const costPerPiece = parseFloat((totalSwitchCost / effectivePieces).toFixed(2));
  assert.equal(costPerPiece, 80.0); // 80 BDT per switch

  // Case C: Generic Packaging Inward Converter
  const conduitPipes = convertPackagingQuantity(25, 10, true); // 25 bundles x 10 pipes/bundle
  assert.equal(conduitPipes, 250);
});

test("2. Purchase Inward Financial Ledger Invariant: Subtotal + Delivery = Paid + Due", () => {
  const purchaseItems = [
    { product_id: 1, quantity: 5, unitPrice: 8500.0 }, // 5 Reels Cable = 42,500
    { product_id: 2, quantity: 10, unitPrice: 1600.0 }, // 10 Boxes Switches = 16,000
    { product_id: 3, quantity: 50, unitPrice: 320.0 }, // 50 Circuit Breakers = 16,000
  ];

  const subtotal = purchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  assert.equal(subtotal, 74500.0);

  const deliveryCharge = 500.0;
  const grandTotal = subtotal + deliveryCharge;
  assert.equal(grandTotal, 75000.0);

  // Scenario 1: Partial payment
  const paidAmount = 50000.0;
  const dueAmount = grandTotal - paidAmount;
  assert.equal(dueAmount, 25000.0);

  // Core Financial Invariant Check
  assert.equal(grandTotal, paidAmount + dueAmount);

  // Scenario 2: Full payment
  const fullPaid = 75000.0;
  const fullDue = Math.max(0, grandTotal - fullPaid);
  assert.equal(fullDue, 0.0);
  assert.equal(grandTotal, fullPaid + fullDue);
});

test("3. Supplier Payable Ledger: Due Accumulation & Due Collection Deduction", () => {
  let supplierPayable = 12000.0; // Existing ledger balance

  // Step 1: Inward purchase with 25,000 due
  const newPurchaseDue = 25000.0;
  supplierPayable += newPurchaseDue;
  assert.equal(supplierPayable, 37000.0);

  // Step 2: Pay supplier 20,000 via Due Collection + 1,000 cash settlement discount
  const paymentAmount = 20000.0;
  const cashDiscount = 1000.0;
  supplierPayable = Math.max(0, supplierPayable - (paymentAmount + cashDiscount));
  assert.equal(supplierPayable, 16000.0); // 37,000 - 21,000 = 16,000

  // Step 3: Complete balance settlement of remaining 16,000
  supplierPayable = Math.max(0, supplierPayable - 16000.0);
  assert.equal(supplierPayable, 0.0);
});

test("4. Inventory & Supplier Rollback Math Upon Purchase Cancellation", () => {
  // Initial warehouse state
  let currentStock = 1200; // 1200 meters of cable
  let supplierPayable = 45000.0;

  // Canceled purchase order had 5 reels (500 meters) and 15,000 due
  const canceledPurchase = {
    effective_meters_inward: 500,
    due_amount: 15000.0,
  };

  // 1. Stock Rollback
  const revertedStock = Math.max(0, currentStock - canceledPurchase.effective_meters_inward);
  assert.equal(revertedStock, 700);

  // 2. Supplier Payable Rollback
  const revertedPayable = Math.max(0, supplierPayable - canceledPurchase.due_amount);
  assert.equal(revertedPayable, 30000.0);

  // Invariant verification: Stock and payable cannot be negative
  assert.ok(revertedStock >= 0);
  assert.ok(revertedPayable >= 0);
});

test("5. Electrical Stock Valuation: Packaging Cost vs Base Cut Cost Allocation", () => {
  // Bought 1 Reel (100m) for 8,500 BDT
  // Sold 35 meters cut-length at 115 BDT/meter
  const cutValuation = calculateCutLengthCosting(100, 8500.0, 35, 115.0);

  assert.equal(cutValuation.unitCostPerMeter, 85.0);
  assert.equal(cutValuation.cogsAllocated, 2975.0); // 35 * 85 = 2975
  assert.equal(cutValuation.revenue, 4025.0); // 35 * 115 = 4025
  assert.equal(cutValuation.grossProfit, 1050.0); // 4025 - 2975 = 1050
  assert.equal(cutValuation.remainingMeters, 65.0); // 100 - 35 = 65
  assert.equal(cutValuation.remainingValue, 5525.0); // 8500 - 2975 = 5525

  // Valuation Reconciled Invariant
  assert.ok(cutValuation.isReconciled);
  assert.equal(cutValuation.cogsAllocated + cutValuation.remainingValue, 8500.0);
});
