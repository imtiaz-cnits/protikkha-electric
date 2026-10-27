import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { category_name, img_url, status } = body;

    const updated = await prisma.categories.update({
      where: { id: BigInt(id) },
      data: {
        category_name: category_name ? category_name.trim() : undefined,
        img_url: img_url !== undefined ? img_url : undefined,
        status: status || undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Category updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        user_id: Number(updated.user_id),
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const catId = BigInt(id);

    const prodCount = await prisma.products.count({
      where: { category_id: catId },
    });

    if (prodCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete category because it contains ${prodCount} product(s). Please reassign or remove the products first.`,
        },
        { status: 400 }
      );
    }

    await prisma.categories.delete({
      where: { id: catId },
    });

    return NextResponse.json({
      status: "success",
      message: "Category deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to delete category" },
      { status: 500 }
    );
  }
}
