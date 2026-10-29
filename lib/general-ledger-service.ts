import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Standard Chart of Accounts (COA) for Protikkha Electric
 * Electrical Retail & Wholesale Distribution
 */
export type AccountClassification =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "COGS"
  | "EXPENSE";

export type NormalBalance = "DEBIT" | "CREDIT";

export interface AccountDefinition {
  code: string;
  name: string;
  nameBn: string;
  classification: AccountClassification;
  normalBalance: NormalBalance;
  description: string;
}

export const CHART_OF_ACCOUNTS: Record<string, AccountDefinition> = {
  // 1000 - ASSETS (Normal Balance: DEBIT)
  "1010": {
    code: "1010",
    name: "Cash in Hand (Shop Till)",
    nameBn: "নগদ ক্যাশ (কাউন্টার ক্যাশ)",
    classification: "ASSET",
    normalBalance: "DEBIT",
    description: "Physical cash in register / shop vault",
  },
  "1020": {
    code: "1020",
    name: "Bank & Digital Accounts (MFS/Card)",
    nameBn: "ব্যাংক ও এমএফএস হিসাব (বিকাশ/নগদ/ব্যাংক)",
    classification: "ASSET",
    normalBalance: "DEBIT",
    description: "Bank deposits, bKash Merchant, Nagad, Rocket and POS card settlement",
  },
  "1100": {
    code: "1100",
    name: "Accounts Receivable (Customer Dues)",
    nameBn: "গ্রাহক বকেয়া (প্রাপ্য হিসাব)",
    classification: "ASSET",
    normalBalance: "DEBIT",
    description: "Amounts owed by retail and contractor customers for electrical supplies",
  },
  "1200": {
    code: "1200",
    name: "Merchandise Inventory (Electrical Stock)",
    nameBn: "বৈদ্যুতিক পণ্য ইনভেন্টরি (স্টক)",
    classification: "ASSET",
    normalBalance: "DEBIT",
    description: "Wires, cables, circuit breakers, switch-sockets, pipes and lighting stock at cost",
  },

  // 2000 - LIABILITIES (Normal Balance: CREDIT)
  "2010": {
    code: "2010",
    name: "Accounts Payable (Supplier Dues)",
    nameBn: "সাপ্লায়ার বকেয়া (প্রদেয় হিসাব)",
    classification: "LIABILITY",
    normalBalance: "CREDIT",
    description: "Amounts owed to cable manufacturers, switch brands & distributors",
  },
  "2020": {
    code: "2020",
    name: "Accrued Operating Expenses",
    nameBn: "বকেয়া পরিচালন ব্যয়",
    classification: "LIABILITY",
    normalBalance: "CREDIT",
    description: "Unpaid shop rent, utility bills, or staff salaries",
  },

  // 3000 - EQUITY (Normal Balance: CREDIT)
  "3010": {
    code: "3010",
    name: "Owner Capital / Equity",
    nameBn: "মালিকের মূলধন",
    classification: "EQUITY",
    normalBalance: "CREDIT",
    description: "Owner initial capital and subsequent investments in Protikkha Electric",
  },
  "3020": {
    code: "3020",
    name: "Retained Earnings",
    nameBn: "অর্জিত মুনাফা / পুঞ্জীভূত তহবিল",
    classification: "EQUITY",
    normalBalance: "CREDIT",
    description: "Cumulative retained profit from electrical sales operations",
  },

  // 4000 - REVENUE (Normal Balance: CREDIT)
  "4010": {
    code: "4010",
    name: "Sales Revenue (Electrical Products)",
    nameBn: "পণ্য বিক্রয় আয়",
    classification: "REVENUE",
    normalBalance: "CREDIT",
    description: "Revenue earned from sales of wires, breakers, switches, lights and accessories",
  },
  "4020": {
    code: "4020",
    name: "Sales Discounts Allowed (Contra-Revenue)",
    nameBn: "বিক্রয় বাট্টা / ডিসকাউন্ট",
    classification: "REVENUE",
    normalBalance: "DEBIT", // Contra account: Normal DEBIT
    description: "Discounts and concessions granted to customers on invoices or settlements",
  },
  "4030": {
    code: "4030",
    name: "Delivery & Carriage Income",
    nameBn: "ডেলিভারি চার্জ আয়",
    classification: "REVENUE",
    normalBalance: "CREDIT",
    description: "Transport / delivery fees collected from customers for site delivery",
  },

  // 5000 - COST OF GOODS SOLD (Normal Balance: DEBIT)
  "5010": {
    code: "5010",
    name: "Cost of Goods Sold (COGS)",
    nameBn: "বিক্রিত পণ্যের ব্যয় (COGS)",
    classification: "COGS",
    normalBalance: "DEBIT",
    description: "Purchase cost of electrical products sold to customers",
  },
  "5020": {
    code: "5020",
    name: "Cable Cut-Loss & Scrap Expense",
    nameBn: "তার কাটা ক্ষতি ও স্ক্র্যাপ ব্যয়",
    classification: "COGS",
    normalBalance: "DEBIT",
    description: "Inventory loss resulting from off-cut cable ends, damage, or scrap",
  },

  // 6000 - OPERATING EXPENSES (Normal Balance: DEBIT)
  "6010": {
    code: "6010",
    name: "Shop Rent",
    nameBn: "দোকান ভাড়া",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Monthly retail showroom and warehouse lease payments",
  },
  "6020": {
    code: "6020",
    name: "Electricity & Utility Bills",
    nameBn: "বিদ্যুৎ ও ইউটিলিটি বিল",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Showroom power, display illumination, internet, and municipal fees",
  },
  "6030": {
    code: "6030",
    name: "Staff Salaries & Wages",
    nameBn: "কর্মচারী বেতন ও মজুরি",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Sales executive and helper staff monthly remuneration",
  },
  "6040": {
    code: "6040",
    name: "Carriage & Inward Transport",
    nameBn: "পরিবহন ও মালামাল পরিবহন খরচ",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Freight and labor for receiving heavy cables, pipes and fittings",
  },
  "6050": {
    code: "6050",
    name: "Shop Repair & Maintenance",
    nameBn: "দোকান মেরামত ও রক্ষণাবেক্ষণ",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Racks, tools, display board wiring, and general store maintenance",
  },
  "6090": {
    code: "6090",
    name: "General & Administrative Expenses",
    nameBn: "সাধারণ ও অফিস খরচ",
    classification: "EXPENSE",
    normalBalance: "DEBIT",
    description: "Stationery, POS receipt rolls, tea/entertainment, and miscellaneous",
  },
};

export interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface JournalEntry {
  id?: string;
  entryNo: string;
  date: Date;
  referenceType: string;
  referenceId?: string | number | bigint;
  referenceNo?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
}

/**
 * Validates that debits equal credits within 0.001 tolerance
 */
export function validateDoubleEntryBalance(lines: JournalLine[]): {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    const dr = Math.round((Number(line.debit) || 0) * 100) / 100;
    const cr = Math.round((Number(line.credit) || 0) * 100) / 100;

    if (dr < 0 || cr < 0) {
      throw new Error(`Negative amounts not permitted in journal lines: dr=${dr}, cr=${cr}`);
    }
    if (dr > 0 && cr > 0) {
      throw new Error(
        `A journal line cannot contain both debit and credit amounts: account ${line.accountCode}`
      );
    }
    if (!CHART_OF_ACCOUNTS[line.accountCode]) {
      throw new Error(`Unknown account code "${line.accountCode}" in Chart of Accounts`);
    }

    totalDebit += dr;
    totalCredit += cr;
  }

  totalDebit = Math.round(totalDebit * 100) / 100;
  totalCredit = Math.round(totalCredit * 100) / 100;
  const difference = Math.abs(Math.round((totalDebit - totalCredit) * 100) / 100);

  return {
    isValid: difference < 0.001,
    totalDebit,
    totalCredit,
    difference,
  };
}

/**
 * Creates and validates a complete Double-Entry Journal Entry
 */
