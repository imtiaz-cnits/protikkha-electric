import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotId = BigInt(id);

    const quotation = await prisma.project_quotations.findUnique({
      where: { id: quotId },
      include: {
        quotation_items: {
          include: {
            products: {
              include: {
                electrical_specifications: true,
                packaging_conversions: true,
                units: true,
              },
            },
          },
        },
        orders: true,
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { status: "fail", message: "Quotation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: Number(quotation.id),
        quotation_no: quotation.quotation_no,
        project_name: quotation.project_name,
        client_name: quotation.client_name,
        client_phone: quotation.client_phone,
        client_address: quotation.client_address,
        contractor_name: quotation.contractor_name,
        contractor_phone: quotation.contractor_phone,
        commission_percent: parseFloat(String(quotation.commission_percent || 0)),
        commission_amount: parseFloat(String(quotation.commission_amount || 0)),
        subtotal: parseFloat(String(quotation.subtotal || 0)),
        discount_amount: parseFloat(String(quotation.discount_amount || 0)),
        estimated_total: parseFloat(String(quotation.estimated_total || 0)),
        status: quotation.status,
        validity_days: quotation.validity_days,
        expiry_date: quotation.expiry_date
          ? new Date(quotation.expiry_date).toISOString().split("T")[0]
          : null,
        order_id: quotation.order_id ? Number(quotation.order_id) : null,
        order_no: quotation.orders?.order_no || null,
        note: quotation.note,
        created_at: quotation.created_at,
        items: quotation.quotation_items.map((it) => ({
          id: Number(it.id),
          product_id: Number(it.product_id),
          item_name: it.item_name,
          packaging_unit: it.packaging_unit || "Piece",
          quantity: parseFloat(String(it.quantity || 0)),
          unit_price: parseFloat(String(it.unit_price || 0)),
          total_price: parseFloat(String(it.total_price || 0)),
          spec_notes: it.spec_notes,
          spec: it.products?.electrical_specifications,
        })),
      },
    });
  } catch (error: any) {
    console.error("Quotation Detail GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load quotation" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const { id } = await params;
    const quotId = BigInt(id);

    const body = await req.json();
    const { status, note } = body;

    const updated = await prisma.project_quotations.update({
      where: { id: quotId },
      data: {
        ...(status ? { status } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });

    return NextResponse.json({
      status: "success",
      message: `Quotation status updated to ${updated.status}`,
      data: {
        id: Number(updated.id),
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error("Quotation PATCH Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to update quotation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const { id } = await params;
    const quotId = BigInt(id);

    const quot = await prisma.project_quotations.findUnique({
      where: { id: quotId },
    });

    if (!quot) {
      return NextResponse.json(
        { status: "fail", message: "Quotation not found" },
        { status: 404 }
      );
    }

    if (quot.status === "CONVERTED_TO_ORDER") {
      return NextResponse.json(
        { status: "fail", message: "Cannot delete quotation that was converted to an order" },
        { status: 400 }
      );
    }

    await prisma.project_quotations.delete({
      where: { id: quotId },
    });

    return NextResponse.json({
      status: "success",
      message: "Quotation deleted successfully",
    });
  } catch (error: any) {
    console.error("Quotation DELETE Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to delete quotation" },
      { status: 500 }
    );
  }
}
