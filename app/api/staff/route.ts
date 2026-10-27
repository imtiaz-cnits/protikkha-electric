import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// GET: All Staff & Employees
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    const staffMembers = await prisma.users.findMany({
      orderBy: { id: "desc" },
      include: {
        expenses_expenses_staff_idTousers: {
          select: {
            id: true,
            expense_amount: true,
            date: true,
          },
        },
      },
    });

    let formatted = staffMembers.map((s) => {
      const totalPaid = s.expenses_expenses_staff_idTousers.reduce(
        (sum, e) => sum + parseFloat(String(e.expense_amount || 0)),
        0
      );

      return {
        id: Number(s.id),
        name: s.name,
        email: s.email,
        mobile: s.mobile,
        role: s.role || "staff",
        status: s.status,
        total_salary_paid: totalPaid,
        total_payout_count: s.expenses_expenses_staff_idTousers.length,
        created_at: s.created_at,
      };
    });

    if (search) {
      formatted = formatted.filter(
        (s) =>
          s.name.toLowerCase().includes(search) ||
          (s.mobile && s.mobile.includes(search)) ||
          s.role.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Staff GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load staff" },
      { status: 500 }
    );
  }
}

// POST: Add New Staff Member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, mobile, email, role, password, status } = body;

    if (!name || !mobile) {
      return NextResponse.json(
        { status: "fail", message: "Staff name and mobile number are required!" },
        { status: 400 }
      );
    }

    const defaultPass = password || "123456";
    const hashedPassword = await bcrypt.hash(defaultPass, 10);

    const newStaff = await prisma.users.create({
      data: {
        name: name.trim(),
        mobile: mobile.trim(),
        email: email ? email.trim() : null,
        role: role || "staff",
        password: hashedPassword,
        status: status || "approved",
        otp: "0",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Staff member created successfully",
      data: {
        id: Number(newStaff.id),
        name: newStaff.name,
        mobile: newStaff.mobile,
        email: newStaff.email,
        role: newStaff.role,
        status: newStaff.status,
      },
    });
  } catch (error: any) {
    console.error("Staff Create Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create staff" },
      { status: 500 }
    );
  }
}
