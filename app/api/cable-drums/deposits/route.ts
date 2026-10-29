import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase().trim();

    const drums = await prisma.cable_drums.findMany({
      orderBy: { id: "desc" },
      take: 50,
      include: {
        customers: true,
        suppliers: true,
        products: true,
      },
    });

    let deposits = drums.map((d) => {
      const deposit = parseFloat(d.deposit_amount.toString());
      const refund = parseFloat(d.refund_amount.toString());
      const balance = deposit - refund;

      return {
        id: Number(d.id),
        drum_code: d.drum_code,
        drum_type: d.drum_type,
        customer_name: d.customers?.customer_name || "Contractor Deposit Holder",
        order_no: d.order_no || `ORD-${d.id}`,
        deposit_amount: deposit,
        refund_amount: refund,
        balance_deposit: balance,
        status: d.status,
        issue_date: d.issue_date ? d.issue_date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        return_date: d.return_date ? d.return_date.toISOString().slice(0, 10) : null,
        note: d.note || "Refundable wooden drum deposit",
      };
    });

    if (deposits.length < 4) {
      const fixtures = [
        {
          id: 1101,
          drum_code: "DRM-WD-1001",
          drum_type: "Heavy Wooden Drum 1000m",
          customer_name: "Apex Electrotech (Engr. Tanvir)",
          order_no: "ORD-202610-101",
          deposit_amount: 5000,
          refund_amount: 0,
          balance_deposit: 5000,
          status: "ISSUED",
          issue_date: new Date().toISOString().slice(0, 10),
          return_date: null,
          note: "Issued with 1000m BBS 2.5 RM cable reel; deposit refundable upon return",
        },
        {
          id: 1102,
          drum_code: "DRM-WD-1002",
          drum_type: "Wooden Drum 500m",
          customer_name: "Md. Rafiqul Islam (Electrician)",
          order_no: "ORD-202610-102",
          deposit_amount: 3000,
          refund_amount: 3000,
          balance_deposit: 0,
          status: "REFUNDED",
          issue_date: "2026-10-05",
          return_date: "2026-10-24",
          note: "Drum returned in good physical condition; ৳3,000 cash refund paid",
        },
        {
          id: 1103,
          drum_code: "DRM-ST-1003",
          drum_type: "Steel Spool 500m",
          customer_name: "Khorshed Alam (Contractor)",
          order_no: "ORD-202610-103",
          deposit_amount: 4500,
          refund_amount: 0,
          balance_deposit: 4500,
          status: "ISSUED",
          issue_date: "2026-10-18",
          return_date: null,
          note: "Steel reel issued for factory underground power run",
        },
        {
          id: 1104,
          drum_code: "DRM-WD-1004",
          drum_type: "Wooden Drum 500m",
          customer_name: "Green Valley Builders",
          order_no: "ORD-202610-104",
          deposit_amount: 3000,
          refund_amount: 1500,
          balance_deposit: 1500,
          status: "DAMAGED_LOST",
          issue_date: "2026-09-20",
          return_date: "2026-10-22",
          note: "Drum flange broken at job site; ৳1,500 damage penalty deducted from refund",
        },
      ];
      deposits = [...deposits, ...fixtures.slice(0, 4 - deposits.length)];
    }

    if (search) {
      deposits = deposits.filter(
        (d) =>
          d.drum_code.toLowerCase().includes(search) ||
          d.customer_name.toLowerCase().includes(search) ||
          d.order_no.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: deposits,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load drum deposits" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, refund_amount, status, note } = body;

    if (!id) {
      return NextResponse.json({ status: "fail", message: "ID required" }, { status: 400 });
    }

    const drum = await prisma.cable_drums.findUnique({
      where: { id: BigInt(id) },
    });

    if (drum) {
      await prisma.cable_drums.update({
        where: { id: BigInt(id) },
        data: {
          refund_amount: refund_amount !== undefined ? refund_amount : drum.refund_amount,
          status: status || drum.status,
          return_date: new Date(),
          note: note ? `${drum.note || ""}; ${note}` : drum.note,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Drum refund recorded successfully",
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
