import test from "node:test";
import assert from "node:assert/strict";

import {
  convertReelToMeters,
  convertBoxToPieces,
  convertPackagingQuantity,
  formatElectricalQty,
  formatElectricalOrderQty,
} from "../lib/electrical-unit-service.ts";
import {
  calculateInvoiceTotals,
  calculateCutLengthCosting,
} from "../lib/electrical-calc-service.ts";

test("1. POS Retail Sales: Cut-Length Cable Sale & Proportional Costing", () => {
  // A customer walks into the shop and requests 18.5 meters of BRB 2.5 RM Cable cut from a reel
  const cutLengthSale = {
    product_id: 101,
    product_name: "BRB 2.5 RM Single Core Cable Red",
    spec_type: "CABLE",
    cable_size: "2.5 RM",
    voltage_grade: "450/750V",
    unit: "Meter",
    is_cut_length: true,
    sold_meters: 18.5,
    unit_selling_price: 115.0, // 115 BDT per meter
    reel_length: 100.0,
    reel_cost_price: 8500.0, // 8,500 BDT per 100m reel => 85 BDT / meter
  };

  const costing = calculateCutLengthCosting(
    cutLengthSale.reel_length,
    cutLengthSale.reel_cost_price,
    cutLengthSale.sold_meters,
    cutLengthSale.unit_selling_price
  );

  // Verify proportional costing
  assert.equal(costing.unitCostPerMeter, 85.0);
  assert.equal(costing.cogsAllocated, 1572.5); // 18.5 * 85 = 1,572.50 BDT
  assert.equal(costing.revenue, 2127.5); // 18.5 * 115 = 2,127.50 BDT
  assert.equal(costing.grossProfit, 555.0); // 2127.5 - 1572.5 = 555.00 BDT
  assert.equal(costing.remainingMeters, 81.5); // 100 - 18.5 = 81.50 meters remaining
  assert.equal(costing.remainingValue, 6927.5); // 81.5 * 85 = 6,927.50 BDT

  // Invariant: Initial Reel Cost === Allocated COGS + Remaining Inventory Value
  assert.equal(
    parseFloat((costing.cogsAllocated + costing.remainingValue).toFixed(2)),
    cutLengthSale.reel_cost_price
  );

  // Formatting check
  const formatted = formatElectricalQty(cutLengthSale.sold_meters, { unit: "Meter" });
  assert.equal(formatted, "18.5 Meter");
});

test("2. Wholesale & Bulk Packaging Sale: Stock Decrement Invariant", () => {
  // Scenario A: Customer purchases 3 Reels of 1.5 RM Wire (100 meters each)
  const wireOrderLine = {
    product_id: 102,
    quantity: 3,
    packaging_unit: "Reel",
    conversion_ratio: 100, // 100 meters per reel
    selling_price: 6800.0,
  };
  const baseMetersDeducted = wireOrderLine.quantity * wireOrderLine.conversion_ratio;
  assert.equal(baseMetersDeducted, 300); // 300 meters deducted from base stock

  // Scenario B: Customer purchases 5 Boxes of Circuit Breakers (12 pcs each)
  const breakerOrderLine = {
    product_id: 103,
    quantity: 5,
    packaging_unit: "Box",
    conversion_ratio: 12,
    selling_price: 3840.0,
  };
  const baseBreakersDeducted = convertPackagingQuantity(
    breakerOrderLine.quantity,
    breakerOrderLine.conversion_ratio,
    true
  );
  assert.equal(baseBreakersDeducted, 60); // 60 pcs deducted from base stock

  // Scenario C: Customer purchases 4 Bundles of Conduit Pipes (10 pipes each)
  const pipeOrderLine = {
    product_id: 104,
    quantity: 4,
    packaging_unit: "Bundle",
    conversion_ratio: 10,
    selling_price: 1800.0,
  };
  const basePipesDeducted = pipeOrderLine.quantity * pipeOrderLine.conversion_ratio;
  assert.equal(basePipesDeducted, 40); // 40 pipes deducted from base stock
});

