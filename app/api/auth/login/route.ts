import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyPassword, signToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { status: "fail", message: "Email and password are required" },
        { status: 400 }
      );
    }

    const rateKey = `login:${ip}:${email.trim()}`;
    const rateCheck = checkRateLimit(rateKey, { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Too many failed login attempts. Please try again after ${rateCheck.resetInSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const user = await prisma.users.findFirst({
      where: {
        OR: [{ email: email.trim() }, { mobile: email.trim() }],
      },
    });

    if (!user) {
      return NextResponse.json(
        { status: "fail", message: "Invalid user credentials" },
        { status: 401 }
      );
    }

    if (user.status !== "approved") {
      return NextResponse.json(
        { status: "fail", message: "Your account is pending or disabled" },
        { status: 403 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { status: "fail", message: "Incorrect password" },
        { status: 401 }
      );
    }

    // Reset rate limiter on successful authentication
    resetRateLimit(rateKey);

    const token = signToken({
      userId: Number(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const permissions = user.permissions ? JSON.parse(user.permissions) : null;

    const response = NextResponse.json({
      status: "success",
      message: "Login Successful",
      token,
      role: user.role,
      user: {
        id: Number(user.id),
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        img_url: user.img_url,
      },
      permissions,
    });

    // Set HTTP-only Cookie for security
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
