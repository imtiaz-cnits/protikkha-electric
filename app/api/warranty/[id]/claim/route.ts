import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/warranty/[id]/claim
 * Process a warranty claim: REPLACED, CLAIMED, or REJECTED
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const { id } = await params;
    const warrantyId = BigInt(id);

    const body = await req.json();
    const { action, claim_reason, replacement_serial, note } = body;

    // action: "REPLACE" | "CLAIM" | "REJECT"
    if (!action || !["REPLACE", "CLAIM", "REJECT"].includes(action)) {
      return NextResponse.json(
        { status: "fail", message: "Invalid action. Must be REPLACE, CLAIM, or REJECT" },
        { status: 400 }
      );
    }

    const record = await prisma.warranty_records.findUnique({
      where: { id: warrantyId },
      include: {
        products: true,
        customers: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { status: "fail", message: "Warranty record not found" },
        { status: 404 }
      );
    }

    const now = new Date();
    const isPast = new Date(record.expiry_date) < now;

    if (isPast && action !== "REJECT") {
      return NextResponse.json(
        { status: "fail", message: "Warranty for this item has expired! Cannot claim or replace." },
        { status: 400 }
      );
    }

    if (record.status === "CLAIMED" || record.status === "REPLACED") {
      return NextResponse.json(
        { status: "fail", message: `This warranty record was already processed as '${record.status}'.` },
        { status: 400 }
      );
    }

    let newStatus = record.status;
    let claimNote = record.notes || "";

    const timestamp = now.toLocaleDateString("en-GB");

    if (action === "REPLACE") {
      newStatus = "REPLACED";
      claimNote += `\n[${timestamp} REPLACED]: Reason: ${claim_reason || "Defective"}. New Serial: ${replacement_serial || "N/A"}. ${note || ""}`;
    } else if (action === "CLAIM") {
      newStatus = "CLAIMED";
      claimNote += `\n[${timestamp} CLAIMED FOR SERVICE]: Reason: ${claim_reason || "Faulty"}. ${note || ""}`;
    } else if (action === "REJECT") {
      claimNote += `\n[${timestamp} CLAIM REJECTED]: Reason: ${claim_reason || "Physical/Water damage"}. ${note || ""}`;
    }

    const updated = await prisma.warranty_records.update({
      where: { id: warrantyId },
      data: {
        status: newStatus,
        notes: claimNote.trim(),
      },
    });

    return NextResponse.json({
      status: "success",
      message: `Warranty claim successfully processed as ${newStatus}!`,
      data: {
        id: Number(updated.id),
        serial_number: updated.serial_number,
        status: updated.status,
        notes: updated.notes,
      },
    });
  } catch (error: any) {
    console.error("Warranty Claim Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to process warranty claim" },
      { status: 500 }
    );
  }
}
