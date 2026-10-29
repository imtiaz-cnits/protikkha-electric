import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-service";

export const dynamic = "force-dynamic";

function generateContractorCode(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ELEC-${randomSuffix}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { mobile: { contains: search } },
        { contractor_code: { contains: search } },
        { specialization: { contains: search } },
      ];
    }

    const [total, contractorsList] = await Promise.all([
      (prisma as any).contractors.count({ where }),
      (prisma as any).contractors.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: "desc" },
        include: {
          commissions: {
            take: 5,
            orderBy: { id: "desc" },
          },
        },
      }),
    ]);

    // Financial totals summary
    const allContractors = await (prisma as any).contractors.findMany({
      select: {
        total_commission_earned: true,
        total_commission_paid: true,
        balance_payable: true,
      },
    });

    const summary = allContractors.reduce(
      (acc: any, c: any) => ({
        totalEarned: acc.totalEarned + parseFloat(String(c.total_commission_earned || "0")),
        totalPaid: acc.totalPaid + parseFloat(String(c.total_commission_paid || "0")),
        totalPayable: acc.totalPayable + parseFloat(String(c.balance_payable || "0")),
      }),
      { totalEarned: 0, totalPaid: 0, totalPayable: 0 }
    );

    return NextResponse.json({
      status: "success",
      data: contractorsList,
      summary,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (err: any) {
    console.error("Contractors list error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to load contractors" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const userId = user?.id || 1;

    const body = await req.json();
    const { name, mobile, email, address, specialization, commission_percent } = body;

    if (!name || !mobile) {
      return NextResponse.json(
        { status: "fail", message: "Name and mobile number are required." },
        { status: 400 }
      );
    }

    const code = generateContractorCode();
    const commPct = Math.max(0, parseFloat(String(commission_percent || "5.0")));

    const created = await (prisma as any).contractors.create({
      data: {
        contractor_code: code,
        name: name.trim(),
        mobile: mobile.trim(),
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        specialization: specialization ? specialization.trim() : "General Electrical",
        commission_percent: commPct,
        user_id: BigInt(userId),
      },
    });

    await logAudit({
      userId,
      action: "CREATE",
      entityType: "CONTRACTOR",
      entityId: String(created.id),
      newValues: { name, mobile, code, commission_percent: commPct },
    });

    return NextResponse.json({
      status: "success",
      message: "Contractor / Electrician created successfully",
      data: created,
    });
  } catch (err: any) {
    console.error("Create contractor error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to create contractor" },
      { status: 500 }
    );
  }
}