export function createJournalEntry(params: {
  entryNo: string;
  date?: Date;
  referenceType: string;
  referenceId?: string | number | bigint;
  referenceNo?: string;
  description: string;
  lines: JournalLine[];
}): JournalEntry {
  const check = validateDoubleEntryBalance(params.lines);
  if (!check.isValid) {
    throw new Error(
      `Double-Entry Imbalance: Debits (৳${check.totalDebit.toFixed(2)}) must equal Credits (৳${check.totalCredit.toFixed(2)}). Discrepancy: ৳${check.difference.toFixed(2)}`
    );
  }

  return {
    entryNo: params.entryNo,
    date: params.date || new Date(),
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    referenceNo: params.referenceNo,
    description: params.description,
    lines: params.lines.map((l) => ({
      accountCode: l.accountCode,
      debit: Math.round((Number(l.debit) || 0) * 100) / 100,
      credit: Math.round((Number(l.credit) || 0) * 100) / 100,
      note: l.note,
    })),
    totalDebit: check.totalDebit,
    totalCredit: check.totalCredit,
  };
}

/**
 * Helper to determine cash vs bank account code by method name
 */
export function getLiquidAccountCode(paymentMethod?: string | null): "1010" | "1020" {
  const m = (paymentMethod || "cash").toLowerCase();
  if (
    m.includes("bank") ||
    m.includes("bkash") ||
    m.includes("nagad") ||
    m.includes("rocket") ||
    m.includes("card") ||
    m.includes("cheque")
  ) {
    return "1020";
  }
  return "1010";
}

/**
 * Standard Sales Journal Entry Builder
 * Reflects Customer Invoicing, Cash/Bank Inflow, Receivables, Discounts, and COGS/Inventory
 */
export function buildSalesJournalEntry(params: {
  orderNo: string;
  orderId?: bigint | number;
  subtotal: number;
  discount?: number;
  deliveryCharge?: number;
  paidAmount: number;
  dueAmount: number;
  cogsAmount?: number;
  paymentMethod?: string | null;
  date?: Date;
}): JournalEntry {
  const subtotal = Math.round(Number(params.subtotal || 0) * 100) / 100;
  const discount = Math.round(Number(params.discount || 0) * 100) / 100;
  const delivery = Math.round(Number(params.deliveryCharge || 0) * 100) / 100;
  const paid = Math.round(Number(params.paidAmount || 0) * 100) / 100;
  const due = Math.round(Number(params.dueAmount || 0) * 100) / 100;
  const cogs = Math.round(Number(params.cogsAmount || 0) * 100) / 100;

  const liquidAccount = getLiquidAccountCode(params.paymentMethod);
  const lines: JournalLine[] = [];

  // Financial Inflow & Receivables
  if (paid > 0) {
    lines.push({ accountCode: liquidAccount, debit: paid, credit: 0, note: "Cash / Bank received" });
  }
  if (due > 0) {
    lines.push({ accountCode: "1100", debit: due, credit: 0, note: "Customer Due (Receivable)" });
  }
  if (discount > 0) {
    lines.push({ accountCode: "4020", debit: discount, credit: 0, note: "Sales Discount Allowed" });
  }

  // Revenue & Charges
  if (subtotal > 0) {
    lines.push({ accountCode: "4010", debit: 0, credit: subtotal, note: "Sales Revenue" });
  }
  if (delivery > 0) {
    lines.push({ accountCode: "4030", debit: 0, credit: delivery, note: "Delivery Charge Income" });
  }

  // Cost of Goods Sold & Inventory Deductions (Perpetual Inventory Method)
  if (cogs > 0) {
    lines.push({ accountCode: "5010", debit: cogs, credit: 0, note: "Cost of Goods Sold" });
    lines.push({ accountCode: "1200", debit: 0, credit: cogs, note: "Inventory Decrement at Cost" });
  }

  return createJournalEntry({
    entryNo: `JV-SALE-${params.orderNo}`,
    date: params.date,
    referenceType: "SALE",
    referenceId: params.orderId,
    referenceNo: params.orderNo,
    description: `Sales Invoice ${params.orderNo}`,
    lines,
  });
}

/**
 * Standard Purchase Inward Journal Entry Builder
 * Reflects Merchandise Inventory Increment, Freight, Cash Outflow, and Payables
 */
