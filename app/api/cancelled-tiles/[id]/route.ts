import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// DELETE: Delete record from cancelled_tiles table
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recordId = parseInt(id, 10);

    if (isNaN(recordId)) {
      return NextResponse.json(
        { status: "fail", message: "Invalid record ID." },
        { status: 400 }
      );
    }

    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM cancelled_tiles WHERE id = ?`,
      recordId
    );

    if (!result) {
      return NextResponse.json(
        { status: "fail", message: "Record not found or already deleted." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      message: "Cancelled tiles record deleted successfully.",
    });
  } catch (error: any) {
    console.error("DELETE Cancelled Tiles Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to delete record." },
      { status: 500 }
    );
  }
}
