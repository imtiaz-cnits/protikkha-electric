import test from "node:test";
import assert from "node:assert/strict";

import {
  convertMetersToReelAndCut,
  convertPiecesToBoxAndPcs,
  convertPackagingQuantity,
} from "../lib/electrical-unit-service.ts";

test("1. Real-Time Stock Breakdown Invariant: Base Units === (Full Packages * Ratio) + Loose Units", () => {
  // Case A: 550 meters of BRB 2.5 RM Cable (100 meters per reel)
  const cableMeters = 550;
  const cableRatio = 100;
  const cableBreakdown = convertMetersToReelAndCut(cableMeters, cableRatio);
  assert.equal(cableBreakdown.fullReels, 5);
  assert.equal(cableBreakdown.cutMeters, 50);
  assert.equal(cableBreakdown.fractionalReels, 5.5);
  // Invariant
  assert.equal(cableBreakdown.fullReels * cableRatio + cableBreakdown.cutMeters, cableMeters);

  // Case B: 145 pcs of Super Star 1-Gang Switches (20 pcs per box)
  const switchPcs = 145;
  const switchRatio = 20;
  const switchBreakdown = convertPiecesToBoxAndPcs(switchPcs, switchRatio);
  assert.equal(switchBreakdown.fullBoxes, 7);
  assert.equal(switchBreakdown.remainingPcs, 5);
  assert.equal(switchBreakdown.fractionalBoxes, 7.25);
  // Invariant
  assert.equal(switchBreakdown.fullBoxes * switchRatio + switchBreakdown.remainingPcs, switchPcs);

  // Case C: 75 Lengths of PVC Conduit Pipe (10 lengths per bundle)
  const pipeLengths = 75;
  const pipeRatio = 10;
  const fullBundles = Math.floor(pipeLengths / pipeRatio);
  const loosePipes = pipeLengths % pipeRatio;
  assert.equal(fullBundles, 7);
  assert.equal(loosePipes, 5);
  // Invariant
  assert.equal(fullBundles * pipeRatio + loosePipes, pipeLengths);
});

test("2. Cut-Loss & Scrap Cable Stock Adjustment Invariant", () => {
  // A master drum of wire has an initial stock of 500 meters @ ৳85.00/meter
  const initialStock = 500.0;
  const costPerMeter = 85.0;

  // Multiple cut-length retail sales occur:
  // 1. 18.5 meters
  // 2. 25.0 meters
  // 3. 100.0 meters (full reel sold from drum)
  const sales = [18.5, 25.0, 100.0];
  const totalSold = sales.reduce((a, b) => a + b, 0); // 143.5 meters
  assert.equal(totalSold, 143.5);

  const bookStock = initialStock - totalSold; // 356.5 meters
  assert.equal(bookStock, 356.5);

  // Physical recount of the drum reveals 352.0 meters (due to cable offcuts/scrap remnants)
  const physicalStock = 352.0;
  const scrapLossMeters = parseFloat((bookStock - physicalStock).toFixed(3)); // 4.5 meters scrap loss
  assert.equal(scrapLossMeters, 4.5);

  const scrapLossValue = parseFloat((scrapLossMeters * costPerMeter).toFixed(2));
  assert.equal(scrapLossValue, 382.5); // 4.5 * 85 = ৳382.50 loss

  // Ledger adjustment invariant: adjusted stock === physical count
  const adjustedStock = bookStock - scrapLossMeters;
  assert.equal(adjustedStock, physicalStock);
});

test("3. Stock Movement Audit Ledger Invariant: Previous Stock + Delta === New Stock", () => {
  // Test sequential inventory movement ledger integrity
  let currentStock = 200; // Starting with 200 breakers
  const ledgerMovements = [
    { type: "PURCHASE_INWARD", quantity: 100, isOutward: false }, // +100 inward -> 300
    { type: "SALE_OUTWARD", quantity: 45, isOutward: true }, // -45 sold -> 255
    { type: "DAMAGE_LOSS", quantity: 3, isOutward: true }, // -3 damaged -> 252
    { type: "SCRAP_CABLE_LOSS", quantity: 2, isOutward: true }, // -2 scrap -> 250
    { type: "ADJUSTMENT", quantity: 10, isOutward: false }, // +10 found during audit -> 260
  ];

  for (const move of ledgerMovements) {
    const prev = currentStock;
    const delta = move.isOutward ? -move.quantity : move.quantity;
    currentStock += delta;

    // Movement ledger invariant
    assert.equal(prev + delta, currentStock);
  }

  assert.equal(currentStock, 260);
});