export function buildPurchaseJournalEntry(params: {
  purchaseNo: string;
  purchaseId?: bigint | number;
  subtotal: number;
  carryingCharge?: number;
  paidAmount: number;
  dueAmount: number;
  paymentMethod?: string | null;
  date?: Date;
}): JournalEntry {
  const subtotal = Math.round(Number(params.subtotal || 0) * 100) / 100;
  const carrying = Math.round(Number(params.carryingCharge || 0) * 100) / 100;
  const paid = Math.round(Number(params.paidAmount || 0) * 100) / 100;
  const due = Math.round(Number(params.dueAmount || 0) * 100) / 100;

  const liquidAccount = getLiquidAccountCode(params.paymentMethod);
  const lines: JournalLine[] = [];

  // Assets Inward
  if (subtotal > 0) {
    lines.push({ accountCode: "1200", debit: subtotal, credit: 0, note: "Inventory Stock Inward" });
  }
  if (carrying > 0) {
    lines.push({ accountCode: "6040", debit: carrying, credit: 0, note: "Carriage Inward Transport" });
  }

  // Outflow & Payables
  if (paid > 0) {
    lines.push({ accountCode: liquidAccount, debit: 0, credit: paid, note: "Cash / Bank Paid to Supplier" });
  }
  if (due > 0) {
    lines.push({ accountCode: "2010", debit: 0, credit: due, note: "Supplier Due (Payable)" });
  }

  return createJournalEntry({
    entryNo: `JV-PURCH-${params.purchaseNo}`,
    date: params.date,
    referenceType: "PURCHASE",
    referenceId: params.purchaseId,
    referenceNo: params.purchaseNo,
    description: `Purchase Inward Bill ${params.purchaseNo}`,
    lines,
  });
}

/**
 * Customer Due Collection Journal Entry Builder
 * DR Cash/Bank, DR Sales Discount, CR Accounts Receivable
 */
export function buildCustomerDueCollectionJournalEntry(params: {
  collectionId?: bigint | number;
  customerName: string;
  paidAmount: number;
  discountAmount?: number;
  paymentMethod?: string | null;
  date?: Date;
}): JournalEntry {
  const paid = Math.round(Number(params.paidAmount || 0) * 100) / 100;
  const discount = Math.round(Number(params.discountAmount || 0) * 100) / 100;
  const totalSettled = Math.round((paid + discount) * 100) / 100;

  const liquidAccount = getLiquidAccountCode(params.paymentMethod);
  const lines: JournalLine[] = [];

  if (paid > 0) {
    lines.push({ accountCode: liquidAccount, debit: paid, credit: 0, note: "Cash / Bank Received" });
  }
  if (discount > 0) {
    lines.push({ accountCode: "4020", debit: discount, credit: 0, note: "Settlement Discount Allowed" });
  }
  lines.push({
    accountCode: "1100",
    debit: 0,
    credit: totalSettled,
    note: `Due Settlement from ${params.customerName}`,
  });

  return createJournalEntry({
    entryNo: `JV-CUST-PAY-${params.collectionId || "REC"}`,
    date: params.date,
    referenceType: "CUSTOMER_PAYMENT",
    referenceId: params.collectionId,
    description: `Due Collection from Customer: ${params.customerName}`,
    lines,
  });
}

/**
 * Supplier Due Payment Journal Entry Builder
 * DR Accounts Payable, CR Cash/Bank, CR Purchase Discount Earned
 */
export function buildSupplierDuePaymentJournalEntry(params: {
  paymentId?: bigint | number;
  supplierName: string;
  paidAmount: number;
  discountAmount?: number;
  paymentMethod?: string | null;
  date?: Date;
}): JournalEntry {
  const paid = Math.round(Number(params.paidAmount || 0) * 100) / 100;
  const discount = Math.round(Number(params.discountAmount || 0) * 100) / 100;
  const totalSettled = Math.round((paid + discount) * 100) / 100;

  const liquidAccount = getLiquidAccountCode(params.paymentMethod);
  const lines: JournalLine[] = [];

  lines.push({
    accountCode: "2010",
    debit: totalSettled,
    credit: 0,
    note: `Payable Settlement to ${params.supplierName}`,
  });
  if (paid > 0) {
    lines.push({ accountCode: liquidAccount, debit: 0, credit: paid, note: "Cash / Bank Paid" });
  }
  if (discount > 0) {
    lines.push({ accountCode: "4020", debit: 0, credit: discount, note: "Purchase Discount Earned" });
  }

  return createJournalEntry({
    entryNo: `JV-SUPP-PAY-${params.paymentId || "DISB"}`,
    date: params.date,
    referenceType: "SUPPLIER_PAYMENT",
    referenceId: params.paymentId,
    description: `Due Payment to Supplier: ${params.supplierName}`,
    lines,
  });
}

