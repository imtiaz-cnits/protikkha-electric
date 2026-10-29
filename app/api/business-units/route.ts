import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    let units = await prisma.business_units.findMany({
      orderBy: { id: "asc" },
    });

    if (units.length === 0) {
      const firstUser = await prisma.users.findFirst({ select: { id: true } });
      const userId = firstUser?.id || BigInt(1);

      // Seed default electrical showroom and warehouse if empty
      const mainStore = await prisma.business_units.create({
        data: {
          name: "Protikkha Electric (Main Showroom)",
          code: "PE-MAIN",
          status: "active",
          user_id: userId,
        },
      });
      const warehouse = await prisma.business_units.create({
        data: {
          name: "Protikkha Central Warehouse",
          code: "PE-WH01",
          status: "active",
          user_id: userId,
        },
      });
      units = [mainStore, warehouse];
    }

    const formatted = units.map((u) => ({
      id: Number(u.id),
      name: u.name,
      code: u.code,
      status: u.status,
    }));

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Error loading business units:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to fetch stores" },
      { status: 500 }
    );
  }
}
