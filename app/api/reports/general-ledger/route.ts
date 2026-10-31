import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/report-date-utils";
import {
  CHART_OF_ACCOUNTS,
  buildSalesJournalEntry,
  buildPurchaseJournalEntry,
  buildCustomerDueCollectionJournalEntry,
  buildSupplierDuePaymentJournalEntry,
  buildExpenseJournalEntry,
  buildScrapLossJournalEntry,
  calculateTrialBalance,
  calculateIncomeStatement,
  JournalEntry,
} from "@/lib/general-ledger-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("start_date") || "";
    const endDateStr = searchParams.get("end_date") || "";
    const dateFilter = buildDateRangeFilter(startDateStr, endDateStr);

    const journalEntries: JournalEntry[] = [];

    // 1. Fetch Sales Orders & build sales journal entries
    const orders = await prisma.orders.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        order_details: {
          select: {
            quantity: true,
            price: true,
          },
        },
        order_payment_details: {
          take: 1,
          select: { payment_method: true },
        },
      },
      orderBy: { id: "desc" },
    });

    for (const ord of orders) {
      let cogs = 0;
      for (const d of ord.order_details) {
        const qty = parseFloat(String(d.quantity || "0"));
        const cost = parseFloat(String(d.price || "0"));
        cogs += qty * cost;
      }

      const entry = buildSalesJournalEntry({
        orderNo: ord.order_no || `#ORD-${ord.id}`,
        orderId: ord.id,
        subtotal: parseFloat(String(ord.sub_total || 0)),
        discount: parseFloat(String(ord.discount_amount || 0)),
        deliveryCharge: parseFloat(String(ord.delivery_charge || 0)),
        paidAmount: parseFloat(String(ord.paid_amount || 0)),
        dueAmount: parseFloat(String(ord.due_amount || 0)),
        cogsAmount: cogs,
        paymentMethod: ord.order_payment_details[0]?.payment_method,
        date: ord.created_at,
      });

      journalEntries.push(entry);
    }

    // 2. Fetch Purchases & build purchase journal entries
    const purchases = await prisma.purchases.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        purchase_payment_details: {
          take: 1,
          select: { payment_method: true },
        },
      },
      orderBy: { id: "desc" },
    });

    for (const pur of purchases) {
      const entry = buildPurchaseJournalEntry({
        purchaseNo: pur.purchase_id || `#PUR-${pur.id}`,
        purchaseId: pur.id,
        subtotal: parseFloat(String(pur.grand_subtotal || 0)),
        carryingCharge: parseFloat(String(pur.delivery_charge || 0)),
        paidAmount: parseFloat(String(pur.paid_amount || 0)),
        dueAmount: parseFloat(String(pur.due_amount || 0)),
        paymentMethod: pur.purchase_payment_details[0]?.payment_method,
        date: pur.created_at,
      });

      journalEntries.push(entry);
    }

    // 3. Fetch Customer Due Collections
    const customerPayments = await prisma.customer_payment_details.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        customers: { select: { customer_name: true } },
      },
      orderBy: { id: "desc" },
    });

    for (const cp of customerPayments) {
      const paid = parseFloat(String(cp.paid_amount || 0));
      const disc = parseFloat(String(cp.discount_amount || 0));
      if (paid <= 0 && disc <= 0) continue;

      const entry = buildCustomerDueCollectionJournalEntry({
        collectionId: cp.id,
        customerName: cp.customers?.customer_name || "Customer",
        paidAmount: paid,
        discountAmount: disc,
        paymentMethod: cp.payment_method,
        date: cp.created_at,
      });

      journalEntries.push(entry);
    }

    // 4. Fetch Supplier Due Payments
    const supplierPayments = await prisma.supplier_due_collections.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        suppliers: { select: { name: true } },
      },
      orderBy: { id: "desc" },
    });

    for (const sp of supplierPayments) {
      const paid = parseFloat(String(sp.paid_amount || 0));
      const disc = parseFloat(String(sp.discount_amount || 0));
      if (paid <= 0 && disc <= 0) continue;

      const entry = buildSupplierDuePaymentJournalEntry({
        paymentId: sp.id,
        supplierName: sp.suppliers?.name || "Supplier",
        paidAmount: paid,
        discountAmount: disc,
        paymentMethod: sp.payment_method,
        date: sp.created_at,
      });

      journalEntries.push(entry);
    }

    // 5. Fetch Operating Expenses
    const expenses = await prisma.expenses.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        expense_types: { select: { type_name: true } },
      },
      orderBy: { id: "desc" },
    });

    for (const exp of expenses) {
      const amt = parseFloat(String(exp.expense_amount || 0));
      if (amt <= 0) continue;

      const entry = buildExpenseJournalEntry({
        expenseId: exp.id,
        expenseTypeCategory: exp.expense_types?.type_name,
        expenseName: exp.expense_details || exp.expense_types?.type_name || "Shop Expense",
        amount: amt,
        date: exp.created_at,
      });

      journalEntries.push(entry);
    }

    // 6. Fetch Cable Scrap & Cut-Loss Movements
    const scrapMovements = await prisma.stock_movements.findMany({
      where: {
        movement_type: "SCRAP_CABLE_LOSS",
        ...(dateFilter ? { created_at: dateFilter } : {}),
      },
      include: {
        products: { select: { product_name: true } },
      },
      orderBy: { id: "desc" },
    });

    for (const sm of scrapMovements) {
      const val = parseFloat(String(sm.total_value || 0));
      if (val <= 0) continue;

      const entry = buildScrapLossJournalEntry({
        productId: sm.product_id,
        productName: sm.products?.product_name || "Cable Off-Cut",
        scrapValue: val,
        reason: sm.note || "Scrap Loss",
        date: sm.created_at,
      });

      journalEntries.push(entry);
    }

    // 7. Calculate Trial Balance & Income Statement
    const trialBalance = calculateTrialBalance(journalEntries);
    const incomeStatement = calculateIncomeStatement(journalEntries);

    return NextResponse.json({
      status: "success",
      date_range: {
        start: startDateStr,
        end: endDateStr,
      },
      summary: {
        total_vouchers: journalEntries.length,
        is_balanced: trialBalance.isBalanced,
        trial_balance_debit: trialBalance.totalDebit,
        trial_balance_credit: trialBalance.totalCredit,
        net_revenue: incomeStatement.netRevenue,
        gross_profit: incomeStatement.grossProfit,
        operating_expenses: incomeStatement.totalOperatingExpenses,
        net_profit: incomeStatement.netProfit,
      },
      trial_balance: trialBalance,
      income_statement: incomeStatement,
      chart_of_accounts: CHART_OF_ACCOUNTS,
      recent_vouchers: journalEntries.slice(0, 50),
    });
  } catch (error: any) {
    console.error("General Ledger API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to generate General Ledger" },
      { status: 500 }
    );
  }
}