/**
 * Operating Expense Journal Entry Builder
 * DR Expense (Rent, Power, Salaries, etc.), CR Cash/Bank
 */
export function buildExpenseJournalEntry(params: {
  expenseId?: bigint | number;
  expenseTypeCategory?: string | null;
  expenseName: string;
  amount: number;
  paymentMethod?: string | null;
  date?: Date;
}): JournalEntry {
  const amount = Math.round(Number(params.amount || 0) * 100) / 100;
  const cat = (params.expenseTypeCategory || "").toLowerCase();

  let expAccount = "6090"; // default general expense
  if (cat.includes("rent") || cat.includes("ভাড়া")) {
    expAccount = "6010";
  } else if (cat.includes("electric") || cat.includes("bill") || cat.includes("বিদ্যুৎ") || cat.includes("বিল")) {
    expAccount = "6020";
  } else if (cat.includes("salary") || cat.includes("staff") || cat.includes("বেতন")) {
    expAccount = "6030";
  } else if (cat.includes("transport") || cat.includes("carriage") || cat.includes("পরিবহন")) {
    expAccount = "6040";
  } else if (cat.includes("repair") || cat.includes("maintenance") || cat.includes("মেরামত")) {
    expAccount = "6050";
  }

  const liquidAccount = getLiquidAccountCode(params.paymentMethod);
  const lines: JournalLine[] = [
    { accountCode: expAccount, debit: amount, credit: 0, note: params.expenseName },
    { accountCode: liquidAccount, debit: 0, credit: amount, note: "Cash / Bank Paid for Expense" },
  ];

  return createJournalEntry({
    entryNo: `JV-EXP-${params.expenseId || "GEN"}`,
    date: params.date,
    referenceType: "EXPENSE",
    referenceId: params.expenseId,
    description: `Expense: ${params.expenseName}`,
    lines,
  });
}

/**
 * Cable Scrap & Off-Cut Loss Journal Entry Builder
 * DR Cable Cut-Loss & Scrap Expense (5020), CR Merchandise Inventory (1200)
 */
export function buildScrapLossJournalEntry(params: {
  productId?: bigint | number;
  productName: string;
  scrapValue: number;
  reason?: string;
  date?: Date;
}): JournalEntry {
  const value = Math.round(Number(params.scrapValue || 0) * 100) / 100;

  const lines: JournalLine[] = [
    {
      accountCode: "5020",
      debit: value,
      credit: 0,
      note: `Scrap Cable Loss: ${params.productName} (${params.reason || "Cut-End Loss"})`,
    },
    {
      accountCode: "1200",
      debit: 0,
      credit: value,
      note: `Inventory Reduction at Cost: ${params.productName}`,
    },
  ];

  return createJournalEntry({
    entryNo: `JV-SCRAP-${params.productId || "ADJ"}`,
    date: params.date,
    referenceType: "SCRAP_LOSS",
    referenceId: params.productId,
    description: `Scrap & Cut-Loss Loss for ${params.productName}`,
    lines,
  });
}

/**
 * Trial Balance Ledger Row
 */
export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountNameBn: string;
  classification: AccountClassification;
  normalBalance: NormalBalance;
  totalDebit: number;
  totalCredit: number;
  balanceDebit: number;
  balanceCredit: number;
}

export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
}

/**
 * Computes Trial Balance from a collection of Journal Entries
 */
