import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, hashPassword } from "@/lib/auth";

// GET: All Users (Ordered descending by ID as per PROJECT_RULES)
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.users.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        mobile: true,
        role: true,
        status: true,
        img_url: true,
        permissions: true,
        created_at: true,
      },
    });

    const serializedUsers = users.map((u) => ({
      ...u,
      id: Number(u.id),
      permissions: u.permissions ? JSON.parse(u.permissions) : null,
    }));

    return NextResponse.json({
      status: "success",
      data: serializedUsers,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load users" },
      { status: 500 }
    );
  }
}

// POST: Create User by Admin
export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, mobile, password, role, status, permissions, img_url } = body;

    if (!name || !mobile || !password || !role) {
      return NextResponse.json(
        { status: "fail", message: "Name, mobile, password, and role are required" },
        { status: 400 }
      );
    }

    // Check duplicate
    if (email) {
      const existing = await prisma.users.findFirst({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { status: "fail", message: "Email already in use" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.users.create({
      data: {
        name,
        email: email || null,
        mobile,
        password: hashedPassword,
        role,
        status: status || "approved",
        img_url: img_url || null,
        otp: "000000",
        permissions: permissions ? JSON.stringify(permissions) : null,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "User created successfully",
      data: {
        id: Number(newUser.id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
