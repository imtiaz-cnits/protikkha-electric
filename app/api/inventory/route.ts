import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: Inventory Analytics and Stock List
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const filter = searchParams.get("filter"); // 'all', 'low', 'out'
    const categoryId = searchParams.get("category_id");

    const where: any = {};
    if (categoryId) where.category_id = BigInt(categoryId);

    const products = await prisma.products.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        categories: true,
        brands: true,
        units: true,
      },
    });

    let totalStockUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const pendingChallanItems = await prisma.order_details.findMany({
      where: { stock_lifecycle_state: "PENDING_CHALLAN" },
      select: { product_id: true, quantity: true },
    });
    const reservedMap = new Map<string, number>();
    for (const item of pendingChallanItems) {
      const pid = item.product_id.toString();
      const q = parseFloat(item.quantity || "0");
      reservedMap.set(pid, (reservedMap.get(pid) || 0) + q);
    }

    const formatted = products.map((p) => {
      const qty = parseFloat(p.quantity || "0");
      const cost = parseFloat(p.cost_price || "0");
      const sell = parseFloat(p.sell_price || "0");
      const totalCost = qty * cost;
      const totalRetail = qty * sell;
      const reservedQty = reservedMap.get(p.id.toString()) || 0;
      const availableQty = Math.max(0, qty - reservedQty);

      totalStockUnits += qty;
      totalCostValuation += totalCost;
      totalRetailValuation += totalRetail;

      if (availableQty <= 0) {
        outOfStockCount++;
      } else if (availableQty <= 5) {
        lowStockCount++;
      }

      let codes: string[] = [];
      if (p.product_code) {
        try {
          codes = Array.isArray(p.product_code)
            ? p.product_code
            : JSON.parse(String(p.product_code));
        } catch {
          codes = [String(p.product_code)];
        }
      }

      return {
        id: Number(p.id),
        name: p.product_name,
        primary_code: codes[0] || "",
        category: p.categories?.category_name || "N/A",
        brand: p.brands?.name || "N/A",
        unit: p.units?.unit_name || "Pcs",
        quantity: qty,
        reserved_quantity: reservedQty,
        available_quantity: availableQty,
        cost_price: cost,
        sell_price: sell,
        total_cost_value: totalCost,
        total_retail_value: totalRetail,
        tile_size: p.tile_size || null,
        sqft_per_box: p.sqft_per_box ? parseFloat(p.sqft_per_box) : null,
        pcs_per_box: p.pcs_per_box ? parseInt(p.pcs_per_box) : null,
        grade: p.grade || null,
        surface_finish: p.surface_finish || null,
        stock_status: availableQty <= 0 ? "Out of Stock" : availableQty <= 5 ? "Low Stock" : "In Stock",
      };
    });

    let filteredList = formatted;
    if (filter === "low") {
      filteredList = filteredList.filter((p) => p.quantity > 0 && p.quantity <= 5);
    } else if (filter === "out") {
      filteredList = filteredList.filter((p) => p.quantity <= 0);
    }

    if (search) {
      filteredList = filteredList.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.primary_code.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search) ||
          p.brand.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      summary: {
        total_products: products.length,
        total_stock_units: totalStockUnits,
        total_cost_valuation: totalCostValuation,
        total_retail_valuation: totalRetailValuation,
        potential_profit: Math.max(0, totalRetailValuation - totalCostValuation),
        low_stock_count: lowStockCount,
        out_of_stock_count: outOfStockCount,
      },
      data: filteredList,
    });
  } catch (error: any) {
    console.error("Inventory GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load inventory" },
      { status: 500 }
    );
  }
}

// POST: Manual Stock Adjustment (recount / damage / adjustment)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const { product_id, new_quantity, reason } = body;

    if (!product_id || new_quantity === undefined) {
      return NextResponse.json(
        { status: "fail", message: "Product and new quantity are required" },
        { status: 400 }
      );
    }

    const prodId = BigInt(product_id);
    const updated = await prisma.products.update({
      where: { id: prodId },
      data: {
        quantity: String(new_quantity),
      },
    });

    return NextResponse.json({
      status: "success",
      message: `Stock updated for ${updated.product_name} (${reason || "Physical Adjustment"})`,
      new_quantity: parseFloat(updated.quantity || "0"),
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