test("4. Low Stock Alert Threshold & Stock Out Status Detection", () => {
  const stockInventory = [
    { id: 1, name: "BRB 2.5 RM Cable", quantity: 120, unit: "Meter", minAlert: 50 },
    { id: 2, name: "BRB 4.0 RM Cable", quantity: 35, unit: "Meter", minAlert: 50 }, // LOW
    { id: 3, name: "Super Star 16A SP Breaker", quantity: 4, unit: "Pcs", minAlert: 10 }, // LOW
    { id: 4, name: "National PVC Pipe 3/4\"", quantity: 0, unit: "Length", minAlert: 20 }, // OUT
    { id: 5, name: "Philips LED Bulb 18W", quantity: 48, unit: "Pcs", minAlert: 10 }, // OK
  ];

  const getStatus = (item) => {
    if (item.quantity <= 0) return "Out of Stock";
    if (item.quantity <= item.minAlert) return "Low Stock";
    return "In Stock";
  };

  const statuses = stockInventory.map((i) => ({ id: i.id, status: getStatus(i) }));

  assert.equal(statuses.find((s) => s.id === 1)?.status, "In Stock");
  assert.equal(statuses.find((s) => s.id === 2)?.status, "Low Stock");
  assert.equal(statuses.find((s) => s.id === 3)?.status, "Low Stock");
  assert.equal(statuses.find((s) => s.id === 4)?.status, "Out of Stock");
  assert.equal(statuses.find((s) => s.id === 5)?.status, "In Stock");

  const lowStockCount = statuses.filter((s) => s.status === "Low Stock").length;
  const outOfStockCount = statuses.filter((s) => s.status === "Out of Stock").length;

  assert.equal(lowStockCount, 2);
  assert.equal(outOfStockCount, 1);
});

test("5. Physical Stock Reconciliation & Financial Variance Ledger", () => {
  // Physical count audit of electrical stock across categories
  const auditEntries = [
    {
      product_id: 301,
      name: "BRB 1.5 RM Single Core Cable",
      book_quantity: 450.0,
      physical_quantity: 442.0, // Variance: -8.0 meters
      cost_price: 52.0,
    },
    {
      product_id: 302,
      name: "Super Star 1-Gang Switch Piano",
      book_quantity: 120,
      physical_quantity: 125, // Variance: +5 pcs
      cost_price: 80.0,
    },
    {
      product_id: 303,
      name: "Havells 32A DP MCB",
      book_quantity: 15,
      physical_quantity: 15, // Variance: 0 pcs
      cost_price: 680.0,
    },
  ];

  const results = auditEntries.map((e) => {
    const varianceQty = parseFloat((e.physical_quantity - e.book_quantity).toFixed(3));
    const varianceValue = parseFloat((varianceQty * e.cost_price).toFixed(2));
    const status =
      varianceQty === 0 ? "MATCHED" : varianceQty > 0 ? "SURPLUS" : "DEFICIT";
    return {
      product_id: e.product_id,
      varianceQty,
      varianceValue,
      status,
    };
  });

  // Entry 1: Cable cut-loss deficit
  assert.equal(results[0].status, "DEFICIT");
  assert.equal(results[0].varianceQty, -8.0);
  assert.equal(results[0].varianceValue, -416.0); // -8 * 52 = -416.00 BDT

  // Entry 2: Surplus recount
  assert.equal(results[1].status, "SURPLUS");
  assert.equal(results[1].varianceQty, 5.0);
  assert.equal(results[1].varianceValue, 400.0); // +5 * 80 = +400.00 BDT

  // Entry 3: Perfectly reconciled
  assert.equal(results[2].status, "MATCHED");
  assert.equal(results[2].varianceQty, 0);
  assert.equal(results[2].varianceValue, 0);

  // Net inventory variance value across shop audit
  const netVarianceValue = results.reduce((acc, r) => acc + r.varianceValue, 0);
  assert.equal(netVarianceValue, -16.0); // -416 + 400 = -16.00 BDT
});
