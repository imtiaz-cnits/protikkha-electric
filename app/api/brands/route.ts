import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Brands (Newest first, Rule 4.1)
export async function GET() {
  try {
    const brands = await prisma.brands.findMany({
      orderBy: { id: "desc" },
    });

    const serialized = brands.map((b) => ({
      ...b,
      id: Number(b.id),
      user_id: Number(b.user_id),
    }));

    return NextResponse.json({
      status: "success",
      data: serialized,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load brands" },
      { status: 500 }
    );
  }
}

// POST: Create Brand
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { name, logo, status } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { status: "fail", message: "Brand name is required" },
        { status: 400 }
      );
    }

    const brand = await prisma.brands.create({
      data: {
        name: name.trim(),
        logo: logo || null,
        status: status || "active",
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Brand created successfully",
      data: {
        ...brand,
        id: Number(brand.id),
        user_id: Number(brand.user_id),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create brand" },
      { status: 500 }
    );
  }
}