export function calculateTrialBalance(entries: JournalEntry[]): TrialBalanceResult {
  const accountTotals: Record<string, { debit: number; credit: number }> = {};

  for (const code of Object.keys(CHART_OF_ACCOUNTS)) {
    accountTotals[code] = { debit: 0, credit: 0 };
  }

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!accountTotals[line.accountCode]) {
        accountTotals[line.accountCode] = { debit: 0, credit: 0 };
      }
      accountTotals[line.accountCode].debit += line.debit;
      accountTotals[line.accountCode].credit += line.credit;
    }
  }

  let grandDebit = 0;
  let grandCredit = 0;
  const rows: TrialBalanceRow[] = [];

  for (const [code, totals] of Object.entries(accountTotals)) {
    const dr = Math.round(totals.debit * 100) / 100;
    const cr = Math.round(totals.credit * 100) / 100;

    // Only include accounts with activity
    if (dr === 0 && cr === 0) continue;

    const def = CHART_OF_ACCOUNTS[code];
    let balanceDebit = 0;
    let balanceCredit = 0;

    if (dr >= cr) {
      balanceDebit = Math.round((dr - cr) * 100) / 100;
    } else {
      balanceCredit = Math.round((cr - dr) * 100) / 100;
    }

    grandDebit += balanceDebit;
    grandCredit += balanceCredit;

    rows.push({
      accountCode: code,
      accountName: def ? def.name : `Account ${code}`,
      accountNameBn: def ? def.nameBn : `হিসাব ${code}`,
      classification: def ? def.classification : "ASSET",
      normalBalance: def ? def.normalBalance : "DEBIT",
      totalDebit: dr,
      totalCredit: cr,
      balanceDebit,
      balanceCredit,
    });
  }

  grandDebit = Math.round(grandDebit * 100) / 100;
  grandCredit = Math.round(grandCredit * 100) / 100;

  return {
    rows,
    totalDebit: grandDebit,
    totalCredit: grandCredit,
    isBalanced: Math.abs(grandDebit - grandCredit) < 0.001,
  };
}

/**
 * Computes Income Statement (P&L) from Trial Balance or Journal Entries
 */
export function calculateIncomeStatement(entries: JournalEntry[]): {
  grossSales: number;
  salesDiscounts: number;
  deliveryIncome: number;
  netRevenue: number;
  cogsCost: number;
  scrapLoss: number;
  totalCogs: number;
  grossProfit: number;
  operatingExpenses: { accountCode: string; name: string; amount: number }[];
  totalOperatingExpenses: number;
  netProfit: number;
} {
  const tb = calculateTrialBalance(entries);

  let grossSales = 0;
  let salesDiscounts = 0;
  let deliveryIncome = 0;
  let cogsCost = 0;
  let scrapLoss = 0;
  const operatingExpenses: { accountCode: string; name: string; amount: number }[] = [];
  let totalOperatingExpenses = 0;

  for (const r of tb.rows) {
    if (r.accountCode === "4010") {
      grossSales += r.balanceCredit;
    } else if (r.accountCode === "4020") {
      salesDiscounts += r.balanceDebit;
    } else if (r.accountCode === "4030") {
      deliveryIncome += r.balanceCredit;
    } else if (r.accountCode === "5010") {
      cogsCost += r.balanceDebit;
    } else if (r.accountCode === "5020") {
      scrapLoss += r.balanceDebit;
    } else if (r.classification === "EXPENSE") {
      const amt = r.balanceDebit;
      operatingExpenses.push({
        accountCode: r.accountCode,
        name: r.accountName,
        amount: amt,
      });
      totalOperatingExpenses += amt;
    }
  }

  const netRevenue = Math.round((grossSales - salesDiscounts + deliveryIncome) * 100) / 100;
  const totalCogs = Math.round((cogsCost + scrapLoss) * 100) / 100;
  const grossProfit = Math.round((netRevenue - totalCogs) * 100) / 100;
  totalOperatingExpenses = Math.round(totalOperatingExpenses * 100) / 100;
  const netProfit = Math.round((grossProfit - totalOperatingExpenses) * 100) / 100;

  return {
    grossSales,
    salesDiscounts,
    deliveryIncome,
    netRevenue,
    cogsCost,
    scrapLoss,
    totalCogs,
    grossProfit,
    operatingExpenses,
    totalOperatingExpenses,
    netProfit,
  };
}
