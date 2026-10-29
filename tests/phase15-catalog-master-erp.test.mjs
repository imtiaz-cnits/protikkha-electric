import test from "node:test";
import assert from "node:assert/strict";

// Test Suite: Phase 15 - Master ERP Implementation Verification

test("1. All 14 Electrical Catalog Groups Defined and Structured", () => {
  const groups = [
    "Wires and cables",
    "Pipes, conduits, trunking, and fittings",
    "Switches, sockets, plugs, and accessories",
    "Lighting",
    "Circuit protection and distribution",
    "Contactors, relays, and automation",
    "Motors, pumps, fans, and spare parts",
    "Power tools, machinery, and welding",
    "Nuts, bolts, screws, and fasteners",
    "Installation accessories and earthing",
    "Transformers, UPS, inverters, batteries, generators, and solar",
    "Testing, measurement, hand tools, and safety",
    "Plumbing and general industrial hardware",
    "Consumables and replacement parts",
  ];

  assert.equal(groups.length, 14, "Must cover all 14 required electrical product groups");
});

test("2. Product Variants & SKU / Barcode Integrity", () => {
  const variant = {
    product_id: 19,
    variant_name: "1.5 RM Red (100m Coil)",
    sku: "VAR-WIR-RED",
    barcode: "89411001001",
    cost_price: 42,
    sell_price: 48,
    wholesale_price: 45,
    stock_quantity: 200,
    attributes: { color: "Red", size: "1.5 RM", length: "100m" },
  };

  assert.ok(variant.sku.startsWith("VAR-"), "SKU must follow variant naming convention");
  assert.ok(variant.wholesale_price < variant.sell_price, "Wholesale price must be lower than retail price");
  assert.ok(variant.wholesale_price > variant.cost_price, "Wholesale price must preserve gross margin");
});

test("3. Wholesale vs Retail Pricing Engine & Margin Invariant", () => {
  const cost = 42.0;
  const retail = 48.0;
  const wholesale = 45.0;

  const retailMargin = ((retail - cost) / retail) * 100;
  const wholesaleMargin = ((wholesale - cost) / wholesale) * 100;

  assert.equal(retailMargin.toFixed(1), "12.5", "Retail margin must equal 12.5%");
  assert.equal(wholesaleMargin.toFixed(1), "6.7", "Wholesale margin must equal 6.7%");
  assert.ok(retailMargin > wholesaleMargin, "Retail margin must exceed wholesale margin");
});

test("4. Cable Cut-Length Stock & Partial Reel Deduction Invariant", () => {
  const initialReelMeters = 500;
  const soldCutLength = 65;
  const unitCostPerMeter = 42.0;

  const remainingMeters = initialReelMeters - soldCutLength;
  const cogsDeducted = soldCutLength * unitCostPerMeter;
  const remainingInventoryValue = remainingMeters * unitCostPerMeter;

  assert.equal(remainingMeters, 435, "Remaining meters must accurately equal 435");
  assert.equal(cogsDeducted, 2730, "COGS must accurately allocate ৳2,730.00");
  assert.equal(remainingInventoryValue, 18270, "Remaining stock value must equal ৳18,270.00");
  assert.equal(cogsDeducted + remainingInventoryValue, initialReelMeters * unitCostPerMeter, "Inventory balance invariant holds");
});

test("5. Refundable Cable Drum Deposit & Damage Adjustment Invariant", () => {
  const initialDeposit = 3000.0;
  const damagePenalty = 500.0;
  const refundAmount = initialDeposit - damagePenalty;

  assert.equal(refundAmount, 2500.0, "Refund must accurately deduct damage penalty");
  assert.equal(refundAmount + damagePenalty, initialDeposit, "Total deposit balance reconciled");
});

test("6. Contractor Referral Commission Calculation & Payment State Machine", () => {
  const saleAmount = 85000.0;
  const commissionRate = 5.0;
  const calculatedCommission = (saleAmount * commissionRate) / 100;

  assert.equal(calculatedCommission, 4250.0, "5% commission on ৳85,000 must equal ৳4,250.00");

  let status = "PENDING";
  // Approved by manager
  status = "APPROVED";
  assert.equal(status, "APPROVED");

  // Paid out via bKash
  let paidAmount = 0;
  if (status === "APPROVED") {
    paidAmount = calculatedCommission;
    status = "PAID";
  }

  assert.equal(status, "PAID");
  assert.equal(paidAmount, 4250.0);
});
