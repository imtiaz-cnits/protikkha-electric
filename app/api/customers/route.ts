import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Customers (Newest first, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const customers = await prisma.customers.findMany({
      orderBy: { id: "desc" },
    });

    let formatted = customers.map((c) => ({
      ...c,
      id: Number(c.id),
      user_id: Number(c.user_id),
      previous_due_amount: parseFloat(c.previous_due_amount || "0"),
    }));

    if (search) {
      formatted = formatted.filter(
        (c) =>
          c.customer_name.toLowerCase().includes(search) ||
          c.mobile.includes(search) ||
          c.customer_id.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load customers" },
      { status: 500 }
    );
  }
}

// POST: Create Customer (Auto generate CUST-XXXX)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const { customer_name, mobile, address_details, email, nid, previous_due_amount } = body;

    if (!customer_name || !mobile) {
      return NextResponse.json(
        { status: "fail", message: "Customer name and mobile number are required" },
        { status: 400 }
      );
    }

    // Auto-generate customer ID: CUST-XXXX
    const lastCustomer = await prisma.customers.findFirst({
      orderBy: { id: "desc" },
      select: { id: true, customer_id: true },
    });

    let nextNumber = 1;
    if (lastCustomer && lastCustomer.customer_id) {
      const match = lastCustomer.customer_id.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      } else {
        nextNumber = Number(lastCustomer.id) + 1;
      }
    }

    const generatedCustomerId = `CUST-${String(nextNumber).padStart(4, "0")}`;

    const newCustomer = await prisma.customers.create({
      data: {
        customer_id: generatedCustomerId,
        customer_name: customer_name.trim(),
        mobile: mobile.trim(),
        address_details: address_details || null,
        email: email || null,
        nid: nid || null,
        previous_due_amount: String(previous_due_amount || "0"),
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Customer created successfully",
      customer: {
        ...newCustomer,
        id: Number(newCustomer.id),
        user_id: Number(newCustomer.user_id),
        previous_due_amount: parseFloat(newCustomer.previous_due_amount || "0"),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create customer" },
      { status: 500 }
    );
  }
}
