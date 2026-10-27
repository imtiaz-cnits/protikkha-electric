import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenseId = BigInt(id);
    const body = await req.json();

    const { expense_type_id, staff_id, expense_amount, expense_details, date } = body;

    const updated = await prisma.expenses.update({
      where: { id: expenseId },
      data: {
        expense_type_id: expense_type_id ? BigInt(expense_type_id) : undefined,
        staff_id: staff_id !== undefined ? (staff_id ? BigInt(staff_id) : null) : undefined,
        expense_amount: expense_amount !== undefined ? parseFloat(String(expense_amount)) : undefined,
        expense_details: expense_details !== undefined ? String(expense_details).trim() : undefined,
        date: date !== undefined ? date : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        expense_type_id: Number(updated.expense_type_id),
        staff_id: updated.staff_id ? Number(updated.staff_id) : null,
        user_id: Number(updated.user_id),
        expense_amount: parseFloat(String(updated.expense_amount)),
      },
    });

  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenseId = BigInt(id);

    await prisma.expenses.delete({
      where: { id: expenseId },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
