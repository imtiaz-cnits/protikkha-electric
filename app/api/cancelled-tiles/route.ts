import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: All Cancelled Tiles Records (Newest First, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();

    let query = `
      SELECT 
        id,
        order_id,
        order_no,
        customer_id,
        customer_name,
        customer_mobile,
        items_data,
        total_amount,
        total_items,
        reason,
        cancelled_by,
        cancelled_at,
        created_at,
        updated_at
      FROM cancelled_tiles
    `;

    const params: any[] = [];
    if (search) {
      query += ` WHERE LOWER(order_no) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(customer_mobile) LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY id DESC`;

    const rawRecords = await prisma.$queryRawUnsafe<any[]>(query, ...params);

    const formatted = rawRecords.map((r) => {
      let items = [];
      try {
        items = typeof r.items_data === "string" ? JSON.parse(r.items_data) : r.items_data;
      } catch {
        items = [];
      }

      return {
        id: Number(r.id),
        order_id: Number(r.order_id),
        order_no: r.order_no,
        customer_id: r.customer_id ? Number(r.customer_id) : null,
        customer_name: r.customer_name || "Walk-in Customer",
        customer_mobile: r.customer_mobile || "",
        total_amount: parseFloat(String(r.total_amount || 0)),
        total_items: parseFloat(String(r.total_items || 0)),
        reason: r.reason || null,
        cancelled_at: r.cancelled_at,
        created_at: r.created_at,
        items,
      };
    });

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("GET Cancelled Tiles Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load cancelled tiles." },
      { status: 500 }
    );
  }
}
