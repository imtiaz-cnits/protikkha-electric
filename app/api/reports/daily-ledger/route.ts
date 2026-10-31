import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRangeFilter, parseLocalEndOfDay } from "@/lib/report-date-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get("start_date") || "";
    const endDateStr = searchParams.get("end_date") || "";

    const dateFilter = buildDateRangeFilter(startDateStr, endDateStr);
    const endBound = parseLocalEndOfDay(endDateStr);

    // 1. Fetch latest opening balance before or on endDate (or latest overall when cleared)
    const manualOpening = await prisma.opening_balances.findFirst({
      where: endBound
        ? {
            date: {
              lte: endBound,
            },
          }
        : undefined,
      orderBy: { date: "desc" },
    });

    const initialOpeningBalance = manualOpening
      ? parseFloat(String(manualOpening.amount || 0))
      : 0;

    // 2. Fetch Sales Cash Collections
    const orderPayments = await prisma.order_payment_details.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        orders: {
          include: {
            customers: {
              select: { customer_name: true },
            },
          },
        },
      },
    });

    const salesInflows = orderPayments.map((op) => {
      const orderNo = op.orders?.order_no || `#ORD-${op.order_id}`;
      const customerName = op.orders?.customers?.customer_name || "Walk-in Customer";
      const amount = parseFloat(String(op.paid_amount || 0));

      return {
        id: `sale-${op.id}`,
        timestamp: op.created_at.toISOString(),
        date_formatted: op.created_at.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        particulars: `নগদ বিক্রি - ইনভয়েস ${orderNo}`,
        party_name: customerName,
        type: "inflow" as const,
        category: "ক্যাশ সেলস (Sales)",
        inflow: amount,
        outflow: 0,
        ref_no: orderNo,
        payment_method: op.payment_method || "Cash",
      };
    });

    // 3. Fetch Customer Due Collections
    const customerDuePayments = await prisma.customer_payment_details.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        customers: {
          select: { customer_name: true },
        },
      },
    });

    const dueInflows = customerDuePayments.map((dp) => {
      const customerName = dp.customers?.customer_name || "Customer";
      const amount = parseFloat(String(dp.paid_amount || dp.previous_due_amount || 0));

      return {
        id: `due-${dp.id}`,
        timestamp: dp.created_at.toISOString(),
        date_formatted: dp.created_at.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        particulars: "কাস্টমার বকেয়া আদায়",
        party_name: customerName,
        type: "inflow" as const,
        category: "বকেয়া কালেকশন (Due Collection)",
        inflow: amount,
        outflow: 0,
        ref_no: `CUST-PAY-${dp.id}`,
        payment_method: dp.payment_method || "Cash",
      };
    });

    // 4. Fetch Operating Expenses
    const rawExpenses = await prisma.expenses.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        expense_types: {
          select: { type_name: true },
        },
        users_expenses_staff_idTousers: {
          select: { name: true, role: true },
        },
      },
    });

    const expenseOutflows = rawExpenses.map((exp) => {
      const typeName = exp.expense_types?.type_name || "General Expense";
      const staffInfo = exp.users_expenses_staff_idTousers?.name
        ? ` (${exp.users_expenses_staff_idTousers.name})`
        : "";
      const amount = parseFloat(String(exp.expense_amount || 0));

      return {
        id: `exp-${exp.id}`,
        timestamp: exp.created_at.toISOString(),
        date_formatted: exp.created_at.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        particulars: `দোকানের খরচ - ${exp.expense_details || typeName}${staffInfo}`,
        party_name: typeName,
        type: "outflow" as const,
        category: "দোকান খরচ (Expense)",
        inflow: 0,
        outflow: amount,
        ref_no: `EXP-${exp.id}`,
        payment_method: "Cash",
      };
    });

    // 5. Fetch Supplier Payments (Due Payments)
    const supplierDuePayments = await prisma.supplier_due_collections.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        suppliers: {
          select: { name: true, company: true },
        },
      },
    });

    const supplierOutflows = supplierDuePayments.map((sp) => {
      const supplierName = sp.suppliers?.name || "Supplier";
      const amount = parseFloat(String(sp.paid_amount || 0));

      return {
        id: `sup-${sp.id}`,
        timestamp: sp.created_at.toISOString(),
        date_formatted: sp.created_at.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        particulars: "সাপ্লায়ার বকেয়া পরিশোধ",
        party_name: supplierName,
        type: "outflow" as const,
        category: "সাপ্লায়ার পরিশোধ (Supplier Due)",
        inflow: 0,
        outflow: amount,
        ref_no: `SUP-PAY-${sp.id}`,
        payment_method: sp.payment_method || "Cash",
      };
    });

    // 6. Combine all transactions and sort chronologically
    const allTransactions = [
      ...salesInflows,
      ...dueInflows,
      ...expenseOutflows,
      ...supplierOutflows,
    ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    let runningBalance = initialOpeningBalance;
    let totalInflow = 0;
    let totalOutflow = 0;

    const ledgerData = allTransactions.map((tx) => {
      totalInflow += tx.inflow;
      totalOutflow += tx.outflow;
      runningBalance += tx.inflow - tx.outflow;

      return {
        ...tx,
        running_balance: runningBalance,
      };
    });

    return NextResponse.json({
      status: "success",
      summary: {
        opening_balance: initialOpeningBalance,
        total_inflow: totalInflow,
        total_outflow: totalOutflow,
        net_balance: runningBalance,
        total_count: ledgerData.length,
        start_date: startDateStr,
        end_date: endDateStr,
      },
      data: ledgerData,
    });
  } catch (error: any) {
    console.error("Daily Ledger API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to generate daily ledger" },
      { status: 500 }
    );
  }
}
