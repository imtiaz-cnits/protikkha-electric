import test from "node:test";
import assert from "node:assert/strict";

test("1. Electrical Sales Return: Stock Replenishment & Due Decrement Invariant", () => {
  // Scenario: Customer bought 100m of BBS 2.5 rm Cable at ৳90/m. Total ৳9,000. Paid ৳5,000, Due ৳4,000.
  const initialStock = 450; // Current meters in store
  const orderPurchasedQty = 100;
  const unitPrice = 90;
  const initialOrderDue = 4000;
  const initialCustomerDue = 4000;

  // Customer returns 20 meters
  const returnQty = 20;
  assert.ok(returnQty <= orderPurchasedQty);

  const returnAmount = returnQty * unitPrice; // ৳1,800
  const expectedStockAfterReturn = initialStock + returnQty; // 470 meters
  const expectedOrderDueAfterReturn = Math.max(0, initialOrderDue - returnAmount); // ৳2,200
  const expectedCustomerDueAfterReturn = Math.max(0, initialCustomerDue - returnAmount); // ৳2,200

  assert.equal(returnAmount, 1800);
  assert.equal(expectedStockAfterReturn, 470);
  assert.equal(expectedOrderDueAfterReturn, 2200);
  assert.equal(expectedCustomerDueAfterReturn, 2200);
});

test("2. Electrical Purchase Return: Supplier Payable & Inventory Reduction Invariant", () => {
  // Scenario: Shop received 50 Circuit Breakers (32A 2P) at ৳450 each. Total ৳22,500. Due to supplier ৳12,500.
  const currentPhysicalStock = 50;
  const costPrice = 450;
  const initialSupplierPayable = 12500;

  // Shop returns 5 defective breakers back to manufacturer
  const returnQty = 5;
  const returnCreditAmount = returnQty * costPrice; // ৳2,250
  const stockAfterReturn = Math.max(0, currentPhysicalStock - returnQty); // 45 breakers
  const supplierPayableAfterReturn = Math.max(0, initialSupplierPayable - returnCreditAmount); // ৳10,250

  assert.equal(returnCreditAmount, 2250);
  assert.equal(stockAfterReturn, 45);
  assert.equal(supplierPayableAfterReturn, 10250);
});

test("3. Warranty Expiry Date Calculation & Dynamic Validity Status", () => {
  // Function to simulate warranty engine calculation
  function computeWarrantyStatus(purchaseDateStr, months, referenceDateStr) {
    const pDate = new Date(purchaseDateStr);
    const expDate = new Date(pDate);
    expDate.setMonth(expDate.getMonth() + months);

    const refDate = new Date(referenceDateStr);
    const isExpired = refDate > expDate;
    const daysLeft = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      expiryDateStr: expDate.toISOString().split("T")[0],
      isExpired,
      daysLeft,
      status: isExpired ? "EXPIRED" : "ACTIVE",
    };
  }

  // 12 Months warranty registered on 2026-01-15
  const resultActive = computeWarrantyStatus("2026-01-15", 12, "2026-07-15");
  assert.equal(resultActive.expiryDateStr, "2027-01-15");
  assert.equal(resultActive.isExpired, false);
  assert.equal(resultActive.status, "ACTIVE");
  assert.ok(resultActive.daysLeft > 0);

  // Checked after expiry on 2027-03-01
  const resultExpired = computeWarrantyStatus("2026-01-15", 12, "2027-03-01");
  assert.equal(resultExpired.isExpired, true);
  assert.equal(resultExpired.status, "EXPIRED");
  assert.ok(resultExpired.daysLeft < 0);
});

test("4. Warranty Claim & Replacement Lifecycle State Machine", () => {
  // State transition validator
  function processClaimAction(record, action, replacementSerial) {
    if (new Date() > new Date(record.expiryDate)) {
      throw new Error("Cannot process claim on expired warranty");
    }
    if (record.status === "CLAIMED" || record.status === "REPLACED") {
      throw new Error(`Already processed as ${record.status}`);
    }

    if (action === "REPLACE") {
      if (!replacementSerial) throw new Error("Replacement serial required");
      return { ...record, status: "REPLACED", replacementSerial };
    } else if (action === "CLAIM") {
      return { ...record, status: "CLAIMED" };
    }
    throw new Error("Invalid claim action");
  }

  const validRecord = {
    id: 101,
    serialNumber: "CB-2026-99881",
    expiryDate: "2028-12-31",
    status: "ACTIVE",
  };

  // Valid replacement
  const replaced = processClaimAction(validRecord, "REPLACE", "CB-2026-99882");
  assert.equal(replaced.status, "REPLACED");
  assert.equal(replaced.replacementSerial, "CB-2026-99882");

  // Cannot replace twice
  assert.throws(
    () => processClaimAction(replaced, "REPLACE", "CB-2026-99883"),
    /Already processed as REPLACED/
  );

  // Cannot claim expired
  const expiredRecord = {
    id: 102,
    serialNumber: "LED-2024-11223",
    expiryDate: "2025-01-01",
    status: "ACTIVE",
  };
  assert.throws(
    () => processClaimAction(expiredRecord, "CLAIM"),
    /Cannot process claim on expired warranty/
  );
});

test("5. Party Ledger Return Entry Mathematical Balance", () => {
  // Customer Ledger on Return:
  // Initial Due: ৳10,000. Customer returns goods value ৳3,000.
  // Return is credited to customer: Balance = Prev - Credit = ৳7,000.
  const customerPrevDue = 10000;
  const returnCredit = 3000;
  const customerNewDue = Math.max(0, customerPrevDue - returnCredit);
  assert.equal(customerNewDue, 7000);

  // Supplier Ledger on Purchase Return:
  // Initial Payable: ৳50,000. Shop returns goods value ৳12,000.
  // Return is debited to supplier: Balance = Prev - Debit = ৳38,000.
  const supplierPrevPayable = 50000;
  const returnDebit = 12000;
  const supplierNewPayable = Math.max(0, supplierPrevPayable - returnDebit);
  assert.equal(supplierNewPayable, 38000);
});
