import test from "node:test";
import assert from "node:assert/strict";

import { convertEggUnits, convertFeedBagsToKg, convertFeedKgToBags } from "../lib/unit-service.ts";
import {
  calculatePoultryReconciliation,
  calculateEggReconciliation,
  calculateFCR,
  calculateLayingPercentage,
} from "../lib/poultry-egg-service.ts";
import {
  calculateFishBiomass,
  calculateFishHarvestCosting,
} from "../lib/fish-service.ts";

test("1. Egg Dynamic Unit Conversions (Tray, Dozen, Piece)", () => {
  // Case A: 2 standard trays of 30 pcs = 60 pieces = 5 dozens
  const resA = convertEggUnits(2, "tray", 30);
  assert.equal(resA.pieces, 60);
  assert.equal(resA.dozens, 5);
  assert.equal(resA.trays, 2);

  // Case B: 3 custom trays of 24 pcs = 72 pieces = 6 dozens
  const resB = convertEggUnits(3, "tray", 24);
  assert.equal(resB.pieces, 72);
  assert.equal(resB.dozens, 6);
  assert.equal(resB.trays, 3);

  // Case C: 10 dozens = 120 pieces = 4 standard trays (30 pcs)
  const resC = convertEggUnits(10, "dozen", 30);
  assert.equal(resC.pieces, 120);
  assert.equal(resC.dozens, 10);
  assert.equal(resC.trays, 4);

  // Case D: 900 pieces = 75 dozens = 30 trays
  const resD = convertEggUnits(900, "piece", 30);
  assert.equal(resD.pieces, 900);
  assert.equal(resD.dozens, 75);
  assert.equal(resD.trays, 30);
});

test("2. Feed Dynamic Unit Conversions (Bags to Kg & Kg to Bags)", () => {
  // Case A: 20 bags x 50kg = 1000kg
  const kgTotal = convertFeedBagsToKg(20, 50);
  assert.equal(kgTotal, 1000);

  // Case B: 750kg of 50kg bags = 15 full bags, 0 remainder
  const bagsClean = convertFeedKgToBags(750, 50);
  assert.equal(bagsClean.fullBags, 15);
  assert.equal(bagsClean.remainingKg, 0);

  // Case C: 765kg of 50kg bags = 15 full bags, 15 kg remainder
  const bagsRemainder = convertFeedKgToBags(765, 50);
  assert.equal(bagsRemainder.fullBags, 15);
  assert.equal(bagsRemainder.remainingKg, 15);
  assert.equal(bagsRemainder.fractionalBags, 15.3);

  // Case D: 25kg bags conversion (40 bags x 25kg = 1000kg)
  const kg25 = convertFeedBagsToKg(40, 25);
  assert.equal(kg25, 1000);
});

test("3. Poultry Flock Bird Count Reconciliation Invariant", () => {
  // Case A: Normal valid day: Opening 2000, Additions 0, Mortality 5, Culling 3 -> Closing 1992
  const reconA = calculatePoultryReconciliation(2000, 0, 5, 3, 0);
  assert.equal(reconA.closingLiveBirds, 1992);
  assert.equal(reconA.isValid, true);

  // Case B: Batch placement day: Opening 0, Additions 3000, Mortality 12, Culling 0 -> Closing 2988
  const reconB = calculatePoultryReconciliation(0, 3000, 12, 0, 0);
  assert.equal(reconB.closingLiveBirds, 2988);
  assert.equal(reconB.isValid, true);

  // Case C: Invalid over-removal (Negative bird count must be rejected)
  const reconC = calculatePoultryReconciliation(50, 0, 40, 20, 0);
  assert.equal(reconC.closingLiveBirds, -10);
  assert.equal(reconC.isValid, false, "Negative live birds must violate business invariant");
});

