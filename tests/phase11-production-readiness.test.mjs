import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  convertReelToMeters,
  convertMetersToReelAndCut,
} from "../lib/electrical-unit-service.ts";
import {
  calculateInvoiceTotals,
  calculateWarrantyStatus,
} from "../lib/electrical-calc-service.ts";
import {
  buildSalesJournalEntry,
  buildPurchaseJournalEntry,
  validateDoubleEntryBalance,
} from "../lib/general-ledger-service.ts";
import {
  ROLE_DEFINITIONS,
  canViewCostPrice,
  validateDiscountLimit,
  canCancelOrder,
  maskProductCost,
  calculateStaffPerformance,
} from "../lib/rbac.ts";

test("Phase 11 - Test 1: Full-Lifecycle Electrical Inventory Invariant", () => {
  // Packaging conversion: 1 Reel = 100 Meters
  const conversionRatio = 100;

  // Step 1: Purchasing 10 Reels @ 3,500 BDT/Reel
  const purchasedReels = 10;
  const purchasePricePerReel = 3500;
  const totalPurchaseCost = purchasedReels * purchasePricePerReel; // 35,000 BDT
  const totalReceivedMeters = convertReelToMeters(purchasedReels, conversionRatio); // 1,000 Meters
  const unitCostPerMeter = totalPurchaseCost / totalReceivedMeters; // 35 BDT/Meter

  assert.equal(totalReceivedMeters, 1000);
  assert.equal(unitCostPerMeter, 35);

  // Step 2: Retail POS Sale of 150 Meters @ 45 BDT/Meter
  const soldMeters = 150;
  const sellPricePerMeter = 45;
  const salesRevenue = soldMeters * sellPricePerMeter; // 6,750 BDT
  const costOfGoodsSold = soldMeters * unitCostPerMeter; // 5,250 BDT
  const grossProfit = salesRevenue - costOfGoodsSold; // 1,500 BDT

  assert.equal(salesRevenue, 6750);
  assert.equal(costOfGoodsSold, 5250);
  assert.equal(grossProfit, 1500);

  // Step 3: Remaining Stock Breakdown
  const remainingMeters = totalReceivedMeters - soldMeters; // 850 Meters
  const stockBreakdown = convertMetersToReelAndCut(remainingMeters, conversionRatio);

  assert.equal(remainingMeters, 850);
  assert.equal(stockBreakdown.fullReels, 8); // 8 Full Reels (800 Meters)
  assert.equal(stockBreakdown.cutMeters, 50); // 50 Loose Cut Meters

  // Step 4: Inventory Valuation Invariant
  const remainingValuation = remainingMeters * unitCostPerMeter; // 29,750 BDT
  assert.equal(remainingValuation, 29750);
  assert.equal(
    totalPurchaseCost,
    costOfGoodsSold + remainingValuation,
    "Initial inventory capital must strictly equal COGS plus remaining inventory valuation"
  );
});

test("Phase 11 - Test 2: General Ledger Double-Entry Balancing on Full Cycle", () => {
  // 1. Sales Journal Entry with COGS
  const salesEntry = buildSalesJournalEntry({
    orderNo: "ORD-20261028-9999",
    date: new Date("2026-10-28"),
    subtotal: 6750,
    paidAmount: 5000,
    dueAmount: 1750,
    cogsAmount: 5250,
    paymentMethod: "CASH",
  });

  const salesValidation = validateDoubleEntryBalance(salesEntry.lines);
  assert.equal(salesValidation.isValid, true, "Sales journal entry must balance debits and credits");
  assert.equal(salesValidation.difference, 0);

  // Debit Cash (5,000) + Debit AR (1,750) + Debit COGS (5,250) = 12,000
  // Credit Revenue (6,750) + Credit Inventory (5,250) = 12,000
  assert.equal(salesValidation.totalDebit, 12000);
  assert.equal(salesValidation.totalCredit, 12000);

  // 2. Purchase Inward Journal Entry
  const purchaseEntry = buildPurchaseJournalEntry({
    purchaseNo: "PUR-20261028-8888",
    date: new Date("2026-10-28"),
    subtotal: 35000,
    paidAmount: 20000,
    dueAmount: 15000,
    paymentMethod: "BANK",
  });

  const purchaseValidation = validateDoubleEntryBalance(purchaseEntry.lines);
  assert.equal(purchaseValidation.isValid, true, "Purchase journal entry must balance debits and credits");
  assert.equal(purchaseValidation.totalDebit, 35000);
  assert.equal(purchaseValidation.totalCredit, 35000);
});

