import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { calculateStaffPerformance } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    // Only Admin or Manager can view comprehensive staff performance
    if (!user || (user.role !== "admin" && user.role !== "manager")) {
      return NextResponse.json(
        { status: "fail", message: "Forbidden. Insufficient permissions." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const roleFilter = searchParams.get("role") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date filters if provided
    const orderDateWhere: any = {};
    const collectionDateWhere: any = {};
    const expenseDateWhere: any = {};

    if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        orderDateWhere.gte = start;
        collectionDateWhere.gte = start;
        expenseDateWhere.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        orderDateWhere.lte = end;
        collectionDateWhere.lte = end;
        expenseDateWhere.lte = end;
      }
    }

    // Fetch active staff users
    const staffMembers = await prisma.users.findMany({
      where: {
        ...(roleFilter && roleFilter !== "all" ? { role: roleFilter } : {}),
      },
      orderBy: { id: "desc" },
      select: {
        id: true,
        name: true,
        mobile: true,
        email: true,
        role: true,
        status: true,
      },
    });

    const performanceRecords = await Promise.all(
      staffMembers.map(async (staff) => {
        const staffIdBig = BigInt(staff.id);

        // Orders handled by this user
        const orders = await prisma.orders.findMany({
          where: {
            user_id: staffIdBig,
            ...(Object.keys(orderDateWhere).length > 0
              ? { created_at: orderDateWhere }
              : {}),
          },
          select: {
            id: true,
            sub_total: true,
            paid_amount: true,
            due_amount: true,
          },
        });

        // Collections recorded by this user
        const collections = await prisma.customer_payment_details.findMany({
          where: {
            user_id: staffIdBig,
            ...(Object.keys(collectionDateWhere).length > 0
              ? { created_at: collectionDateWhere }
              : {}),
          },
          select: {
            id: true,
            paid_amount: true,
          },
        });

        // Payouts / salary expenses recorded for this staff member (staff_id = staff.id)
        const payouts = await prisma.expenses.findMany({
          where: {
            staff_id: staffIdBig,
            ...(Object.keys(expenseDateWhere).length > 0
              ? { created_at: expenseDateWhere }
              : {}),
          },
          select: {
            id: true,
            expense_amount: true,
          },
        });

        const metrics = calculateStaffPerformance(
          {
            id: Number(staff.id),
            name: staff.name,
            role: staff.role || "staff",
          },
          orders,
          collections,
          payouts
        );

        return {
          ...metrics,
          mobile: staff.mobile,
          email: staff.email,
          status: staff.status,
        };
      })
    );

    // Filter by search query if present
    let filtered = performanceRecords;
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.staffName.toLowerCase().includes(search) ||
          p.mobile.includes(search) ||
          p.role.toLowerCase().includes(search)
      );
    }

    // Sort by sales volume descending
    filtered.sort((a, b) => b.totalSalesVolume - a.totalSalesVolume);

    // Summary aggregates
    const totalCompanySalesVolume = filtered.reduce(
      (sum, p) => sum + p.totalSalesVolume,
      0
    );
    const totalCompanyCashCollected = filtered.reduce(
      (sum, p) => sum + p.cashCollected,
      0
    );
    const totalCompanyStaffPayouts = filtered.reduce(
      (sum, p) => sum + p.salaryPaid,
      0
    );
    const totalOrdersHandled = filtered.reduce(
      (sum, p) => sum + p.ordersHandled,
      0
    );

    return NextResponse.json({
      status: "success",
      data: filtered,
      summary: {
        totalStaffCount: filtered.length,
        totalCompanySalesVolume,
        totalCompanyCashCollected,
        totalCompanyStaffPayouts,
        totalOrdersHandled,
        netBusinessSurplus: totalCompanyCashCollected - totalCompanyStaffPayouts,
      },
    });
  } catch (error: any) {
    console.error("Staff Performance API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to calculate staff performance" },
      { status: 500 }
    );
  }
}
