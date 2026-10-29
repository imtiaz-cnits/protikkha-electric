import test from "node:test";
import assert from "node:assert/strict";

test("Phase 13 - Contractor & Electrician Commission Mathematical Invariant", () => {
  const contractor = {
    id: 1,
    name: "Mohammad Rafiq (Electrician)",
    contractor_type: "ELECTRICIAN",
    default_commission_rate: 5.0, // 5%
    total_earned: 0,
    total_paid: 0,
    payable_balance: 0,
  };

  // Sale 1: 50,000 BDT wholesale wire & switches sale
  const sale1Amount = 50000;
  const comm1 = Math.round((sale1Amount * contractor.default_commission_rate) / 100);
  assert.equal(comm1, 2500);

  contractor.total_earned += comm1;
  contractor.payable_balance += comm1;

  assert.equal(contractor.total_earned, 2500);
  assert.equal(contractor.payable_balance, 2500);
  assert.equal(contractor.total_earned, contractor.total_paid + contractor.payable_balance);

  // Sale 2: 30,000 BDT lighting & fixtures sale with custom 6% rate
  const sale2Amount = 30000;
  const customRate = 6.0;
  const comm2 = Math.round((sale2Amount * customRate) / 100);
  assert.equal(comm2, 1800);

  contractor.total_earned += comm2;
  contractor.payable_balance += comm2;

  assert.equal(contractor.total_earned, 4300);
  assert.equal(contractor.payable_balance, 4300);

  // Payout Transaction: Settle 3,000 BDT
  const payoutAmount = 3000;
  assert.ok(payoutAmount <= contractor.payable_balance, "Payout cannot exceed payable balance");

  contractor.total_paid += payoutAmount;
  contractor.payable_balance -= payoutAmount;

  assert.equal(contractor.total_paid, 3000);
  assert.equal(contractor.payable_balance, 1300);
  // Strict Accounting Invariant
  assert.equal(contractor.total_earned, contractor.total_paid + contractor.payable_balance);
});

test("Phase 13 - Cable Drum Register & Refundable Deposit Invariants", () => {
  const drum = {
    id: 101,
    drum_code: "DRM-BRB-2026",
    drum_type: "Wooden Drum (1000m)",
    deposit_price: 2500,
    deposit_held: 0,
    status: "AVAILABLE",
    customer_id: null,
  };

  // 1. Issue drum to customer with 2500 BDT deposit
  const customerId = 55;
  drum.status = "ISSUED";
  drum.customer_id = customerId;
  drum.deposit_held = drum.deposit_price;

  assert.equal(drum.status, "ISSUED");
  assert.equal(drum.deposit_held, 2500);

  // 2. Return drum with 500 BDT damage penalty
  const damagePenalty = 500;
  const refundAmount = Math.max(0, drum.deposit_held - damagePenalty);
  assert.equal(refundAmount, 2000);

  drum.status = "RETURNED";
  drum.deposit_held = 0;
  drum.customer_id = null;

  assert.equal(drum.status, "RETURNED");
  assert.equal(drum.deposit_held, 0);
  assert.equal(refundAmount + damagePenalty, 2500);
});

test("Phase 13 - Contractor Referral Commission Reversal upon Order Cancellation", () => {
  const contractor = {
    total_earned: 4500,
    total_paid: 2000,
    payable_balance: 2500,
  };
  const cancelledSaleCommission = 1000;

  // Reversal: reduce total earned and reduce payable balance
  contractor.total_earned -= cancelledSaleCommission;
  contractor.payable_balance -= cancelledSaleCommission;

  assert.equal(contractor.total_earned, 3500);
  assert.equal(contractor.payable_balance, 1500);
  assert.equal(contractor.total_earned, contractor.total_paid + contractor.payable_balance);
});

test("Phase 13 - Master Product CSV Header & Spec Extraction Invariant", () => {
  const rawHeaders = ["Product Name", "Product Codes", "Category", "Brand", "Unit", "Selling Price", "Spec Type", "Cable Size"];
  const headersLower = rawHeaders.map((h) => h.toLowerCase().trim());

  const getColIdx = (names) => {
    for (const name of names) {
      const idx = headersLower.findIndex((h) => h === name.toLowerCase());
      if (idx !== -1) return idx;
    }
    return -1;
  };

  assert.equal(getColIdx(["product name", "name"]), 0);
  assert.equal(getColIdx(["product codes", "barcode", "sku"]), 1);
  assert.equal(getColIdx(["spec type", "specification type"]), 6);
  assert.equal(getColIdx(["cable size", "size"]), 7);
  assert.equal(getColIdx(["non_existent"]), -1);
});
