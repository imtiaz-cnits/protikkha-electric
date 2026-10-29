import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "today"; // today | last_week | last_month | date_wise
    const startDateParam = searchParams.get("start_date");
    const endDateParam = searchParams.get("end_date");
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10));

    // Bangladesh Standard Time (Asia/Dhaka - UTC+6)
    const now = new Date();
    const bdDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
    }).format(now);

    let periodStart: Date;
    let periodEnd: Date;

    if (period === "today") {
      periodStart = new Date(`${bdDateStr}T00:00:00.000+06:00`);
      periodEnd = new Date(`${bdDateStr}T23:59:59.999+06:00`);
    } else if (period === "last_week") {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const past7Str = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(past7);
      periodStart = new Date(`${past7Str}T00:00:00.000+06:00`);
      periodEnd = new Date(`${bdDateStr}T23:59:59.999+06:00`);
    } else if (period === "last_month") {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const past30Str = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(past30);
      periodStart = new Date(`${past30Str}T00:00:00.000+06:00`);
      periodEnd = new Date(`${bdDateStr}T23:59:59.999+06:00`);
    } else if (period === "date_wise" && startDateParam && endDateParam) {
      periodStart = new Date(`${startDateParam}T00:00:00.000+06:00`);
      periodEnd = new Date(`${endDateParam}T23:59:59.999+06:00`);
    } else {
      periodStart = new Date(`${bdDateStr}T00:00:00.000+06:00`);
      periodEnd = new Date(`${bdDateStr}T23:59:59.999+06:00`);
    }

    // 1. Fetch Orders in Period with details for COGS
    const [
      ordersInPeriod,
      dueCollectionsInPeriod,
      expensesInPeriod,
      totalProducts,
      totalCustomers,
      totalSuppliers,
      customersWithDue,
      suppliersWithDue,
    ] = await Promise.all([
      prisma.orders.findMany({
        where: {
          created_at: { gte: periodStart, lte: periodEnd },
        },
        include: {
          order_details: true,
        },
      }),
      prisma.customer_payment_details.findMany({
        where: {
          created_at: { gte: periodStart, lte: periodEnd },
        },
        select: {
          paid_amount: true,
        },
      }),
      prisma.expenses.findMany({
        where: {
          created_at: { gte: periodStart, lte: periodEnd },
        },
        select: {
          expense_amount: true,
        },
      }),
      prisma.products.count({ where: { status: "active" } }),
      prisma.customers.count(),
      prisma.suppliers.count(),
      prisma.customers.findMany({ select: { previous_due_amount: true } }),
      prisma.suppliers.findMany({ select: { purchase_payable_amount: true } }),
    ]);

    // Financial calculations for period
    const income = ordersInPeriod.reduce((acc, o) => acc + Number(o.sub_total || 0), 0);
    const paidFromOrders = ordersInPeriod.reduce((acc, o) => acc + Number(o.paid_amount || 0), 0);
    const dueCollections = dueCollectionsInPeriod.reduce((acc, c) => acc + parseFloat(String(c.paid_amount || 0)), 0);
    const cashCollection = paidFromOrders + dueCollections;
    const expense = expensesInPeriod.reduce((acc, e) => acc + Number(e.expense_amount || 0), 0);

    // COGS
    let totalCogs = 0;
    for (const order of ordersInPeriod) {
      if (Array.isArray(order.order_details)) {
        for (const d of order.order_details) {
          totalCogs += Number(d.quantity || 0) * Number(d.price || 0);
        }
      }
    }

    const discount = ordersInPeriod.reduce((acc, o) => acc + Number(o.discount_amount || 0), 0);
    const returns = ordersInPeriod.reduce((acc, o) => acc + Number(o.return_adjustment_amount || 0), 0);
    // Net profit = Income - COGS - Discount - Expense
    const profit = Math.max(0, income - totalCogs - discount - expense);

    const receivableDue = customersWithDue.reduce((acc, c) => acc + parseFloat(String(c.previous_due_amount || 0)), 0);
    const payableDue = suppliersWithDue.reduce((acc, s) => acc + parseFloat(String(s.purchase_payable_amount || 0)), 0);

    // 2. Fetch Last 15 Days Trend Data
    const last15Days = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      const dayStart = new Date(`${dStr}T00:00:00.000+06:00`);
      const dayEnd = new Date(`${dStr}T23:59:59.999+06:00`);

      last15Days.push({
        date: label,
        dateKey: dStr,
        dayStart,
        dayEnd,
      });
    }

    const trend15DaysStart = last15Days[0].dayStart;
    const trend15DaysEnd = last15Days[last15Days.length - 1].dayEnd;

    const [trendOrders, trendExpenses] = await Promise.all([
      prisma.orders.findMany({
        where: {
          created_at: { gte: trend15DaysStart, lte: trend15DaysEnd },
        },
        include: {
          order_details: true,
        },
      }),
      prisma.expenses.findMany({
        where: {
          created_at: { gte: trend15DaysStart, lte: trend15DaysEnd },
        },
        select: {
          expense_amount: true,
          created_at: true,
        },
      }),
    ]);

    const trendData = last15Days.map((day) => {
      const dayOrders = trendOrders.filter((o) => {
        const oDate = new Date(o.created_at);
        return oDate >= day.dayStart && oDate <= day.dayEnd;
      });

      const dayExpenses = trendExpenses.filter((e) => {
        const eDate = new Date(e.created_at);
        return eDate >= day.dayStart && eDate <= day.dayEnd;
      });

      const daySales = dayOrders.reduce((acc, o) => acc + Number(o.sub_total || 0), 0);
      let dayCogs = 0;
      for (const o of dayOrders) {
        if (Array.isArray(o.order_details)) {
          for (const d of o.order_details) {
            dayCogs += Number(d.quantity || 0) * Number(d.price || 0);
          }
        }
      }
      const dayExp = dayExpenses.reduce((acc, e) => acc + Number(e.expense_amount || 0), 0);
      const dayDisc = dayOrders.reduce((acc, o) => acc + Number(o.discount_amount || 0), 0);
      const dayProfit = Math.max(0, daySales - dayCogs - dayDisc - dayExp);

      return {
        date: day.date,
        sales: daySales,
        profit: dayProfit,
      };
    });

    // 3. Financial Distribution Data (Monthly collections, customer dues, monthly expenses, net profit)
    const monthlyCollection = cashCollection > 0 ? cashCollection : paidFromOrders;
    const monthlyExpenses = expense;
    const netProfit = profit;
    const totalVolume = monthlyCollection + receivableDue + monthlyExpenses + netProfit;

    const financialDistribution = {
      monthlyCollection,
      customerDues: receivableDue,
      monthlyExpenses,
      netProfit,
      totalVolume,
    };

    // 4. Invoices Table with Search and Pagination
    const whereClause: any = {};
    if (search.trim()) {
      whereClause.OR = [
        { order_no: { contains: search.trim() } },
        { customers: { customer_name: { contains: search.trim() } } },
        { customers: { mobile: { contains: search.trim() } } },
      ];
    }

    const [tableOrders, totalTableOrders] = await Promise.all([
      prisma.orders.findMany({
        where: whereClause,
        take: pageSize,
        skip: (page - 1) * pageSize,
        orderBy: { id: "desc" },
        include: {
          customers: true,
        },
      }),
      prisma.orders.count({ where: whereClause }),
    ]);

    const formattedTableOrders = tableOrders.map((order) => ({
      id: Number(order.id),
      order_no: order.order_no,
      customer_name: order.customers?.customer_name || "Walking Customer",
      sub_total: Number(order.sub_total || 0),
      paid_amount: Number(order.paid_amount || 0),
      due_amount: Number(order.due_amount || 0),
      invoice_date: order.invoice_date,
      created_at: order.created_at,
    }));

    return NextResponse.json({
      status: "success",
      data: {
        banner: {
          income,
          cashCollection,
          expense,
          profit,
          receivableDue,
          payableDue,
          returns,
          discount,
          totalProduct: totalProducts,
          totalCustomer: totalCustomers,
          totalSupplier: totalSuppliers,
        },
        trendData,
        financialDistribution,
        table: {
          orders: formattedTableOrders,
          totalCount: totalTableOrders,
          page,
          pageSize,
          totalPages: Math.ceil(totalTableOrders / pageSize) || 1,
        },
      },
    });
  } catch (error: any) {
    console.error("Dashboard Stats API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
