import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRangeFilter, formatLocalYmd } from "@/lib/report-date-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const dateFilter = buildDateRangeFilter(startDate, endDate);

    // Group sold order items to calculate realized profit dynamically
    const orderDetails = await prisma.order_details.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      orderBy: { id: "desc" },
      include: {
        products: {
          include: {
            categories: true,
          },
        },
      },
    });

    let items = orderDetails.map((od) => {
      const qty = parseFloat(od.quantity?.toString() || "1");
      const unitSellPrice = parseFloat(od.selling_price || od.price || "0");
      const unitCostPrice = parseFloat(od.products?.cost_price || "0");
      const salesRevenue = qty * unitSellPrice;
      const cogs = qty * unitCostPrice;
      const grossProfit = salesRevenue - cogs;
      const margin = salesRevenue > 0 ? ((grossProfit / salesRevenue) * 100).toFixed(1) : "0.0";

      return {
        id: Number(od.id),
        product_name: od.products?.product_name || "Electrical Product",
        category: od.products?.categories?.category_name || "General Electrical",
        sold_qty: qty,
        unit_sell_price: unitSellPrice,
        unit_cost_price: unitCostPrice,
        sales_revenue: salesRevenue,
        cogs: cogs,
        gross_profit: grossProfit,
        profit_margin: margin,
        date: od.created_at ? formatLocalYmd(od.created_at) : formatLocalYmd(new Date()),
      };
    });

    if (search) {
      items = items.filter(
        (i) =>
          i.product_name.toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load profit margin report" },
      { status: 500 }
    );
  }
}
