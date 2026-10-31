import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/report-date-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const where: any = {};
    if (categoryId && categoryId !== "all") {
      where.category_id = BigInt(categoryId);
    }

    const dateFilter = buildDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      where.OR = [
        { created_at: dateFilter },
        { updated_at: dateFilter },
        { stock_movements: { some: { created_at: dateFilter } } },
        { order_details: { some: { created_at: dateFilter } } },
        { purchase_order_details: { some: { created_at: dateFilter } } },
      ];
    }

    const products = await prisma.products.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        categories: true,
        brands: true,
        units: true,
      },
    });

    let items = products.map((p) => {
      const qty = parseFloat(p.quantity || "0");
      const cost = parseFloat(p.cost_price || "0");
      const retail = parseFloat(p.sell_price || "0");
      const totalCostValue = qty * cost;
      const totalRetailValue = qty * retail;
      const potentialProfit = totalRetailValue - totalCostValue;

      return {
        id: Number(p.id),
        name: p.product_name,
        code: Array.isArray(p.product_code) ? String(p.product_code[0] || "") : String(p.product_code || ""),
        category: p.categories?.category_name || "General Electrical",
        brand: p.brands?.name || "Standard",
        unit: p.units?.unit_name || "Pcs",
        quantity: qty,
        unit_cost: cost,
        unit_retail: retail,
        total_cost_value: totalCostValue,
        total_retail_value: totalRetailValue,
        potential_profit: potentialProfit,
        margin_percent: totalRetailValue > 0 ? ((potentialProfit / totalRetailValue) * 100).toFixed(1) : "0.0",
      };
    });

    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          String(i.code).toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load stock valuation" },
      { status: 500 }
    );
  }
}
