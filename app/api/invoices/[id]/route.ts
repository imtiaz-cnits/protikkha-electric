import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = BigInt(id);

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        customers: true,
        order_details: {
          include: {
            products: {
              include: {
                units: true,
                categories: true,
              },
            },
          },
        },
        order_payment_details: true,
        challans: {
          select: {
            id: true,
            challan_no: true,
            challan_date: true,
            status: true,
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ status: "fail", message: "Invoice not found" }, { status: 404 });
    }

    const subTotal = Number(order.sub_total || 0);
    const delivery = Number(order.delivery_charge || 0);
    const discount = Number(order.discount_amount || 0);
    const returnAdj = Number(order.return_adjustment_amount || 0);
    const netPayable = Math.max(0, subTotal + delivery - (discount + returnAdj));
    const paid = Number(order.paid_amount || 0);
    const due = Number(order.due_amount || 0);

    return NextResponse.json({
      status: "success",
      data: {
        id: Number(order.id),
        order_no: order.order_no,
        invoice_date: order.invoice_date ? order.invoice_date.toISOString().split("T")[0] : null,
        created_at: order.created_at,
        order_note: order.order_note,
        sub_total: subTotal,
        delivery_charge: delivery,
        discount_amount: discount,
        return_adjustment_amount: returnAdj,
        net_payable: netPayable,
        paid_amount: paid,
        due_amount: due,
        previous_due_amount: Number(order.previous_due_amount || 0),
        challan_status: order.challan_status || "NOT_REQUIRED",
        has_pending_tiles: order.order_details.some(
          (d) => d.stock_lifecycle_state === "PENDING_CHALLAN"
        ),
        has_challan: !!order.challans,
        has_tiles:
          order.challan_status !== "NOT_REQUIRED" ||
          !!order.challans ||
          order.order_details.some(
            (d) =>
              d.stock_lifecycle_state === "PENDING_CHALLAN" ||
              d.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN" ||
              Boolean(d.products?.tile_size) ||
              Boolean(d.products?.sqft_per_box) ||
              (d.products?.product_name && d.products.product_name.toLowerCase().includes("tile")) ||
              (d.products?.categories?.category_name &&
                d.products.categories.category_name.toLowerCase().includes("tile"))
          ),
        challan: order.challans
          ? {
              id: Number(order.challans.id),
              challan_no: order.challans.challan_no,
              challan_date: order.challans.challan_date,
              status: order.challans.status,
            }
          : null,
        cashier: order.users?.name || "Admin",
        customer: order.customers
          ? {
              id: Number(order.customers.id),
              customer_id: order.customers.customer_id,
              customer_name: order.customers.customer_name,
              mobile: order.customers.mobile,
              address_details: order.customers.address_details,
              previous_due_amount: parseFloat(order.customers.previous_due_amount || "0"),
            }
          : null,
        details: order.order_details.map((d) => ({
          id: Number(d.id),
          product_id: Number(d.product_id),
          product_name: d.products?.product_name || "N/A",
          tile_size: d.products?.tile_size || null,
          sqft_per_box: d.products?.sqft_per_box ? parseFloat(d.products.sqft_per_box) : null,
          pcs_per_box: d.products?.pcs_per_box ? parseInt(d.products.pcs_per_box) : null,
          grade: d.products?.grade || null,
          category: d.products?.categories?.category_name || null,
          quantity: parseFloat(d.quantity || "0"),
          price: parseFloat(d.price || "0"),
          selling_price: parseFloat(d.selling_price || "0"),
          unit: d.products?.units?.unit_name || "Pcs",
          line_total: parseFloat(d.selling_price || "0") * parseFloat(d.quantity || "0"),
        })),
        payments: order.order_payment_details.map((pm) => ({
          id: Number(pm.id),
          paid_amount: Number(pm.paid_amount || 0),
          payment_method: pm.payment_method || "Cash",
          payment_status: pm.payment_status || "Paid",
          transaction_id: pm.transaction_id,
          date: pm.due_collection_date,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
