import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Fetch single Challan for preview / thermal or A4 print (Read-only, no stock mutations)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ status: "fail", message: "Challan ID required" }, { status: 400 });
    }

    const challanId = BigInt(id);

    const challan = await prisma.challans.findUnique({
      where: { id: challanId },
      include: {
        orders: {
          select: {
            id: true,
            order_no: true,
            invoice_date: true,
            sub_total: true,
            paid_amount: true,
            due_amount: true,
            order_note: true,
          },
        },
        customers: {
          select: {
            id: true,
            customer_name: true,
            customer_id: true,
            mobile: true,
            address_details: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
          },
        },
        challan_items: {
          include: {
            products: {
              select: {
                tile_size: true,
                sqft_per_box: true,
                pcs_per_box: true,
                grade: true,
                surface_finish: true,
              },
            },
          },
        },
      },
    });

    if (!challan) {
      return NextResponse.json({ status: "fail", message: "Challan not found" }, { status: 404 });
    }

    const formatted = {
      id: Number(challan.id),
      challan_no: challan.challan_no,
      order_id: Number(challan.order_id),
      order_no: challan.orders?.order_no || `ORD-${challan.order_id}`,
      invoice_date: challan.orders?.invoice_date || null,
      challan_date: challan.challan_date,
      customer_id: Number(challan.customer_id),
      customer_name: challan.customers?.customer_name || "N/A",
      customer_code: challan.customers?.customer_id || "",
      customer_mobile: challan.customers?.mobile || "",
      customer_address: challan.customers?.address_details || "",
      delivery_address: challan.delivery_address || challan.customers?.address_details || "",
      driver_name: challan.driver_name || "",
      driver_phone: challan.driver_phone || "",
      vehicle_no: challan.vehicle_no || "",
      status: challan.status,
      note: challan.note,
      created_by: challan.users?.name || "System",
      created_at: challan.created_at,
      items: challan.challan_items.map((it) => ({
        id: Number(it.id),
        order_detail_id: it.order_detail_id ? Number(it.order_detail_id) : null,
        product_id: Number(it.product_id),
        product_name: it.product_name,
        product_code: it.product_code || "",
        quantity: Number(it.quantity),
        unit: it.unit || "Box",
        tile_size: it.products?.tile_size || null,
        sqft_per_box: it.products?.sqft_per_box ? Number(it.products.sqft_per_box) : null,
        pcs_per_box: it.products?.pcs_per_box || null,
        grade: it.products?.grade || null,
        surface_finish: it.products?.surface_finish || null,
      })),
      total_quantity: challan.challan_items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
    };

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Challan Detail Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load challan detail" },
      { status: 500 }
    );
  }
}
