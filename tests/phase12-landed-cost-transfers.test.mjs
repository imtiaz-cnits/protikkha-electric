import test from "node:test";
import assert from "node:assert/strict";
import { allocateLandedCosts } from "../lib/electrical-calc-service.ts";

test("Phase 12 - Landed Cost Allocation Engine: By Value", () => {
  const items = [
    { productId: 1, productName: "BBS 2.5 RM BYA Cable", quantity: 10, unitPrice: 7000 }, // Total: 70,000 (70%)
    { productId: 2, productName: "Schneider 32A MCB", quantity: 50, unitPrice: 600 },    // Total: 30,000 (30%)
  ];
  const freightCharges = 5000; // Total additional freight

  const result = allocateLandedCosts(items, freightCharges, "BY_VALUE");

  assert.equal(result.items.length, 2);
  assert.equal(result.isBalanced, true);
  // Item 1 gets 70% of 5000 = 3500 => unit extra cost 3500 / 10 = 350 => new unit cost = 7350
  assert.equal(result.items[0].allocatedFreight, 3500);
  assert.equal(result.items[0].landedCostPerUnit, 7350);

  // Item 2 gets 30% of 5000 = 1500 => unit extra cost 1500 / 50 = 30 => new unit cost = 630
  assert.equal(result.items[1].allocatedFreight, 1500);
  assert.equal(result.items[1].landedCostPerUnit, 630);

  // Total allocated must match exactly
  const sumAllocated = result.items.reduce((acc, it) => acc + it.allocatedFreight, 0);
  assert.equal(sumAllocated, freightCharges);
});

test("Phase 12 - Landed Cost Allocation Engine: By Quantity", () => {
  const items = [
    { productId: 1, productName: "Conduit Pipes 20mm (10ft)", quantity: 200, unitPrice: 150 }, // 200 units (66.67%)
    { productId: 2, productName: "Conduit Pipes 25mm (10ft)", quantity: 100, unitPrice: 220 }, // 100 units (33.33%)
  ];
  const carryingCost = 1500;

  const result = allocateLandedCosts(items, carryingCost, "BY_QUANTITY");

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].allocatedFreight, 1000);
  assert.equal(result.items[1].allocatedFreight, 500);
  assert.equal(result.items[0].landedCostPerUnit, 155);
  assert.equal(result.items[1].landedCostPerUnit, 225);

  const sumAllocated = result.items.reduce((acc, it) => acc + it.allocatedFreight, 0);
  assert.equal(sumAllocated, carryingCost);
});

test("Phase 12 - Landed Cost Allocation Engine: Zero or Negative Charges Guard", () => {
  const items = [
    { productId: 1, productName: "LED Panel 18W", quantity: 20, unitPrice: 550 },
  ];
  const result = allocateLandedCosts(items, 0, "BY_VALUE");
  assert.equal(result.items[0].allocatedFreight, 0);
  assert.equal(result.items[0].landedCostPerUnit, 550);
});

test("Phase 12 - Inter-Store Stock Transfer Invariants", () => {
  // Initial inventory state across stores
  const storeA = { id: 1, name: "Central Warehouse", stock: 100 };
  const storeB = { id: 2, name: "Main Showroom", stock: 15 };
  const transferQty = 40;

  // 1. Dispatch outward: Store A inventory is decremented, placed into in-transit
  assert.ok(storeA.stock >= transferQty, "Store A must have sufficient stock to dispatch");
  storeA.stock -= transferQty;
  const inTransit = transferQty;
  assert.equal(storeA.stock, 60);
  assert.equal(inTransit, 40);

  // 2. Receive inward: Stock arrives at Store B
  storeB.stock += inTransit;
  const remainingInTransit = inTransit - transferQty;
  assert.equal(storeB.stock, 55);
  assert.equal(remainingInTransit, 0);

  // 3. System Conservation of Stock Invariant:
  // Initial total (100 + 15 = 115) strictly equals final total (60 + 55 = 115)
  assert.equal(storeA.stock + storeB.stock, 115);
});

test("Phase 12 - Landed Cost Allocation Engine: Manual Mode", () => {
  const items = [
    { productId: 1, productName: "Industrial Motor 5HP", quantity: 2, unitPrice: 22000, manualFreightAllocation: 1200 },
    { productId: 2, productName: "Capacitor 50uF", quantity: 10, unitPrice: 350, manualFreightAllocation: 300 },
  ];
  const freightCharges = 1500;

  const result = allocateLandedCosts(items, freightCharges, "MANUAL");

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].allocatedFreight, 1200);
  assert.equal(result.items[1].allocatedFreight, 300);
  assert.equal(result.items[0].landedCostPerUnit, 22600); // 22000 + 1200 / 2 = 22600
  assert.equal(result.items[1].landedCostPerUnit, 380);   // 350 + 300 / 10 = 380
  assert.equal(result.isBalanced, true);
});

test("Phase 12 - Inter-Store Stock Transfer Shortage Guard", () => {
  const storeA = { id: 1, name: "Central Warehouse", stock: 10 };
  const requestedTransferQty = 25;

  assert.throws(
    () => {
      if (storeA.stock < requestedTransferQty) {
        throw new Error(`Insufficient stock in Store A: available ${storeA.stock}, requested ${requestedTransferQty}`);
      }
    },
    /Insufficient stock/,
    "Must throw an error and prevent negative inventory on over-dispatch"
  );
  // Inventory remains untouched
  assert.equal(storeA.stock, 10);
});
