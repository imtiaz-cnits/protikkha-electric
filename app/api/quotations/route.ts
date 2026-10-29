import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function generateQuotationNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `QUOT-${dateStr}-${randomSuffix}`;
}

/**
 * GET /api/quotations
 * List all project quotations (Latest first, Rule 7.1)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { quotation_no: { contains: search } },
        { project_name: { contains: search } },
        { client_name: { contains: search } },
        { client_phone: { contains: search } },
        { contractor_name: { contains: search } },
      ];
    }

    const quotations = await prisma.project_quotations.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        quotation_items: {
          include: {
            products: {
              select: {
                id: true,
                product_name: true,
                product_code: true,
                electrical_specifications: true,
              },
            },
          },
        },
        orders: {
          select: {
            id: true,
            order_no: true,
          },
        },
      },
    });

    const formatted = quotations.map((q) => {
      return {
        id: Number(q.id),
        quotation_no: q.quotation_no,
        project_name: q.project_name,
        client_name: q.client_name,
        client_phone: q.client_phone || "N/A",
        client_address: q.client_address || "",
        contractor_name: q.contractor_name || "Self",
        contractor_phone: q.contractor_phone || "",
        commission_percent: parseFloat(String(q.commission_percent || 0)),
        commission_amount: parseFloat(String(q.commission_amount || 0)),
        subtotal: parseFloat(String(q.subtotal || 0)),
        discount_amount: parseFloat(String(q.discount_amount || 0)),
        estimated_total: parseFloat(String(q.estimated_total || 0)),
        status: q.status,
        validity_days: q.validity_days,
        expiry_date: q.expiry_date ? new Date(q.expiry_date).toISOString().split("T")[0] : null,
        order_id: q.order_id ? Number(q.order_id) : null,
        order_no: q.orders?.order_no || null,
        total_items: q.quotation_items.length,
        note: q.note,
        created_at: q.created_at,
        items: q.quotation_items.map((it) => ({
          id: Number(it.id),
          product_id: Number(it.product_id),
          product_name: it.item_name,
          packaging_unit: it.packaging_unit || "Piece",
          quantity: parseFloat(String(it.quantity || 0)),
          unit_price: parseFloat(String(it.unit_price || 0)),
          total_price: parseFloat(String(it.total_price || 0)),
          spec_notes: it.spec_notes || "",
        })),
      };
    });

    const totalEstimated = formatted.reduce((sum, q) => sum + q.estimated_total, 0);
    const approvedCount = formatted.filter((q) => q.status === "APPROVED" || q.status === "CONVERTED_TO_ORDER").length;
    const draftCount = formatted.filter((q) => q.status === "DRAFT" || q.status === "SENT").length;

    return NextResponse.json({
      status: "success",
      summary: {
        total_quotations: formatted.length,
        total_estimated_amount: totalEstimated,
        approved_count: approvedCount,
        draft_count: draftCount,
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Quotations GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load quotations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/quotations
 * Create a new electrical project estimation / quotation
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const {
      project_name,
      client_name,
      client_phone,
      client_address,
      contractor_name,
      contractor_phone,
      commission_percent = 0,
      discount_amount = 0,
      validity_days = 15,
      note,
      items, // array of { product_id, item_name, packaging_unit, quantity, unit_price, spec_notes }
    } = body;

    if (!project_name || !client_name) {
      return NextResponse.json(
        { status: "fail", message: "Project title and client name are required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Please add at least one quotation line item" },
        { status: 400 }
      );
    }

    const quotNumber = generateQuotationNumber();
    const valDays = parseInt(String(validity_days || "15"), 10);
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + valDays);

    let subtotal = 0;
    const processedItems = items.map((it: any) => {
      const qty = parseFloat(String(it.quantity || "0"));
      const price = parseFloat(String(it.unit_price || "0"));
      const lineTotal = Math.round(qty * price * 100) / 100;
      subtotal += lineTotal;

      return {
        product_id: BigInt(it.product_id),
        item_name: String(it.item_name || "Electrical Item"),
        packaging_unit: it.packaging_unit || "Piece",
        quantity: qty,
        unit_price: price,
        total_price: lineTotal,
        spec_notes: it.spec_notes ? String(it.spec_notes).trim() : null,
      };
    });

    const disc = parseFloat(String(discount_amount || "0"));
    const estimatedTotal = Math.max(0, Math.round((subtotal - disc) * 100) / 100);

    const commPct = parseFloat(String(commission_percent || "0"));
    const commissionAmount = Math.round(((subtotal * commPct) / 100) * 100) / 100;

    const result = await prisma.project_quotations.create({
      data: {
        quotation_no: quotNumber,
        project_name: String(project_name).trim(),
        client_name: String(client_name).trim(),
        client_phone: client_phone ? String(client_phone).trim() : null,
        client_address: client_address ? String(client_address).trim() : null,
        contractor_name: contractor_name ? String(contractor_name).trim() : null,
        contractor_phone: contractor_phone ? String(contractor_phone).trim() : null,
        commission_percent: commPct,
        commission_amount: commissionAmount,
        subtotal: subtotal,
        discount_amount: disc,
        estimated_total: estimatedTotal,
        status: "DRAFT",
        validity_days: valDays,
        expiry_date: expiryDate,
        note: note ? String(note).trim() : null,
        user_id: BigInt(userId),
        quotation_items: {
          create: processedItems,
        },
      },
    });

    return NextResponse.json({
      status: "success",
      message: `Project quotation ${result.quotation_no} created successfully!`,
      data: {
        id: Number(result.id),
        quotation_no: result.quotation_no,
        estimated_total: estimatedTotal,
        commission_amount: commissionAmount,
      },
    });
  } catch (error: any) {
    console.error("Quotation POST Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create quotation" },
      { status: 500 }
    );
  }
}
