import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Single Customer Profile with Invoices, Collections, Returns, and KPIs
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const custId = BigInt(id);

    const customer = await prisma.customers.findUnique({
      where: { id: custId },
      include: {
        orders: {
          orderBy: { id: "desc" },
          take: 50,
        },
        customer_payment_details: {
          orderBy: { id: "desc" },
          take: 50,
        },
        product_returns: {
          orderBy: { id: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ status: "fail", message: "Customer not found" }, { status: 404 });
    }

    const totalOrders = customer.orders.length;
    const totalOrderAmount = customer.orders.reduce((acc, o) => acc + (Number(o.sub_total) || 0), 0);
    const totalPaidAmount = customer.orders.reduce((acc, o) => acc + (Number(o.paid_amount) || 0), 0);
    const totalOrderDue = customer.orders.reduce((acc, o) => acc + (Number(o.due_amount) || 0), 0);
    const currentDue = parseFloat(customer.previous_due_amount || "0");

    return NextResponse.json({
      status: "success",
      data: {
        id: Number(customer.id),
        customer_id: customer.customer_id,
        customer_name: customer.customer_name,
        mobile: customer.mobile,
        email: customer.email,
        nid: customer.nid,
        address_details: customer.address_details,
        previous_due_amount: currentDue,
        created_at: customer.created_at,
        kpi: {
          total_orders: totalOrders,
          total_order_amount: totalOrderAmount,
          total_paid_amount: totalPaidAmount,
          total_order_due: totalOrderDue,
          current_due: currentDue,
        },
        orders: customer.orders.map((o) => ({
          id: Number(o.id),
          order_no: o.order_no,
          sub_total: Number(o.sub_total || 0),
          paid_amount: Number(o.paid_amount || 0),
          due_amount: Number(o.due_amount || 0),
          challan_status: o.challan_status,
          created_at: o.created_at,
        })),
        customer_payment_details: customer.customer_payment_details.map((cp) => ({
          id: Number(cp.id),
          paid_amount: parseFloat(cp.paid_amount || "0"),
          discount_amount: parseFloat(cp.discount_amount || "0"),
          due_amount: parseFloat(cp.due_amount || "0"),
          previous_due_amount: parseFloat(cp.previous_due_amount || "0"),
          due_collection_date: cp.due_collection_date,
          payment_method: cp.payment_method,
          transaction_id: cp.transaction_id,
          payment_status: cp.payment_status,
          created_at: cp.created_at,
        })),
        product_returns: customer.product_returns.map((pr) => ({
          id: Number(pr.id),
          order_id: Number(pr.order_id),
          amount: parseFloat(pr.amount || "0"),
          quantity: pr.quantity,
          date: pr.date,
          created_at: pr.created_at,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const custId = BigInt(id);
    const body = await req.json();

    const { customer_name, mobile, address_details, email, nid, previous_due_amount } = body;

    const updated = await prisma.customers.update({
      where: { id: custId },
      data: {
        customer_name: customer_name !== undefined ? customer_name.trim() : undefined,
        mobile: mobile !== undefined ? mobile.trim() : undefined,
        address_details: address_details !== undefined ? address_details.trim() : undefined,
        email: email !== undefined ? (email ? email.trim() : null) : undefined,
        nid: nid !== undefined ? (nid ? nid.trim() : null) : undefined,
        previous_due_amount:
          previous_due_amount !== undefined ? String(previous_due_amount) : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Customer updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        user_id: Number(updated.user_id),
        previous_due_amount: parseFloat(updated.previous_due_amount || "0"),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const custId = BigInt(id);

    // Check if customer has orders
    const orderCount = await prisma.orders.count({
      where: { customer_id: custId },
    });

    if (orderCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete customer with ${orderCount} associated sales orders.`,
        },
        { status: 400 }
      );
    }

    const dueCount = await prisma.customer_payment_details.count({
      where: { customer_id: custId },
    });

    if (dueCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete customer with ${dueCount} associated due collection records.`,
        },
        { status: 400 }
      );
    }

    await prisma.customers.delete({
      where: { id: custId },
    });

    return NextResponse.json({
      status: "success",
      message: "Customer deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
