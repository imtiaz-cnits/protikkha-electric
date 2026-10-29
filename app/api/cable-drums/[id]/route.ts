import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;
    const { id } = await params;
    const drumId = BigInt(id);

    const body = await req.json();
    const { status, refund_amount, note, customer_id, order_no } = body;

    const existing: any = await (prisma as any).cable_drums.findUnique({
      where: { id: drumId },
    });
    if (!existing) {
      return NextResponse.json(
        { status: "fail", message: "Cable drum not found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (note !== undefined) updateData.note = note;

    if (status === "ISSUED") {
      updateData.customer_id = customer_id ? BigInt(customer_id) : existing.customer_id;
      updateData.order_no = order_no || existing.order_no;
      updateData.issue_date = new Date();
    } else if (status === "RETURNED" || status === "REFUNDED") {
      updateData.return_date = new Date();
      if (refund_amount !== undefined) {
        updateData.refund_amount = parseFloat(String(refund_amount || "0"));
      } else {
        updateData.refund_amount = existing.deposit_amount;
      }
    }

    const updated = await (prisma as any).cable_drums.update({
      where: { id: drumId },
      data: updateData,
    });

    await logAudit({
      userId,
      action: "UPDATE",
      entityType: "CABLE_DRUM",
      entityId: id,
      newValues: updateData,
      oldValues: { status: existing.status, refund_amount: existing.refund_amount },
    });

    return NextResponse.json({
      status: "success",
      message: `Cable drum updated to ${status || "new status"}`,
      data: updated,
    });
  } catch (err: any) {
    console.error("Update drum error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to update cable drum" },
      { status: 500 }
    );
  }
}
