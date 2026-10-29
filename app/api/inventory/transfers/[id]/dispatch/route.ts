import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { executeTransferDispatch } from "@/lib/stock-service";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;
    const { id } = await params;

    const updated = await executeTransferDispatch(Number(id), userId);

    await logAudit({
      userId,
      action: "UPDATE",
      entityType: "STOCK_TRANSFER",
      entityId: id,
      newValues: { status: "DISPATCHED" },
    });

    return NextResponse.json({
      status: "success",
      message: "Transfer dispatched successfully. Source inventory deducted.",
      data: updated,
    });
  } catch (err: any) {
    console.error("Transfer dispatch error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to dispatch transfer" },
      { status: 500 }
    );
  }
}
