import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Expense Types (Rule 4.1: id desc)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const types = await prisma.expense_types.findMany({
      orderBy: { id: "desc" },
      include: {
        expenses: {
          select: {
            id: true,
            expense_amount: true,
          },
        },
      },
    });

    let formatted = types.map((t) => {
      const totalAmount = t.expenses.reduce(
        (sum, e) => sum + parseFloat(String(e.expense_amount || 0)),
        0
      );

      return {
        id: Number(t.id),
        type_name: t.type_name,
        status: t.status,
        total_records: t.expenses.length,
        total_amount: totalAmount,
        created_at: t.created_at,
      };
    });

    if (search) {
      formatted = formatted.filter((t) => t.type_name.toLowerCase().includes(search));
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Expense Types GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load expense types" },
      { status: 500 }
    );
  }
}

// POST: Create Expense Type
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const { type_name, status } = body;

    if (!type_name || !type_name.trim()) {
      return NextResponse.json(
        { status: "fail", message: "Expense type name is required!" },
        { status: 400 }
      );
    }

    const created = await prisma.expense_types.create({
      data: {
        type_name: type_name.trim(),
        status: status || "Active",
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense type created successfully",
      data: {
        ...created,
        id: Number(created.id),
        user_id: Number(created.user_id),
      },
    });

  } catch (error: any) {
    console.error("Expense Type Create Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create expense type" },
      { status: 500 }
    );
  }
}