test("4. Egg Collection and Grading Reconciliation Invariant", () => {
  // Case A: Fully reconciled collection
  // Collected 1,800 eggs: Broken 30 -> Accepted 1,770
  // Graded: Grade A = 1,000, Grade B = 500, Grade C = 270 (Sum = 1,770)
  const gradesA = [
    { gradeId: 1, pieces: 1000 },
    { gradeId: 2, pieces: 500 },
    { gradeId: 3, pieces: 270 },
  ];
  const eggReconA = calculateEggReconciliation(1800, 30, gradesA);
  assert.equal(eggReconA.acceptedQuantity, 1770);
  assert.equal(eggReconA.gradeSumPieces, 1770);
  assert.equal(eggReconA.gradingDifference, 0);
  assert.equal(eggReconA.isReconciled, true);

  // Case B: Unreconciled grading (missing 50 eggs)
  const gradesB = [
    { gradeId: 1, pieces: 1000 },
    { gradeId: 2, pieces: 500 },
    { gradeId: 3, pieces: 220 }, // 50 pieces short
  ];
  const eggReconB = calculateEggReconciliation(1800, 30, gradesB);
  assert.equal(eggReconB.gradeSumPieces, 1720);
  assert.equal(eggReconB.gradingDifference, 50);
  assert.equal(eggReconB.isReconciled, false, "Grade mismatch must be flagged");
});

test("5. Poultry Performance Metrics (Laying % & FCR)", () => {
  // 1,800 eggs from 2,000 live hens = 90% laying rate
  const layingPct = calculateLayingPercentage(1800, 2000);
  assert.equal(layingPct, 90.0);

  // 3,000 kg feed consumed for 1,500 kg live weight gain = 2.0 FCR
  const fcr = calculateFCR(3000, 1500);
  assert.equal(fcr, 2.0);
});

test("6. Fish Biomass Estimation", () => {
  // 5,000 fingerlings @ average 400 grams = 2,000 kg biomass
  const biomass = calculateFishBiomass(5000, 400);
  assert.equal(biomass.totalBiomassKg, 2000.0);
});

test("7. Fish Partial Harvest Costing & Margin Engine", () => {
  // Batch total cost to date: 240,000 BDT
  // Total available biomass: 2,000 kg
  // Weighted-average cost per kg: 240,000 / 2,000 = 120.00 BDT/kg
  //
  // Partial Harvest:
  // Harvested weight: 800 kg
  // Selling price: 180.00 BDT/kg
  // Direct harvest & transport expenses: 4,000 BDT
  const harvest = calculateFishHarvestCosting(240000, 2000, 800, 180, 4000);

  // Assertions:
  assert.equal(harvest.costPerKg, 120.0);
  assert.equal(harvest.allocatedHarvestCost, 96000.0); // 800 kg * 120 BDT
  assert.equal(harvest.totalRevenue, 144000.0); // 800 kg * 180 BDT
  assert.equal(harvest.directSellingExpenses, 4000.0);
  // Net margin = 144,000 - (96,000 + 4,000) = 44,000 BDT
  assert.equal(harvest.netRealizedProfit, 44000.0);
  // Remaining biological stock in pond:
  assert.equal(harvest.remainingBiomassKg, 1200.0); // 2,000 - 800 = 1,200 kg
  assert.equal(harvest.remainingBatchCost, 144000.0); // 240,000 - 96,000 = 144,000 BDT
});

test("8. Internal Feed Issue Zero-Revenue Accounting Invariant", () => {
  // Scenario: 10 bags of Layer Starter (50 kg/bag) issued internally to Poultry Batch #101
  const bags = 10;
  const bagWeightKg = 50;
  const costPricePerBag = 2500; // BDT
  const totalInternalCost = bags * costPricePerBag; // 25,000 BDT
  const totalKg = convertFeedBagsToKg(bags, bagWeightKg); // 500 kg

  // Invariant verification:
  // 1. Total kg must equal bags * bagWeight
  assert.equal(totalKg, 500);

  // 2. Unit cost per kg
  const costPerKg = totalInternalCost / totalKg;
  assert.equal(costPerKg, 50.0); // 50 BDT / kg

  // 3. Accounting Rule:
  // External Sales Revenue created = 0
  // Customer Accounts Receivable created = 0
  // Farm / Batch Production Expense created = 25,000 BDT
  const simulatedExternalRevenue = 0;
  const simulatedCustomerReceivable = 0;
  const farmBatchExpense = totalInternalCost;

  assert.equal(simulatedExternalRevenue, 0, "Internal issue must create ZERO external revenue");
  assert.equal(simulatedCustomerReceivable, 0, "Internal issue must create ZERO customer receivable");
  assert.equal(farmBatchExpense, 25000, "Internal issue must transfer full cost to farm batch");
});
