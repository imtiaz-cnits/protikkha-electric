import test from "node:test";
import assert from "node:assert/strict";
import {
  CHART_OF_ACCOUNTS,
  validateDoubleEntryBalance,
  createJournalEntry,
  buildSalesJournalEntry,
  buildPurchaseJournalEntry,
  buildCustomerDueCollectionJournalEntry,
  buildSupplierDuePaymentJournalEntry,
  buildExpenseJournalEntry,
  buildScrapLossJournalEntry,
  calculateTrialBalance,
  calculateIncomeStatement,
} from "../lib/general-ledger-service.ts";

test("1. Double-Entry Balancing Invariant (Sum of Debits must strictly equal Sum of Credits)", () => {
  // Balanced entry
  const balancedLines = [
    { accountCode: "1010", debit: 5000, credit: 0 },
    { accountCode: "4010", debit: 0, credit: 5000 },
  ];
  const valid = validateDoubleEntryBalance(balancedLines);
  assert.equal(valid.isValid, true);
  assert.equal(valid.totalDebit, 5000);
  assert.equal(valid.totalCredit, 5000);
  assert.equal(valid.difference, 0);

  // Unbalanced entry must fail validation & throw in createJournalEntry
  const unbalancedLines = [
    { accountCode: "1010", debit: 5000, credit: 0 },
    { accountCode: "4010", debit: 0, credit: 4500 },
  ];
  const invalid = validateDoubleEntryBalance(unbalancedLines);
  assert.equal(invalid.isValid, false);
  assert.equal(invalid.difference, 500);

  assert.throws(
    () =>
      createJournalEntry({
        entryNo: "JV-FAIL-01",
        referenceType: "TEST",
        description: "Unbalanced Voucher",
        lines: unbalancedLines,
      }),
    /Double-Entry Imbalance/
  );
});

test("2. Sales Order Journal Entry: Dual Dual-Recording (Revenue + Receivables/Cash and COGS + Inventory)", () => {
  // Customer buys 2.5 rm Cables & Breakers: Subtotal ৳25,000, Discount ৳500, Delivery ৳300, Paid ৳15,000, Due ৳9,800. Cost of goods is ৳18,000.
  const salesEntry = buildSalesJournalEntry({
    orderNo: "ORD-20261028-1001",
    subtotal: 25000,
    discount: 500,
    deliveryCharge: 300,
    paidAmount: 15000,
    dueAmount: 9800,
    cogsAmount: 18000,
    paymentMethod: "Cash",
  });

  assert.equal(salesEntry.totalDebit, salesEntry.totalCredit);
  // Total balanced value: Inflows/Receivables (15000 + 9800 + 500 = 25300) + COGS (18000) = 43300
  assert.equal(salesEntry.totalDebit, 43300);
  assert.equal(salesEntry.totalCredit, 43300);

  // Verify accounts in lines
  const cashLine = salesEntry.lines.find((l) => l.accountCode === "1010");
  assert.equal(cashLine?.debit, 15000);

  const dueLine = salesEntry.lines.find((l) => l.accountCode === "1100");
  assert.equal(dueLine?.debit, 9800);

  const discLine = salesEntry.lines.find((l) => l.accountCode === "4020");
  assert.equal(discLine?.debit, 500);

  const revLine = salesEntry.lines.find((l) => l.accountCode === "4010");
  assert.equal(revLine?.credit, 25000);

  const delivLine = salesEntry.lines.find((l) => l.accountCode === "4030");
  assert.equal(delivLine?.credit, 300);

  const cogsLine = salesEntry.lines.find((l) => l.accountCode === "5010");
  assert.equal(cogsLine?.debit, 18000);

  const invLine = salesEntry.lines.find((l) => l.accountCode === "1200");
  assert.equal(invLine?.credit, 18000);
});

test("3. Purchase Inward Journal Entry: Inventory Capitalization & Supplier Payable", () => {
  // Inward from BRB Cable Industries: Subtotal ৳60,000, Carriage Inward ৳1,500, Paid ৳35,000, Due ৳26,500
  const purchEntry = buildPurchaseJournalEntry({
    purchaseNo: "PUR-20261028-2001",
    subtotal: 60000,
    carryingCharge: 1500,
    paidAmount: 35000,
    dueAmount: 26500,
    paymentMethod: "Bank Transfer",
  });

  assert.equal(purchEntry.totalDebit, purchEntry.totalCredit);
  assert.equal(purchEntry.totalDebit, 61500);
  assert.equal(purchEntry.totalCredit, 61500);

  // Inventory asset incremented by purchase value
  const invDebit = purchEntry.lines.find((l) => l.accountCode === "1200");
  assert.equal(invDebit?.debit, 60000);

  // Carriage inward transport expense
  const freightDebit = purchEntry.lines.find((l) => l.accountCode === "6040");
  assert.equal(freightDebit?.debit, 1500);

  // Bank account credited (liquid account 1020 for Bank Transfer)
  const bankCredit = purchEntry.lines.find((l) => l.accountCode === "1020");
  assert.equal(bankCredit?.credit, 35000);

  // Supplier payable credited (liability 2010)
  const apCredit = purchEntry.lines.find((l) => l.accountCode === "2010");
  assert.equal(apCredit?.credit, 26500);
});

