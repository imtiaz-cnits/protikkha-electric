import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { executeTransferReceive } from "@/lib/stock-service";
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

    const updated = await executeTransferReceive(Number(id), userId);

    await logAudit({
      userId,
      action: "APPROVE",
      entityType: "STOCK_TRANSFER",
      entityId: id,
      newValues: { status: "RECEIVED" },
    });

    return NextResponse.json({
      status: "success",
      message: "Transfer received successfully. Destination inventory incremented.",
      data: updated,
    });
  } catch (err: any) {
    console.error("Transfer receive error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to receive transfer" },
      { status: 500 }
    );
  }
}
