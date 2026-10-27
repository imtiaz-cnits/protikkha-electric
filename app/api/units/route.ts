import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const units = await prisma.units.findMany({
      orderBy: { id: "desc" },
    });

    const serialized = units.map((u) => ({
      ...u,
      id: Number(u.id),
      user_id: Number(u.user_id),
    }));

    return NextResponse.json({
      status: "success",
      data: serialized,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load units" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { unit_name, status } = body;

    if (!unit_name || unit_name.trim() === "") {
      return NextResponse.json(
        { status: "fail", message: "Unit name is required" },
        { status: 400 }
      );
    }

    const unit = await prisma.units.create({
      data: {
        unit_name: unit_name.trim(),
        status: status || "active",
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Unit created successfully",
      data: {
        ...unit,
        id: Number(unit.id),
        user_id: Number(unit.user_id),
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create unit" },
      { status: 500 }
    );
  }
}
