import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.products.findUnique({
      where: { id: BigInt(id) },
      include: {
        categories: true,
        brands: true,
        units: true,
        sub_categories: true,
      },
    });

    if (!product) {
      return NextResponse.json({ status: "fail", message: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      data: {
        ...product,
        id: Number(product.id),
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
    const body = await req.json();

    const updated = await prisma.products.update({
      where: { id: BigInt(id) },
      data: {
        product_name: body.product_name ? body.product_name.trim() : undefined,
        product_code: body.product_code !== undefined ? body.product_code : undefined,
        cost_price: body.cost_price !== undefined ? String(body.cost_price) : undefined,
        sell_price: body.sell_price !== undefined ? String(body.sell_price) : undefined,
        quantity: body.quantity !== undefined ? String(body.quantity) : undefined,
        tile_size: body.tile_size !== undefined ? (body.tile_size ? String(body.tile_size).trim() : null) : undefined,
        sqft_per_box: body.sqft_per_box !== undefined ? (body.sqft_per_box ? String(body.sqft_per_box).trim() : null) : undefined,
        pcs_per_box: body.pcs_per_box !== undefined ? (body.pcs_per_box ? String(body.pcs_per_box).trim() : null) : undefined,
        grade: body.grade !== undefined ? (body.grade ? String(body.grade).trim() : null) : undefined,
        surface_finish: body.surface_finish !== undefined ? (body.surface_finish ? String(body.surface_finish).trim() : null) : undefined,
        brand_id: body.brand_id ? BigInt(body.brand_id) : undefined,
        category_id: body.category_id ? BigInt(body.category_id) : undefined,
        sub_category_id: body.sub_category_id ? BigInt(body.sub_category_id) : undefined,
        unit_id: body.unit_id ? BigInt(body.unit_id) : undefined,
        img_url: body.img_url !== undefined ? body.img_url : undefined,
        status: body.status !== undefined ? body.status : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Product updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        brand_id: Number(updated.brand_id),
        category_id: Number(updated.category_id),
        sub_category_id: updated.sub_category_id ? Number(updated.sub_category_id) : null,
        unit_id: updated.unit_id ? Number(updated.unit_id) : null,
        user_id: Number(updated.user_id),
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
    const prodId = BigInt(id);

    const [orderCount, purchaseCount, returnCount, challanCount] = await Promise.all([
      prisma.order_details.count({ where: { product_id: prodId } }),
      prisma.purchase_order_details.count({ where: { product_id: prodId } }),
      prisma.product_returns.count({ where: { product_id: prodId } }),
      prisma.challan_items.count({ where: { product_id: prodId } }),
    ]);

    if (orderCount > 0 || purchaseCount > 0 || returnCount > 0 || challanCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete product because it has transaction history (${orderCount} sales, ${purchaseCount} purchases, ${returnCount} returns, ${challanCount} challans).`,
        },
        { status: 400 }
      );
    }

    await prisma.products.delete({
      where: { id: prodId },
    });

    return NextResponse.json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message || "Failed to delete product" }, { status: 500 });
  }
}
