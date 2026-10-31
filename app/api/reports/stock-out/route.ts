import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRangeFilter } from "@/lib/report-date-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "all"; // all, out_of_stock, low_stock, critical
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const dateFilter = buildDateRangeFilter(startDate, endDate);

    // 1. Fetch products with category and brand (filtered by activity in date range when provided)
    const products = await prisma.products.findMany({
      where: dateFilter
        ? {
            OR: [
              { created_at: dateFilter },
              { updated_at: dateFilter },
              { stock_movements: { some: { created_at: dateFilter } } },
              { order_details: { some: { created_at: dateFilter } } },
              { purchase_order_details: { some: { created_at: dateFilter } } },
            ],
          }
        : undefined,
      orderBy: { id: "desc" },
      include: {
        categories: { select: { category_name: true } },
        brands: { select: { name: true } },
        units: { select: { unit_name: true } },
      },
    });

    let outOfStockCount = 0;
    let lowStockCount = 0;
    let healthyStockCount = 0;
    let estimatedRestockCost = 0;

    const formattedProducts = products.map((p) => {
      const stock = parseFloat(String(p.quantity || 0));
      const cost = parseFloat(String(p.cost_price || 0));
      const price = parseFloat(String(p.sell_price || 0));

      let stockStatus: "out_of_stock" | "low_stock" | "healthy" = "healthy";

      if (stock <= 0) {
        stockStatus = "out_of_stock";
        outOfStockCount += 1;
        estimatedRestockCost += cost * 10;
      } else if (stock <= 5) {
        stockStatus = "low_stock";
        lowStockCount += 1;
        estimatedRestockCost += cost * (10 - stock);
      } else {
        healthyStockCount += 1;
      }

      const codeStr = Array.isArray(p.product_code)
        ? String(p.product_code[0] || "")
        : p.product_code
        ? String(p.product_code)
        : null;

      return {
        id: Number(p.id),
        product_name: p.product_name,
        product_code: codeStr,
        category: p.categories?.category_name || "Uncategorized",
        brand: p.brands?.name || "General",
        unit: p.units?.unit_name || "Pcs",
        stock,
        product_cost: cost,
        price,
        status: stockStatus,
      };
    });

    // 2. Fetch Best Selling Fast-Movers (within date range when provided)
    const orderDetails = await prisma.order_details.findMany({
      where: dateFilter ? { created_at: dateFilter } : undefined,
      include: {
        products: {
          select: {
            id: true,
            product_name: true,
            quantity: true,
            cost_price: true,
          },
        },
      },
    });

    const moverMap = new Map<
      number,
      {
        id: number;
        name: string;
        total_sold_qty: number;
        total_revenue: number;
        current_stock: number;
      }
    >();

    for (const d of orderDetails) {
      if (!d.product_id || !d.products) continue;
      const pid = Number(d.product_id);
      const qty = parseFloat(String(d.quantity || 0));
      const selling = parseFloat(String(d.selling_price || 0));

      if (!moverMap.has(pid)) {
        moverMap.set(pid, {
          id: pid,
          name: d.products.product_name,
          total_sold_qty: 0,
          total_revenue: 0,
          current_stock: parseFloat(String(d.products.quantity || 0)),
        });
      }

      const item = moverMap.get(pid)!;
      item.total_sold_qty += qty;
      item.total_revenue += qty * selling;
    }

    const fastMovers = Array.from(moverMap.values())
      .sort((a, b) => b.total_sold_qty - a.total_sold_qty)
      .slice(0, 10);

    // Filter products
    let filtered = formattedProducts;
    if (filter === "out_of_stock") {
      filtered = filtered.filter((p) => p.status === "out_of_stock");
    } else if (filter === "low_stock") {
      filtered = filtered.filter((p) => p.status === "low_stock");
    } else if (filter === "critical") {
      filtered = filtered.filter((p) => p.status !== "healthy");
    }

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.product_name.toLowerCase().includes(search) ||
          (p.product_code && p.product_code.toLowerCase().includes(search)) ||
          p.category.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      summary: {
        total_products: products.length,
        out_of_stock_count: outOfStockCount,
        low_stock_count: lowStockCount,
        healthy_stock_count: healthyStockCount,
        estimated_restock_cost: estimatedRestockCost,
      },
      data: filtered,
      fast_movers: fastMovers,
    });
  } catch (error: any) {
    console.error("Stock-Out Report API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to generate stock report" },
      { status: 500 }
    );
  }
}
