import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

function generateTransferNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `TRF-${dateStr}-${randomSuffix}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { transfer_no: { contains: search } },
        { note: { contains: search } },
      ];
    }

    const [total, transfers] = await Promise.all([
      (prisma as any).stock_transfers.count({ where }),
      (prisma as any).stock_transfers.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        include: {
          from_business_unit: true,
          to_business_unit: true,
          transfer_items: {
            include: { products: true },
          },
          users: { select: { id: true, name: true } },
        },
      }),
    ]);

    return NextResponse.json({
      status: "success",
      data: transfers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error("Transfers list error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { from_unit_id, to_unit_id, note, items } = body;

    if (!from_unit_id || !to_unit_id) {
      return NextResponse.json(
        { status: "fail", message: "Source and destination stores are required." },
        { status: 400 }
      );
    }

    if (String(from_unit_id) === String(to_unit_id)) {
      return NextResponse.json(
        { status: "fail", message: "Source and destination cannot be the same store." },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Please add at least one product item to transfer." },
        { status: 400 }
      );
    }

    const transferNo = generateTransferNumber();
    const totalQty = items.reduce((sum: number, it: any) => sum + (parseFloat(String(it.quantity || "0")) || 0), 0);

    const created = await (prisma as any).stock_transfers.create({
      data: {
        transfer_no: transferNo,
        from_unit_id: BigInt(from_unit_id),
        to_unit_id: BigInt(to_unit_id),
        status: "PENDING",
        total_items: items.length,
        total_quantity: totalQty,
        note: note || null,
        user_id: BigInt(userId),
        transfer_items: {
          create: items.map((it: any) => ({
            product_id: BigInt(it.product_id),
            quantity: parseFloat(String(it.quantity || "0")),
            packaging_unit: it.packaging_unit || null,
            unit_cost: parseFloat(String(it.unit_cost || "0")),
            note: it.note || null,
          })),
        },
      },
      include: {
        transfer_items: true,
      },
    });

    await logAudit({
      userId,
      action: "CREATE",
      entityType: "STOCK_TRANSFER",
      entityId: String(created.id),
      newValues: { transfer_no: transferNo, from_unit_id, to_unit_id, totalQty },
    });

    return NextResponse.json({
      status: "success",
      message: "Transfer draft created successfully",
      data: created,
    });
  } catch (err: any) {
    console.error("Create transfer error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to create transfer" },
      { status: 500 }
    );
  }
}
