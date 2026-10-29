import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET single subcategory
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const sub = await prisma.sub_categories.findUnique({
      where: { id: BigInt(id) },
      include: { categories: true },
    });

    if (!sub) {
      return NextResponse.json({ status: "fail", message: "Subcategory not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: Number(sub.id),
        sub_category_name: sub.sub_category_name,
        category_id: Number(sub.category_id),
        category_name: sub.categories?.category_name,
        status: sub.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

// PUT: Update subcategory
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { sub_category_name, category_id, status } = body;

    const data: any = {};
    if (sub_category_name) data.sub_category_name = sub_category_name.trim();
    if (category_id) data.category_id = BigInt(category_id);
    if (status) data.status = status;

    const updated = await prisma.sub_categories.update({
      where: { id: BigInt(id) },
      data,
      include: { categories: true },
    });

    return NextResponse.json({
      status: "success",
      message: "Subcategory updated successfully",
      data: {
        id: Number(updated.id),
        sub_category_name: updated.sub_category_name,
        category_id: Number(updated.category_id),
        category_name: updated.categories?.category_name,
        status: updated.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

// DELETE: Safe subcategory deletion (checks if products are linked)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subId = BigInt(id);

    const linkedCount = await prisma.products.count({
      where: { sub_category_id: subId },
    });

    if (linkedCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete subcategory. It is linked to ${linkedCount} active product(s). Please reassign them first or deactivate this subcategory.`,
        },
        { status: 400 }
      );
    }

    await prisma.sub_categories.delete({
      where: { id: subId },
    });

    return NextResponse.json({
      status: "success",
      message: "Subcategory deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
