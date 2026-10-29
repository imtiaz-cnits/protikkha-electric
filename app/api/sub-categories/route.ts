import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Subcategories (Newest first, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const where: any = {};
    if (categoryId && categoryId !== "all") {
      where.category_id = BigInt(categoryId);
    }

    const subcategories = await prisma.sub_categories.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        categories: true,
        _count: {
          select: { products: true },
        },
      },
    });

    let formatted = subcategories.map((s) => ({
      id: Number(s.id),
      sub_category_name: s.sub_category_name,
      status: s.status,
      category_id: Number(s.category_id),
      category_name: s.categories?.category_name || "Unassigned",
      product_count: s._count?.products || 0,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    if (search) {
      formatted = formatted.filter(
        (s) =>
          s.sub_category_name.toLowerCase().includes(search) ||
          s.category_name.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Subcategories GET error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load subcategories" },
      { status: 500 }
    );
  }
}

// POST: Create Subcategory
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { sub_category_name, category_id, status } = body;

    if (!sub_category_name || !sub_category_name.trim()) {
      return NextResponse.json(
        { status: "fail", message: "Subcategory name is required" },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { status: "fail", message: "Parent category selection is required" },
        { status: 400 }
      );
    }

    const subcategory = await prisma.sub_categories.create({
      data: {
        sub_category_name: sub_category_name.trim(),
        category_id: BigInt(category_id),
        status: status || "active",
        user_id: BigInt(userId),
      },
      include: {
        categories: true,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Subcategory created successfully",
      data: {
        id: Number(subcategory.id),
        sub_category_name: subcategory.sub_category_name,
        category_id: Number(subcategory.category_id),
        category_name: subcategory.categories?.category_name,
        status: subcategory.status,
      },
    });
  } catch (error: any) {
    console.error("Subcategory Create error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create subcategory" },
      { status: 500 }
    );
  }
}
