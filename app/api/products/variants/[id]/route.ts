import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      variant_name,
      sku,
      barcode,
      cost_price,
      sell_price,
      wholesale_price,
      stock_quantity,
      status,
      attributes,
    } = body;

    const data: any = {};
    if (variant_name) data.variant_name = variant_name.trim();
    if (sku) data.sku = sku.trim();
    if (barcode) data.barcode = barcode.trim();
    if (cost_price !== undefined) data.cost_price = String(cost_price);
    if (sell_price !== undefined) data.sell_price = String(sell_price);
    if (wholesale_price !== undefined) data.wholesale_price = String(wholesale_price);
    if (stock_quantity !== undefined) data.stock_quantity = String(stock_quantity);
    if (status) data.status = status;
    if (attributes) data.attributes = attributes;

    const updated = await prisma.product_variants.update({
      where: { id: BigInt(id) },
      data,
    });

    return NextResponse.json({
      status: "success",
      message: "Variant updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        product_id: Number(updated.product_id),
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
    await prisma.product_variants.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({
      status: "success",
      message: "Variant deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
