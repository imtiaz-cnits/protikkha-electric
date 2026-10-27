import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const customerId = searchParams.get("customer_id");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const where: any = {};

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.created_at = {
        gte: start,
        lte: end,
      };
    } else if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      where.created_at = { gte: start };
    } else if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.created_at = { lte: end };
    }

    if (customerId && customerId !== "all") {
      where.customer_id = BigInt(customerId);
    }

    const orders = await prisma.orders.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        customers: {
          select: {
            id: true,
            customer_name: true,
            mobile: true,
          },
        },
        order_details: {
          include: {
            products: {
              select: {
                id: true,
                product_name: true,
                cost_price: true,
                sell_price: true,
              },
            },
          },
        },
        product_returns: {
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    let totalSalesAmount = 0;
    let totalCostAmount = 0;
    let totalGrossProfit = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;
    let totalDiscountAmount = 0;
    let totalReturnAmount = 0;

    let formatted = orders.map((o) => {
      const returnAmount = o.product_returns.reduce(
        (sum, r) => sum + parseFloat(String(r.amount || 0)),
        0
      );

      let costSum = 0;
      let salesDetailsSum = 0;

      for (const d of o.order_details) {
        const qty = parseFloat(String(d.quantity || 0));
        const buyingPrice =
          parseFloat(String(d.products?.cost_price || 0)) ||
          parseFloat(String(d.price || 0));
        const sellingPrice = parseFloat(String(d.selling_price || 0));

        costSum += buyingPrice * qty;
        salesDetailsSum += sellingPrice * qty;
      }

      const subTotal = parseFloat(String(o.sub_total || salesDetailsSum));
      const discount = parseFloat(String(o.discount_amount || 0));
      const delivery = parseFloat(String(o.delivery_charge || 0));
      const netInvoiceAmount = subTotal - discount + delivery;
      const paid = parseFloat(String(o.paid_amount || 0));
      const due = parseFloat(String(o.due_amount || 0));
      const profit = netInvoiceAmount - costSum - returnAmount;

      totalSalesAmount += netInvoiceAmount;
      totalCostAmount += costSum;
      totalGrossProfit += profit;
      totalPaidAmount += paid;
      totalDueAmount += due;
      totalDiscountAmount += discount;
      totalReturnAmount += returnAmount;

      const dateStr = o.invoice_date
        ? o.invoice_date.toISOString().split("T")[0]
        : o.created_at.toISOString().split("T")[0];

      return {
        id: Number(o.id),
        order_no: o.order_no || `#ORD-${o.id}`,
        customer_id: o.customer_id ? Number(o.customer_id) : null,
        customer_name: o.customers?.customer_name || "Walk-in Customer",
        customer_mobile: o.customers?.mobile || "",
        items_count: o.order_details.length,
        sub_total: subTotal,
        discount_amount: discount,
        delivery_charge: delivery,
        net_amount: netInvoiceAmount,
        cost_amount: costSum,
        profit_amount: profit,
        paid_amount: paid,
        due_amount: due,
        return_amount: returnAmount,
        date: dateStr,
        created_at: o.created_at,
      };
    });

    if (search) {
      formatted = formatted.filter(
        (o) =>
          o.order_no.toLowerCase().includes(search) ||
          o.customer_name.toLowerCase().includes(search) ||
          o.customer_mobile.includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      summary: {
        total_orders: formatted.length,
        total_sales_amount: totalSalesAmount,
        total_cost_amount: totalCostAmount,
        total_gross_profit: totalGrossProfit,
        total_paid_amount: totalPaidAmount,
        total_due_amount: totalDueAmount,
        total_discount_amount: totalDiscountAmount,
        total_return_amount: totalReturnAmount,
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Sales Report API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to generate sales report" },
      { status: 500 }
    );
  }
}
