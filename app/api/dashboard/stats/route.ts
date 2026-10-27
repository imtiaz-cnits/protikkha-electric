import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Current date in Bangladesh Standard Time (Asia/Dhaka - UTC+6)
    const bdDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
    }).format(new Date());

    const startOfToday = new Date(`${bdDateStr}T00:00:00.000+06:00`);
    const endOfToday = new Date(`${bdDateStr}T23:59:59.999+06:00`);

    const [
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalOrders,
      recentOrders,
      ordersToday,
      dueCollectionsToday,
      expensesToday,
      customersWithDue,
      suppliersWithDue,
    ] = await Promise.all([
      prisma.products.count(),
      prisma.customers.count(),
      prisma.suppliers.count(),
      prisma.orders.count(),
      prisma.orders.findMany({
        take: 10,
        orderBy: { id: "desc" },
        include: {
          customers: true,
        },
      }),
      prisma.orders.findMany({
        where: {
          OR: [
            { created_at: { gte: startOfToday, lte: endOfToday } },
            {
              invoice_date: {
                gte: new Date(`${bdDateStr}T00:00:00.000Z`),
                lte: new Date(`${bdDateStr}T23:59:59.999Z`),
              },
            },
          ],
        },
        select: {
          sub_total: true,
          paid_amount: true,
          due_amount: true,
          delivery_charge: true,
          discount_amount: true,
          return_adjustment_amount: true,
        },
      }),
      prisma.customer_payment_details.findMany({
        where: {
          OR: [
            { created_at: { gte: startOfToday, lte: endOfToday } },
            {
              due_collection_date: {
                gte: new Date(`${bdDateStr}T00:00:00.000Z`),
                lte: new Date(`${bdDateStr}T23:59:59.999Z`),
              },
            },
          ],
        },
        select: {
          paid_amount: true,
        },
      }),
      prisma.expenses.findMany({
        where: {
          OR: [
            { created_at: { gte: startOfToday, lte: endOfToday } },
            { date: bdDateStr },
          ],
        },
        select: {
          expense_amount: true,
        },
      }),
      prisma.customers.findMany({
        select: { previous_due_amount: true },
      }),
      prisma.suppliers.findMany({
        select: { purchase_payable_amount: true },
      }),
    ]);

    // Financial calculations
    const todaySales = ordersToday.reduce(
      (acc, curr) => acc + Number(curr.sub_total || 0),
      0
    );

    const todayPaidFromOrders = ordersToday.reduce(
      (acc, curr) => acc + Number(curr.paid_amount || 0),
      0
    );

    const todayDueCollected = dueCollectionsToday.reduce(
      (acc, curr) => acc + parseFloat(String(curr.paid_amount || "0")),
      0
    );

    const todayCollected = todayPaidFromOrders + todayDueCollected;

    const todayExpense = expensesToday.reduce(
      (acc, curr) => acc + Number(curr.expense_amount || 0),
      0
    );

    const totalCustomerDue = customersWithDue.reduce(
      (acc, curr) => acc + parseFloat(String(curr.previous_due_amount || "0")),
      0
    );

    const totalSupplierDue = suppliersWithDue.reduce(
      (acc, curr) => acc + parseFloat(String(curr.purchase_payable_amount || "0")),
      0
    );

    const formattedRecentOrders = recentOrders.map((order) => ({
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
        todaySales,
        todayInvoicesCount: ordersToday.length,
        todayPaid: todayCollected,
        totalCustomerDue,
        totalSupplierDue,
        totalProducts,
        totalCustomers,
        totalSuppliers,
        totalOrders,
        todayExpense,
        recentOrders: formattedRecentOrders,
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
