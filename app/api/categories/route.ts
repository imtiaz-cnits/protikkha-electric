import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Categories (Newest first, Rule 4.1)
export async function GET() {
  try {
    const categories = await prisma.categories.findMany({
      orderBy: { id: "desc" },
    });

    const serialized = categories.map((c) => ({
      ...c,
      id: Number(c.id),
      user_id: Number(c.user_id),
    }));

    return NextResponse.json({
      status: "success",
      data: serialized,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load categories" },
      { status: 500 }
    );
  }
}

// POST: Create Category
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { category_name, img_url, status } = body;

    if (!category_name || category_name.trim() === "") {
      return NextResponse.json(
        { status: "fail", message: "Category name is required" },
        { status: 400 }
      );
    }

    const category = await prisma.categories.create({
      data: {
        category_name: category_name.trim(),
        img_url: img_url || null,
        status: status || "active",
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Category created successfully",
      data: {
        ...category,
        id: Number(category.id),
        user_id: Number(category.user_id),
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create category" },
      { status: 500 }
    );
  }
}
