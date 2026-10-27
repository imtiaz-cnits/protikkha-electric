import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const targetUserId = BigInt(id);
    const body = await req.json();
    const { name, email, mobile, password, role, status, permissions, img_url } = body;

    const data: any = {};
    if (name) data.name = name.trim();
    if (email !== undefined) data.email = email ? email.trim() : null;
    if (mobile) data.mobile = mobile.trim();
    if (password && password.trim() !== "") {
      data.password = await hashPassword(password);
    }
    if (role) data.role = role;
    if (status) data.status = status;
    if (img_url !== undefined) data.img_url = img_url || null;
    if (permissions !== undefined) {
      data.permissions = typeof permissions === "object" ? JSON.stringify(permissions) : permissions;
    }

    const updated = await prisma.users.update({
      where: { id: targetUserId },
      data,
    });

    return NextResponse.json({
      status: "success",
      message: "User updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser || authUser.role !== "admin") {
      return NextResponse.json({ status: "fail", message: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const targetUserId = BigInt(id);

    // Safeguard: Prevent deleting primary superadmins or deleting oneself
    if (targetUserId === BigInt(1) || targetUserId === BigInt(7) || targetUserId === BigInt(authUser.id)) {
      return NextResponse.json(
        { status: "fail", message: "Super Admin account or currently logged-in account cannot be deleted." },
        { status: 400 }
      );
    }

    // Safeguard: Check if user has associated transactions
    const [orderCount, purchaseCount] = await Promise.all([
      prisma.orders.count({ where: { user_id: targetUserId } }),
      prisma.purchases.count({ where: { user_id: targetUserId } }),
    ]);

    if (orderCount > 0 || purchaseCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete user because they have recorded transactions (${orderCount} orders, ${purchaseCount} purchases). Consider deactivating the account instead.`,
        },
        { status: 400 }
      );
    }

    await prisma.users.delete({
      where: { id: targetUserId },
    });

    return NextResponse.json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message || "Failed to delete user" }, { status: 500 });
  }
}
