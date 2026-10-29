import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/warranty
 * List all warranty records with search, status filtering, and expiration calculation (Latest first)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status"); // ACTIVE, EXPIRED, CLAIMED, REPLACED

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { serial_number: { contains: search } },
        { products: { product_name: { contains: search } } },
        { customers: { customer_name: { contains: search } } },
        { customers: { mobile: { contains: search } } },
        { orders: { order_no: { contains: search } } },
      ];
    }

    const records = await prisma.warranty_records.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        products: {
          select: {
            id: true,
            product_name: true,
            product_code: true,
            electrical_specifications: true,
          },
        },
        orders: {
          select: {
            id: true,
            order_no: true,
            invoice_date: true,
          },
        },
        customers: {
          select: {
            id: true,
            customer_name: true,
            mobile: true,
            address_details: true,
          },
        },
      },
    });

    const now = new Date();

    const formatted = records.map((w) => {
      const isPast = new Date(w.expiry_date) < now;
      let computedStatus = w.status;
      if (w.status === "ACTIVE" && isPast) {
        computedStatus = "EXPIRED";
      }

      const daysRemaining = Math.ceil(
        (new Date(w.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        id: Number(w.id),
        serial_number: w.serial_number,
        product_id: Number(w.product_id),
        product_name: w.products?.product_name || "Electrical Product",
        spec_type: w.products?.electrical_specifications?.spec_type || "GENERAL",
        order_id: w.order_id ? Number(w.order_id) : null,
        order_no: w.orders?.order_no || null,
        customer_id: w.customer_id ? Number(w.customer_id) : null,
        customer_name: w.customers?.customer_name || "Walk-in Customer",
        customer_mobile: w.customers?.mobile || "N/A",
        purchase_date: w.purchase_date ? new Date(w.purchase_date).toISOString().split("T")[0] : null,
        warranty_months: w.warranty_months,
        expiry_date: new Date(w.expiry_date).toISOString().split("T")[0],
        status: computedStatus,
        days_remaining: daysRemaining,
        is_expired: isPast,
        notes: w.notes,
        created_at: w.created_at,
      };
    });

    const activeCount = formatted.filter((f) => f.status === "ACTIVE").length;
    const expiredCount = formatted.filter((f) => f.status === "EXPIRED").length;
    const claimedCount = formatted.filter((f) => f.status === "CLAIMED" || f.status === "REPLACED").length;

    return NextResponse.json({
      status: "success",
      summary: {
        total_records: formatted.length,
        active_count: activeCount,
        expired_count: expiredCount,
        claimed_count: claimedCount,
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Warranty GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load warranty records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/warranty
 * Register a new electrical product warranty card / serial record
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const {
      product_id,
      serial_number,
      order_id,
      customer_id,
      purchase_date,
      warranty_months = 12,
      notes,
    } = body;

    if (!product_id || !serial_number) {
      return NextResponse.json(
        { status: "fail", message: "Product and unique Serial Number are required" },
        { status: 400 }
      );
    }

    const cleanSerial = String(serial_number).trim().toUpperCase();

    // Check duplicate serial number
    const existing = await prisma.warranty_records.findUnique({
      where: { serial_number: cleanSerial },
    });
    if (existing) {
      return NextResponse.json(
        { status: "fail", message: `Warranty serial '${cleanSerial}' is already registered!` },
        { status: 409 }
      );
    }

    const purDate = purchase_date ? new Date(purchase_date) : new Date();
    const months = parseInt(String(warranty_months || "12"), 10);

    const expiryDate = new Date(purDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);

    const newRecord = await prisma.warranty_records.create({
      data: {
        product_id: BigInt(product_id),
        serial_number: cleanSerial,
        order_id: order_id ? BigInt(order_id) : null,
        customer_id: customer_id ? BigInt(customer_id) : null,
        purchase_date: purDate,
        warranty_months: months,
        expiry_date: expiryDate,
        status: "ACTIVE",
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        products: { select: { product_name: true } },
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Warranty card successfully registered!",
      data: {
        id: Number(newRecord.id),
        serial_number: newRecord.serial_number,
        product_name: newRecord.products?.product_name,
        expiry_date: newRecord.expiry_date.toISOString().split("T")[0],
        status: newRecord.status,
      },
    });
  } catch (error: any) {
    console.error("Warranty POST Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to register warranty" },
      { status: 500 }
    );
  }
}
