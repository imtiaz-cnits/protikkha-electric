import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const limitParam = searchParams.get("limit");
    const limit = limitParam && limitParam !== "all" && !isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

    const balances = await prisma.opening_balances.findMany({
      orderBy: { date: "desc" },
      ...(limit ? { take: limit } : {}),
      include: {
        users: {
          select: { name: true },
        },
      },
    });

    const formatted = balances.map((b) => ({
      id: Number(b.id),
      amount: parseFloat(String(b.amount || 0)),
      date: b.date.toISOString().split("T")[0],
      note: b.note,
      creator: b.users.name,
    }));

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const { amount, date, note } = body;

    const opDate = date ? new Date(date) : new Date();

    const existing = await prisma.opening_balances.findFirst({
      where: {
        date: opDate,
        user_id: BigInt(userId),
      },
    });

    let savedRecord;
    if (existing) {
      savedRecord = await prisma.opening_balances.update({
        where: { id: existing.id },
        data: {
          amount: parseFloat(String(amount || 0)),
          note: note || null,
        },
      });
    } else {
      savedRecord = await prisma.opening_balances.create({
        data: {
          amount: parseFloat(String(amount || 0)),
          date: opDate,
          note: note || null,
          user_id: BigInt(userId),
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Opening balance saved successfully",
      data: {
        id: Number(savedRecord.id),
        amount: parseFloat(String(savedRecord.amount)),
        date: savedRecord.date.toISOString().split("T")[0],
        note: savedRecord.note,
      },
    });
  } catch (error: any) {
    console.error("Opening balance error:", error);
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
