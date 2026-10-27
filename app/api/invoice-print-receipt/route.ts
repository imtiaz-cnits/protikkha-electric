import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("id");

    let order: any = null;

    if (invoiceId) {
      order = await prisma.orders.findUnique({
        where: { id: BigInt(invoiceId) },
        include: {
          customers: true,
          users: true,
          order_details: {
            include: {
              products: true,
            },
          },
          order_payment_details: {
            orderBy: { id: "desc" },
            take: 1,
          },
        },
      });
    } else {
      order = await prisma.orders.findFirst({
        orderBy: { id: "desc" },
        include: {
          customers: true,
          users: true,
          order_details: {
            include: {
              products: true,
            },
          },
          order_payment_details: {
            orderBy: { id: "desc" },
            take: 1,
          },
        },
      });
    }

    if (!order) {
      return NextResponse.json({ status: "error", message: "Order not found" }, { status: 404 });
    }

    const customer = order.customers || {
      customer_name: "Walking Customer",
      mobile: "N/A",
      address_details: "Counter",
      previous_due_amount: "0",
    };

    // Calculate customer's previous orders due
    const prevOrdersDue = await prisma.orders.aggregate({
      where: {
        customer_id: order.customer_id,
        id: { not: order.id },
      },
      _sum: {
        due_amount: true,
      },
    });

    const actualPreviousDue =
      parseFloat(customer.previous_due_amount || "0") +
      Number(prevOrdersDue._sum.due_amount || 0);

    const latestPayment = order.order_payment_details?.[0];

    const details = order.order_details.map((d: any) => {
      const qty = parseFloat(d.quantity || "0");
      const price = parseFloat(d.selling_price || d.price || "0");
      let name = d.products?.product_name || "N/A";

      return {
        product_name: name,
        tile_size: d.products?.tile_size || null,
        grade: d.products?.grade || null,
        surface_finish: d.products?.surface_finish || null,
        sqft_per_box: d.products?.sqft_per_box ? parseFloat(d.products.sqft_per_box) : null,
        quantity: qty,
        price: price,
        total: price * qty,
      };
    });

    const rows = {
      id: Number(order.id),
      order_no: order.order_no,
      invoice_date: order.invoice_date
        ? new Date(order.invoice_date).toLocaleDateString("en-GB")
        : new Date(order.created_at).toLocaleDateString("en-GB"),
      order_note: order.order_note,
      sub_total: Number(order.sub_total || 0),
      discount_amount: Number(order.discount_amount || 0),
      delivery_charge: Number(order.delivery_charge || 0),
      return_adjustment_amount: Number(order.return_adjustment_amount || 0),
      paid_amount: Number(order.paid_amount || 0),
      due_amount: Number(order.due_amount || 0),
      previous_due_amount: actualPreviousDue,
      payment_method: latestPayment?.payment_method || "Cash",
      transaction_id: latestPayment?.transaction_id || null,
      customer: {
        customer_name: customer.customer_name,
        mobile: customer.mobile,
        address_details: customer.address_details || customer.address || "",
      },
      cashier: order.users?.name || "Admin",
      details,
    };

    return NextResponse.json({ status: "success", rows });
  } catch (error: any) {
    console.error("Print Receipt Error:", error);
    return NextResponse.json({ status: "error", message: error?.message }, { status: 500 });
  }
}
