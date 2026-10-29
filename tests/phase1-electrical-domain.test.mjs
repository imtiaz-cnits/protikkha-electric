import test from "node:test";
import assert from "node:assert/strict";

import {
  convertReelToMeters,
  convertMetersToReelAndCut,
  convertBoxToPieces,
  convertPiecesToBoxAndPcs,
  convertPackagingQuantity,
} from "../lib/electrical-unit-service.ts";

import {
  calculateInvoiceTotals,
  calculateCutLengthCosting,
  calculateWarrantyStatus,
} from "../lib/electrical-calc-service.ts";

test("1. Wire & Cable Packaging Conversion (Reels to Meters)", () => {
  // Case A: 5 full reels of 100 meters each = 500 meters
  const meters100 = convertReelToMeters(5, 100);
  assert.equal(meters100, 500);

  // Case B: 8 coils of 90 meters each = 720 meters
  const meters90 = convertReelToMeters(8, 90);
  assert.equal(meters90, 720);

  // Case C: Fractional reels (2.5 reels x 100m = 250m)
  const metersFractional = convertReelToMeters(2.5, 100);
  assert.equal(metersFractional, 250);

  // Case D: Zero or invalid quantity returns 0 safely
  const metersZero = convertReelToMeters(0, 100);
  assert.equal(metersZero, 0);
});

test("2. Cable Cut-Length Breakdown (Meters to Full Reels & Remaining Cut Length)", () => {
  // Case A: 265 meters of 100m reels -> 2 full reels + 65 cut meters (2.65 reels)
  const breakdownA = convertMetersToReelAndCut(265, 100);
  assert.equal(breakdownA.fullReels, 2);
  assert.equal(breakdownA.cutMeters, 65);
  assert.equal(breakdownA.fractionalReels, 2.65);

  // Case B: 90 meters exactly of 90m coils -> 1 full coil + 0 cut meters (1.0 coil)
  const breakdownB = convertMetersToReelAndCut(90, 90);
  assert.equal(breakdownB.fullReels, 1);
  assert.equal(breakdownB.cutMeters, 0);
  assert.equal(breakdownB.fractionalReels, 1);

  // Case C: 45 meters of 100m reel -> 0 full reels + 45 cut meters (0.45 reels)
  const breakdownC = convertMetersToReelAndCut(45, 100);
  assert.equal(breakdownC.fullReels, 0);
  assert.equal(breakdownC.cutMeters, 45);
  assert.equal(breakdownC.fractionalReels, 0.45);
});

test("3. Switches, Sockets & Breakers Box Packaging Conversion", () => {
  // Case A: 10 boxes of 20 gang switches = 200 pcs
  const totalPcs = convertBoxToPieces(10, 20);
  assert.equal(totalPcs, 200);

  // Case B: 45 loose switches breakdown for a box of 10 pcs -> 4 full boxes + 5 pcs
  const boxBreakdown = convertPiecesToBoxAndPcs(45, 10);
  assert.equal(boxBreakdown.fullBoxes, 4);
  assert.equal(boxBreakdown.remainingPcs, 5);
  assert.equal(boxBreakdown.fractionalBoxes, 4.5);

  // Case C: Zero pieces breakdown
  const zeroBreakdown = convertPiecesToBoxAndPcs(0, 10);
  assert.equal(zeroBreakdown.fullBoxes, 0);
  assert.equal(zeroBreakdown.remainingPcs, 0);
});

test("4. Cable Cut-Length Costing & Inventory Valuation Invariant", () => {
  // Purchase 1 Reel of 100 meters at ৳6,000 (Unit Cost = ৳60.00 / meter)
  // Retail customer buys 35 meters cut length at ৳75.00 / meter
  const costing = calculateCutLengthCosting(100, 6000, 35, 75);

  assert.equal(costing.unitCostPerMeter, 60);
  assert.equal(costing.soldMeters, 35);
  assert.equal(costing.revenue, 2625); // 35 * 75 = ৳2,625
  assert.equal(costing.cogsAllocated, 2100); // 35 * 60 = ৳2,100
  assert.equal(costing.grossProfit, 525); // 2625 - 2100 = ৳525
  assert.equal(costing.marginPercent, 20.00); // (525 / 2625) * 100 = 20%
  assert.equal(costing.remainingMeters, 65); // 100 - 35 = 65 meters
  assert.equal(costing.remainingValue, 3900); // 6000 - 2100 = ৳3,900
  assert.equal(costing.isReconciled, true); // COGS (2,100) + Asset Value (3,900) === Initial Cost (6,000)
});

test("5. Electrical Sales Invoice Calculation & Margin Engine", () => {
  const result = calculateInvoiceTotals({
    items: [
      // 1. Wires: 35 meters @ ৳75, cost ৳60
      { quantity: 35, unitPrice: 75, costPrice: 60, discountAmount: 0 },
      // 2. Circuit Breaker: 2 pcs @ ৳450, cost ৳350, item discount ৳50
      { quantity: 2, unitPrice: 450, costPrice: 350, discountAmount: 50 },
    ],
    invoiceDiscount: 100,
    deliveryCharge: 150,
    paidAmount: 2500,
  });

  // Line 1: 35 * 75 = 2625
  // Line 2: 2 * 450 = 900 - 50 = 850
  // Subtotal = 2625 + 850 = 3475
  assert.equal(result.subtotal, 3475);
  assert.equal(result.invoiceDiscount, 100);
  assert.equal(result.deliveryCharge, 150);
  // Total = 3475 - 100 + 150 = 3525
  assert.equal(result.totalAmount, 3525);
  assert.equal(result.paidAmount, 2500);
  assert.equal(result.dueAmount, 1025); // 3525 - 2500 = 1025

  // COGS: (35*60 = 2100) + (2*350 = 700) = 2800
  assert.equal(result.totalCogs, 2800);
  // Net Revenue = 3475 - 100 = 3375
  // Gross Profit = 3375 - 2800 = 575
  assert.equal(result.totalGrossProfit, 575);
  // Gross Margin = (575 / 3375) * 100 = 17.04%
  assert.equal(result.grossMarginPercent, 17.04);
});

test("6. Warranty Expiry & Validity Status Engine", () => {
  const baseDate = new Date("2026-01-15T00:00:00.000Z");

  // 24 Months Warranty from Jan 15, 2026 -> Expires Jan 15, 2028
  const w24 = calculateWarrantyStatus(baseDate, 24, new Date("2026-06-15T00:00:00.000Z"));
  assert.equal(w24.isExpired, false);
  assert.ok(w24.daysRemaining > 500);

  // 6 Months Warranty from Jan 15, 2026 tested on Nov 15, 2026 -> Expired
  const w6 = calculateWarrantyStatus(baseDate, 6, new Date("2026-11-15T00:00:00.000Z"));
  assert.equal(w6.isExpired, true);
  assert.equal(w6.daysRemaining, 0);
});

test("7. Generic Packaging Converter Invariant", () => {
  // 1 Box of PVC Conduits = 25 pipes
  const pipesIn4Boxes = convertPackagingQuantity(4, 25, true);
  assert.equal(pipesIn4Boxes, 100);

  // 100 pipes converted back to boxes
  const boxesFrom100Pipes = convertPackagingQuantity(100, 25, false);
  assert.equal(boxesFrom100Pipes, 4);
});
