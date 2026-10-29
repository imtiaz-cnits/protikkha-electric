import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { queryAuditLogs } from "@/lib/audit-service";
import { hasPermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    // Only Admin or Manager or users with reports_view permission can view audit logs
    if (
      !user ||
      (user.role !== "admin" &&
        user.role !== "manager" &&
        !hasPermission(user.role, "reports_view", user.permissions))
    ) {
      return NextResponse.json(
        { status: "fail", message: "Forbidden. Insufficient permissions to view security audit trails." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const userId = searchParams.get("userId") ? parseInt(searchParams.get("userId")!, 10) : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const result = await queryAuditLogs({
      page,
      pageSize,
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      status: "success",
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Audit Logs API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
