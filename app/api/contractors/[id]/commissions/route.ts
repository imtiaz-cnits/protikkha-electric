import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contractorId = BigInt(id);

    const contractor: any = await (prisma as any).contractors.findUnique({
      where: { id: contractorId },
      include: {
        commissions: {
          orderBy: { id: "desc" },
        },
      },
    });

    if (!contractor) {
      return NextResponse.json(
        { status: "fail", message: "Contractor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      data: contractor,
    });
  } catch (err: any) {
    console.error("Contractor commissions error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to load commissions" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;
    const { id } = await params;
    const contractorId = BigInt(id);

    const body = await req.json();
    const { amount, payment_method, note } = body;
    const payAmount = parseFloat(String(amount || "0"));

    if (payAmount <= 0) {
      return NextResponse.json(
        { status: "fail", message: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    const contractor: any = await (prisma as any).contractors.findUnique({
      where: { id: contractorId },
    });
    if (!contractor) {
      return NextResponse.json(
        { status: "fail", message: "Contractor not found" },
        { status: 404 }
      );
    }

    const currentEarned = parseFloat(String(contractor.total_commission_earned || "0"));
    const currentPaid = parseFloat(String(contractor.total_commission_paid || "0"));
    const newPaid = currentPaid + payAmount;
    const newBalance = Math.max(0, currentEarned - newPaid);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Update contractor financial balances
      await tx.contractors.update({
        where: { id: contractorId },
        data: {
          total_commission_paid: newPaid,
          balance_payable: newBalance,
        },
      });

      // 2. Insert payout record into contractor_commissions
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const commissionNo = `PAY-${Date.now().toString().slice(-6)}-${randomSuffix}`;

      const payout = await tx.contractor_commissions.create({
        data: {
          commission_no: commissionNo,
          contractor_id: contractorId,
          commission_basis: "PAYOUT",
          sale_amount: 0,
          commission_percent: 0,
          commission_amount: payAmount,
          status: "PAID",
          paid_amount: payAmount,
          payment_method: payment_method || "CASH",
          payment_date: new Date(),
          note: note || "Contractor commission settlement payment",
          user_id: BigInt(userId),
        },
      });

      return payout;
    });

    await logAudit({
      userId,
      action: "CREATE",
      entityType: "COMMISSION_PAYOUT",
      entityId: String(contractorId),
      newValues: { payAmount, payment_method, newBalance },
    });

    return NextResponse.json({
      status: "success",
      message: "Commission payment recorded successfully",
      data: result,
      newBalance,
    });
  } catch (err: any) {
    console.error("Commission payment error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to record payment" },
      { status: 500 }
    );
  }
}
