import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Expenses List with Date & Category Filtering (Latest First, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const typeId = searchParams.get("type_id");
    const staffId = searchParams.get("staff_id");
    const fromDate = searchParams.get("from_date");
    const toDate = searchParams.get("to_date");
    const limitParam = searchParams.get("limit");
    const limit = limitParam && limitParam !== "all" && !isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

    const where: any = {};
    if (typeId) where.expense_type_id = BigInt(typeId);
    if (staffId) where.staff_id = BigInt(staffId);
    if (fromDate && toDate) {
      where.date = {
        gte: fromDate,
        lte: toDate,
      };
    } else if (fromDate) {
      where.date = { gte: fromDate };
    } else if (toDate) {
      where.date = { lte: toDate };
    }

    const expenses = await prisma.expenses.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      orderBy: { id: "desc" },
      include: {
        expense_types: true,
        users_expenses_staff_idTousers: {
          select: {
            id: true,
            name: true,
            mobile: true,
            role: true,
          },
        },
        users_expenses_user_idTousers: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let totalAmount = 0;
    let todayAmount = 0;
    let thisMonthAmount = 0;

    let formatted = expenses.map((e) => {
      const amount = parseFloat(String(e.expense_amount || 0));
      totalAmount += amount;

      if (e.date === todayStr) {
        todayAmount += amount;
      }
      if (e.date && e.date.startsWith(thisMonthStr)) {
        thisMonthAmount += amount;
      }

      return {
        id: Number(e.id),
        expense_type_id: Number(e.expense_type_id),
        type_name: e.expense_types?.type_name || "General Expense",
        staff_id: e.staff_id ? Number(e.staff_id) : null,
        staff_name: e.users_expenses_staff_idTousers?.name || null,
        staff_role: e.users_expenses_staff_idTousers?.role || null,
        expense_amount: amount,
        expense_details: e.expense_details || "",
        date: e.date,
        creator: e.users_expenses_user_idTousers?.name || "Admin",
        created_at: e.created_at,
      };
    });

    if (search) {
      formatted = formatted.filter(
        (e) =>
          e.type_name.toLowerCase().includes(search) ||
          (e.expense_details && e.expense_details.toLowerCase().includes(search)) ||
          (e.staff_name && e.staff_name.toLowerCase().includes(search)) ||
          e.date.includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      summary: {
        total_amount: totalAmount,
        today_amount: todayAmount,
        this_month_amount: thisMonthAmount,
        total_records: expenses.length,
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Expenses GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load expenses" },
      { status: 500 }
    );
  }
}

// POST: Record New Expense
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const { expense_type_id, staff_id, expense_amount, expense_details, date } = body;

    if (!expense_type_id || !expense_amount) {
      return NextResponse.json(
        { status: "fail", message: "Expense category and amount are required!" },
        { status: 400 }
      );
    }

    const expDate = date || new Date().toISOString().split("T")[0];

    const newExpense = await prisma.expenses.create({
      data: {
        expense_type_id: BigInt(expense_type_id),
        staff_id: staff_id ? BigInt(staff_id) : null,
        expense_amount: parseFloat(String(expense_amount)),
        expense_details: expense_details ? String(expense_details).trim() : null,
        date: expDate,
        user_id: BigInt(userId),
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense recorded successfully",
      data: {
        ...newExpense,
        id: Number(newExpense.id),
        expense_type_id: Number(newExpense.expense_type_id),
        staff_id: newExpense.staff_id ? Number(newExpense.staff_id) : null,
        user_id: Number(newExpense.user_id),
        expense_amount: parseFloat(String(newExpense.expense_amount)),
      },
    });

  } catch (error: any) {
    console.error("Expense Record Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to record expense" },
      { status: 500 }
    );
  }
}