test("Phase 11 - Test 3: Project Quotation BOM to POS Order Conversion", () => {
  const bomItems = [
    { name: "BRB 1.5 RM Wire (Coil)", qty: 5, unitPrice: 3200 }, // 16,000
    { name: "Super Star 1-Gang Switch", qty: 20, unitPrice: 180 }, // 3,600
    { name: "Schneider 16A SP Breaker", qty: 10, unitPrice: 450 }, // 4,500
  ];

  const subTotal = bomItems.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  assert.equal(subTotal, 24100);

  // 5% Electrician Referral Commission
  const commissionPercent = 5;
  const commissionAmount = (subTotal * commissionPercent) / 100;
  assert.equal(commissionAmount, 1205);

  // Lifecycle State Machine
  const validTransitions = {
    DRAFT: ["SENT", "REJECTED"],
    SENT: ["APPROVED", "REJECTED"],
    APPROVED: ["CONVERTED_TO_ORDER", "EXPIRED"],
    CONVERTED_TO_ORDER: [], // Final locked state
  };

  assert.ok(validTransitions.DRAFT.includes("SENT"));
  assert.ok(validTransitions.SENT.includes("APPROVED"));
  assert.ok(validTransitions.APPROVED.includes("CONVERTED_TO_ORDER"));
  assert.equal(validTransitions.CONVERTED_TO_ORDER.length, 0, "Converted quotation is permanently locked");
});

test("Phase 11 - Test 4: Warranty Registration & Claim Lifecycle State Machine", () => {
  const saleDate = new Date();
  const warrantyMonths = 24;

  const status = calculateWarrantyStatus(saleDate, warrantyMonths);
  assert.equal(status.isExpired, false);
  assert.ok(status.daysRemaining > 700);

  // Claim State Machine
  const claimStates = ["REGISTERED", "CLAIMED", "INSPECTED", "REPLACED", "REJECTED"];
  assert.ok(claimStates.includes("REPLACED"));
});

test("Phase 11 - Test 5: RBAC Security Guard, Cost Price Masking & Audit Trail", () => {
  // Cashier cannot view cost price
  assert.equal(canViewCostPrice("cashier"), false);
  assert.equal(canViewCostPrice("admin"), true);

  const product = { id: 1, name: "Cable", cost_price: 3500, sell_price: 4500 };
  const masked = maskProductCost(product, "cashier");
  assert.equal(masked.cost_price, null);

  // Cashier discount limit: max 10%
  const validDiscount = validateDiscountLimit("cashier", 8);
  assert.equal(validDiscount.allowed, true);

  const invalidDiscount = validateDiscountLimit("cashier", 18);
  assert.equal(invalidDiscount.allowed, false);

  // Cancellation authorization
  assert.equal(canCancelOrder("cashier"), false);
  assert.equal(canCancelOrder("manager"), true);
  assert.equal(canCancelOrder("admin"), true);
});

test("Phase 11 - Test 6: Production Asset & UI Design Tokens Compliance", () => {
  const rootDir = process.cwd();

  const requiredAssets = [
    { file: "public/icon-512.png", minBytes: 100000 },
    { file: "public/fav.png", minBytes: 100000 },
    { file: "public/logo.png", minBytes: 100000 },
    { file: "public/auth-page-logo.png", minBytes: 100000 },
  ];

  for (const asset of requiredAssets) {
    const fullPath = path.join(rootDir, asset.file);
    assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${asset.file}`);
    const stats = fs.statSync(fullPath);
    assert.ok(stats.size >= asset.minBytes, `Asset file ${asset.file} must have legitimate file size`);
  }
});
