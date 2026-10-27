import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const typeId = BigInt(id);
    const body = await req.json();

    const { type_name, status } = body;

    const updated = await prisma.expense_types.update({
      where: { id: typeId },
      data: {
        type_name: type_name !== undefined ? type_name.trim() : undefined,
        status: status !== undefined ? status : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense type updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        user_id: Number(updated.user_id),
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
    const typeId = BigInt(id);

    const expenseCount = await prisma.expenses.count({
      where: { expense_type_id: typeId },
    });

    if (expenseCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete expense type with ${expenseCount} existing expense records.`,
        },
        { status: 400 }
      );
    }

    await prisma.expense_types.delete({
      where: { id: typeId },
    });

    return NextResponse.json({
      status: "success",
      message: "Expense type deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
