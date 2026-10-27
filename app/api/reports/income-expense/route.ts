import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const todayStr = new Date().toISOString().split("T")[0];
    const startDateStr = searchParams.get("start_date") || todayStr;
    const endDateStr = searchParams.get("end_date") || startDateStr;

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    // 1. Opening Balance
    const manualOpening = await prisma.opening_balances.findFirst({
      where: {
        date: {
          lte: endDate,
        },
      },
      orderBy: { date: "desc" },
    });
    const openingBalance = manualOpening
      ? parseFloat(String(manualOpening.amount || 0))
      : 0;

    // 2. Sales Cash Collections
    const orderPayments = await prisma.order_payment_details.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        paid_amount: true,
      },
    });
    const salesCollection = orderPayments.reduce(
      (sum, p) => sum + parseFloat(String(p.paid_amount || 0)),
      0
    );

    // 3. Customer Due Collections
    const customerDues = await prisma.customer_payment_details.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        paid_amount: true,
        previous_due_amount: true,
      },
    });
    const dueCollection = customerDues.reduce(
      (sum, p) => sum + parseFloat(String(p.paid_amount || p.previous_due_amount || 0)),
      0
    );

    const totalCashInflow = salesCollection + dueCollection;

    // 4. Supplier Due Payments
    const supplierDues = await prisma.supplier_due_collections.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        suppliers: {
          select: { name: true, company: true },
        },
      },
    });

    const supplierMap = new Map<string, { name: string; total_paid: number }>();
    let totalSupplierPayments = 0;

    for (const sp of supplierDues) {
      const supName = sp.suppliers?.name || "General Supplier";
      const amount = parseFloat(String(sp.paid_amount || 0));
      totalSupplierPayments += amount;

      if (!supplierMap.has(supName)) {
        supplierMap.set(supName, { name: supName, total_paid: 0 });
      }
      supplierMap.get(supName)!.total_paid += amount;
    }

    const supplierPaymentsList = Array.from(supplierMap.values());

    // 5. Operating Expenses by Type
    const expenses = await prisma.expenses.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        expense_types: {
          select: { type_name: true },
        },
      },
    });

    const expenseMap = new Map<string, { type_name: string; count: number; total_amount: number }>();
    let totalExpenses = 0;

    for (const exp of expenses) {
      const typeName = exp.expense_types?.type_name || "General Overhead";
      const amount = parseFloat(String(exp.expense_amount || 0));
      totalExpenses += amount;

      if (!expenseMap.has(typeName)) {
        expenseMap.set(typeName, { type_name: typeName, count: 0, total_amount: 0 });
      }
      const item = expenseMap.get(typeName)!;
      item.count += 1;
      item.total_amount += amount;
    }

    const expensesList = Array.from(expenseMap.values());

    // 6. Net Calculations
    const totalCashOutflow = totalSupplierPayments + totalExpenses;
    const netCashFlow = totalCashInflow - totalCashOutflow;
    const closingBalance = openingBalance + netCashFlow;

    return NextResponse.json({
      status: "success",
      date_range: {
        start: startDateStr,
        end: endDateStr,
      },
      summary: {
        opening_balance: openingBalance,
        sales_collection: salesCollection,
        due_collection: dueCollection,
        total_inflow: totalCashInflow,
        supplier_payments: totalSupplierPayments,
        total_expenses: totalExpenses,
        total_outflow: totalCashOutflow,
        net_cash_flow: netCashFlow,
        closing_balance: closingBalance,
      },
      supplier_payments_breakdown: supplierPaymentsList,
      expenses_breakdown: expensesList,
    });
  } catch (error: any) {
    console.error("Income & Expense API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to generate statement" },
      { status: 500 }
    );
  }
}