test("4. Customer & Supplier Due Settlement and Discount Allocation Invariants", () => {
  // Customer Due Settlement: Customer owes ৳9,800. Pays ৳9,500 cash with ৳300 discount concession.
  const custPayEntry = buildCustomerDueCollectionJournalEntry({
    customerName: "Engr. Rafiqul Islam",
    paidAmount: 9500,
    discountAmount: 300,
    paymentMethod: "Cash",
  });

  assert.equal(custPayEntry.totalDebit, custPayEntry.totalCredit);
  assert.equal(custPayEntry.totalDebit, 9800);
  const arCredit = custPayEntry.lines.find((l) => l.accountCode === "1100");
  assert.equal(arCredit?.credit, 9800); // Customer receivable fully cleared

  // Supplier Due Settlement: Shop owes ৳26,500 to BRB Cable. Pays ৳25,500 via Bank with ৳1,000 cash discount.
  const suppPayEntry = buildSupplierDuePaymentJournalEntry({
    supplierName: "BRB Cable Industries",
    paidAmount: 25500,
    discountAmount: 1000,
    paymentMethod: "Bank",
  });

  assert.equal(suppPayEntry.totalDebit, suppPayEntry.totalCredit);
  assert.equal(suppPayEntry.totalDebit, 26500);
  const apDebit = suppPayEntry.lines.find((l) => l.accountCode === "2010");
  assert.equal(apDebit?.debit, 26500); // Supplier payable fully cleared
});

test("5. Comprehensive Trial Balance, P&L Statement and Scrap Loss Mathematical Integrity", () => {
  // Compile multi-event trading day:
  // 1. Initial Sales: ৳40,000 (Paid ৳30,000 cash, ৳10,000 due, COGS ৳28,000)
  const sale = buildSalesJournalEntry({
    orderNo: "ORD-01",
    subtotal: 40000,
    paidAmount: 30000,
    dueAmount: 10000,
    cogsAmount: 28000,
  });

  // 2. Purchase: ৳50,000 (Paid ৳20,000 cash, ৳30,000 due)
  const pur = buildPurchaseJournalEntry({
    purchaseNo: "PUR-01",
    subtotal: 50000,
    paidAmount: 20000,
    dueAmount: 30000,
  });

  // 3. Operating Expense: Shop Rent ৳6,000 paid in cash
  const expRent = buildExpenseJournalEntry({
    expenseTypeCategory: "Showroom Rent",
    expenseName: "Monthly Shop Rent",
    amount: 6000,
  });

  // 4. Cable Off-Cut Scrap Loss: ৳1,500
  const scrap = buildScrapLossJournalEntry({
    productName: "BBS 2.5 rm Cable Off-Cuts",
    scrapValue: 1500,
    reason: "Damaged ends cut during spooling",
  });

  // 5. Customer settles remaining due: ৳10,000
  const custSettlement = buildCustomerDueCollectionJournalEntry({
    customerName: "Contractor Sumon",
    paidAmount: 10000,
    paymentMethod: "Cash",
  });

  const allEntries = [sale, pur, expRent, scrap, custSettlement];

  // A. Validate Trial Balance
  const tb = calculateTrialBalance(allEntries);
  assert.equal(tb.isBalanced, true);
  assert.equal(tb.totalDebit, tb.totalCredit);
  assert.ok(tb.totalDebit > 0);

  // B. Validate Profit & Loss
  const pl = calculateIncomeStatement(allEntries);
  assert.equal(pl.netRevenue, 40000);
  assert.equal(pl.cogsCost, 28000);
  assert.equal(pl.scrapLoss, 1500);
  assert.equal(pl.totalCogs, 29500); // 28000 + 1500
  assert.equal(pl.grossProfit, 10500); // 40000 - 29500
  assert.equal(pl.totalOperatingExpenses, 6000); // Rent
  assert.equal(pl.netProfit, 4500); // 10500 - 6000
});
