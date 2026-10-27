import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isTilesCategoryName } from "@/lib/challan-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ status: "fail", message: "Invoice ID required" }, { status: 400 });
    }

    const orderId = BigInt(id);

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        customers: true,
        order_details: {
          include: {
            products: {
              include: {
                categories: true,
                units: true,
              },
            },
          },
        },
        challans: true,
      },
    });

    if (!order) {
      return NextResponse.json({ status: "fail", message: "Invoice not found" }, { status: 404 });
    }

    // Check line items
    const tilesLines = order.order_details.filter((line) =>
      isTilesCategoryName(line.products?.categories?.category_name)
    );

    const pendingTilesLines = tilesLines.filter(
      (line) => line.stock_lifecycle_state === "PENDING_CHALLAN"
    );

    const existingChallan = order.challans;

    let isEligible = false;
    let reason = "";

    if (existingChallan) {
      isEligible = false;
      reason = `Challan already issued (${existingChallan.challan_no})`;
    } else if (order.challan_status === "DELIVERED") {
      isEligible = false;
      reason = "Invoice delivery already completed (Legacy or Fulfilled)";
    } else if (tilesLines.length === 0) {
      isEligible = false;
      reason = "No Tiles items in this invoice (Challan not required)";
    } else if (pendingTilesLines.length > 0) {
      isEligible = true;
      reason = "Ready to generate delivery Challan";
    } else {
      isEligible = false;
      reason = "All lines already fulfilled or deducted";
    }

    return NextResponse.json({
      status: "success",
      data: {
        order_id: Number(order.id),
        order_no: order.order_no,
        invoice_date: order.invoice_date,
        sub_total: Number(order.sub_total || 0),
        paid_amount: Number(order.paid_amount || 0),
        due_amount: Number(order.due_amount || 0),
        challan_status: order.challan_status,
        customer: {
          id: order.customers?.id ? Number(order.customers.id) : null,
          name: order.customers?.customer_name || "Walking Customer",
          mobile: order.customers?.mobile || "",
          address: order.customers?.address_details || "",
        },
        is_eligible: isEligible,
        eligibility_reason: reason,
        has_existing_challan: !!existingChallan,
        existing_challan: existingChallan
          ? {
              id: Number(existingChallan.id),
              challan_no: existingChallan.challan_no,
              challan_date: existingChallan.challan_date,
              status: existingChallan.status,
            }
          : null,
        tiles_items: pendingTilesLines.map((line) => ({
          order_detail_id: Number(line.id),
          product_id: Number(line.product_id),
          product_name: line.products.product_name,
          quantity: Number(line.quantity),
          unit: line.products.units?.unit_name || "Box",
          tile_size: line.products.tile_size || null,
          sqft_per_box: line.products.sqft_per_box ? Number(line.products.sqft_per_box) : null,
          pcs_per_box: line.products.pcs_per_box || null,
          grade: line.products.grade || null,
          surface_finish: line.products.surface_finish || null,
          stock_lifecycle_state: line.stock_lifecycle_state,
        })),
      },
    });
  } catch (error: any) {
    console.error("Eligible Invoice Check Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Eligibility check failed" },
      { status: 500 }
    );
  }
}
