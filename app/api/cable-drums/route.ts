import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

function generateDrumCode(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DRM-${randomSuffix}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: any = {};
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { drum_code: { contains: search } },
        { drum_type: { contains: search } },
        { order_no: { contains: search } },
        { purchase_no: { contains: search } },
      ];
    }

    const [total, drumsList] = await Promise.all([
      (prisma as any).cable_drums.count({ where }),
      (prisma as any).cable_drums.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        include: {
          products: { select: { id: true, product_name: true } },
          customers: { select: { id: true, customer_name: true, mobile: true } },
          suppliers: { select: { id: true, name: true, company: true } },
        },
      }),
    ]);

    // Financial totals summary
    const allDrums = await (prisma as any).cable_drums.findMany({
      select: {
        deposit_amount: true,
        refund_amount: true,
        status: true,
      },
    });

    const summary = allDrums.reduce(
      (acc: any, d: any) => {
        const dep = parseFloat(String(d.deposit_amount || "0"));
        const ref = parseFloat(String(d.refund_amount || "0"));
        if (d.status === "ISSUED") acc.activeIssuedCount++;
        acc.totalDepositHeld += Math.max(0, dep - ref);
        return acc;
      },
      { activeIssuedCount: 0, totalDepositHeld: 0, totalDrums: allDrums.length }
    );

    return NextResponse.json({
      status: "success",
      data: drumsList,
      summary,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error("Cable drums list error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to load cable drums" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const {
      drum_type,
      product_id,
      supplier_id,
      customer_id,
      deposit_amount,
      order_no,
      purchase_no,
      note,
    } = body;

    const code = generateDrumCode();
    const depAmt = Math.max(0, parseFloat(String(deposit_amount || "0")));

    const created = await (prisma as any).cable_drums.create({
      data: {
        drum_code: code,
        drum_type: drum_type || "Wooden Drum 1000m",
        product_id: product_id ? BigInt(product_id) : null,
        supplier_id: supplier_id ? BigInt(supplier_id) : null,
        customer_id: customer_id ? BigInt(customer_id) : null,
        deposit_amount: depAmt,
        status: customer_id ? "ISSUED" : "IN_STOCK",
        issue_date: customer_id ? new Date() : null,
        order_no: order_no || null,
        purchase_no: purchase_no || null,
        note: note || null,
        user_id: BigInt(userId),
      },
    });

    await logAudit({
      userId,
      action: "CREATE",
      entityType: "CABLE_DRUM",
      entityId: String(created.id),
      newValues: { drum_code: code, drum_type, deposit_amount: depAmt },
    });

    return NextResponse.json({
      status: "success",
      message: "Cable drum registered successfully",
      data: created,
    });
  } catch (err: any) {
    console.error("Create drum error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to register cable drum" },
      { status: 500 }
    );
  }
}
