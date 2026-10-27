import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staffId = BigInt(id);
    const body = await req.json();

    const { name, mobile, email, role, status, password } = body;

    const dataToUpdate: any = {
      name: name !== undefined ? name.trim() : undefined,
      mobile: mobile !== undefined ? mobile.trim() : undefined,
      email: email !== undefined ? (email ? email.trim() : null) : undefined,
      role: role !== undefined ? role : undefined,
      status: status !== undefined ? status : undefined,
    };

    if (password && password.trim()) {
      dataToUpdate.password = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.users.update({
      where: { id: staffId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      status: "success",
      message: "Staff details updated successfully",
      data: {
        id: Number(updated.id),
        name: updated.name,
        mobile: updated.mobile,
        email: updated.email,
        role: updated.role,
        status: updated.status,
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
    const staffId = BigInt(id);

    // Prevent deleting admin
    if (staffId === BigInt(1) || staffId === BigInt(7)) {
      return NextResponse.json(
        { status: "fail", message: "Super Admin account cannot be deleted!" },
        { status: 400 }
      );
    }

    const [expenseCount, orderCount] = await Promise.all([
      prisma.expenses.count({ where: { user_id: staffId } }),
      prisma.orders.count({ where: { user_id: staffId } }),
    ]);

    if (expenseCount > 0 || orderCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete staff member because they have associated records (${expenseCount} expenses, ${orderCount} orders).`,
        },
        { status: 400 }
      );
    }

    await prisma.users.delete({
      where: { id: staffId },
    });

    return NextResponse.json({
      status: "success",
      message: "Staff member deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