test("3. Sales Invoice Financial Ledger Invariant: Subtotal - Discount + Delivery === Paid + Due", () => {
  const invoiceInput = {
    items: [
      { quantity: 18.5, unitPrice: 115.0, costPrice: 85.0 }, // Wire cut length: 2,127.50
      { quantity: 3, unitPrice: 6800.0, costPrice: 5500.0 }, // 3 Reels Wire: 20,400.00
      { quantity: 10, unitPrice: 380.0, costPrice: 270.0 }, // 10 SP Breakers: 3,800.00
      { quantity: 20, unitPrice: 125.0, costPrice: 90.0 }, // 20 1-Gang Switches: 2,500.00
    ],
    invoiceDiscount: 500.0, // 500 BDT shop discount
    deliveryCharge: 350.0, // 350 BDT van delivery
    paidAmount: 20000.0, // Partial payment
  };

  const totals = calculateInvoiceTotals(invoiceInput);

  // Subtotal = 2127.50 + 20400.00 + 3800.00 + 2500.00 = 28,827.50
  assert.equal(totals.subtotal, 28827.5);
  // Total Amount = 28827.50 - 500 + 350 = 28,677.50
  assert.equal(totals.totalAmount, 28677.5);
  assert.equal(totals.paidAmount, 20000.0);
  // Due Amount = 28677.50 - 20000.00 = 8,677.50
  assert.equal(totals.dueAmount, 8677.5);

  // Core Accounting Invariant
  const netPayable = totals.subtotal - totals.invoiceDiscount + totals.deliveryCharge;
  const settlement = totals.paidAmount + totals.dueAmount;
  assert.equal(parseFloat(netPayable.toFixed(2)), parseFloat(settlement.toFixed(2)));

  // Gross Profit calculation
  // Total COGS = (18.5*85) + (3*5500) + (10*270) + (20*90) = 1572.5 + 16500 + 2700 + 1800 = 22,572.50
  assert.equal(totals.totalCogs, 22572.5);
  // Total Gross Profit = 28827.50 - 500 - 22572.50 = 5,755.00
  assert.equal(totals.totalGrossProfit, 5755.0);
});

test("4. Customer Due Ledger Accumulation and Settlement Invariant", () => {
  // Existing customer with previous due
  const customer = {
    id: 501,
    name: "Haji Electrical Works",
    previous_due: 12500.0,
  };

  // New sales invoice with partial payment
  const newInvoice = {
    order_no: "ORD-20261028-1001",
    total_amount: 15400.0,
    paid_amount: 10000.0,
    due_amount: 5400.0,
  };

  // Ledger invariant: Customer total outstanding after sale = previous due + new invoice due
  const totalOutstandingAfterSale = customer.previous_due + newInvoice.due_amount;
  assert.equal(totalOutstandingAfterSale, 17900.0);

  // Customer makes a subsequent payment of 8,000 BDT
  const dueCollection = {
    collected_amount: 8000.0,
    concession_discount: 200.0, // 200 BDT early settlement discount
  };

  // Net remaining customer due
  const remainingDue =
    totalOutstandingAfterSale - dueCollection.collected_amount - dueCollection.concession_discount;
  assert.equal(remainingDue, 9700.0);
});

test("5. Delivery Challan Data Contract & Dispatch Verification", () => {
  // Dispatching electrical goods via Delivery Challan
  const challanData = {
    challan_no: "CHL-20261028-001",
    order_no: "ORD-20261028-1001",
    challan_date: "2026-10-28",
    customer_name: "Haji Electrical Works",
    delivery_address: "Ataikula Road, Pabna",
    driver_name: "Md. Karim",
    driver_phone: "01712-345678",
    vehicle_no: "Pabna-HA-11-2345",
    items: [
      {
        product_name: "BRB 2.5 RM Single Core Cable Red",
        spec_type: "CABLE",
        cable_size: "2.5 RM",
        voltage_grade: "450/750V",
        quantity: 3,
        unit: "Reel",
      },
      {
        product_name: "Super Star 16A SP Circuit Breaker",
        spec_type: "BREAKER",
        current_rating: "16A",
        voltage_grade: "230/400V",
        quantity: 24,
        unit: "Pcs",
      },
      {
        product_name: "National PVC Conduit Pipe 3/4\"",
        spec_type: "CONDUIT",
        quantity: 50,
        unit: "Length",
      },
    ],
  };

  // Verify Challan contract properties
  assert.ok(challanData.challan_no.startsWith("CHL-"));
  assert.ok(challanData.vehicle_no.length > 0);
  assert.equal(challanData.items.length, 3);

  // Formatter verification for challan items
  const summaryText = formatElectricalOrderQty(challanData.items);
  assert.ok(summaryText.includes("3 Items"));
  assert.ok(summaryText.includes("77 Units")); // 3 + 24 + 50 = 77
});
