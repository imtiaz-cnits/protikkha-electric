import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canViewCostPrice } from "@/lib/rbac";

export const dynamic = "force-dynamic";

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const allowCostView = authUser ? canViewCostPrice(authUser.role, authUser.permissions) : true;

    const products = await prisma.products.findMany({
      orderBy: { id: "desc" },
      include: {
        categories: true,
        brands: true,
        units: true,
        electrical_specifications: true,
      },
    });

    const headers = [
      "ID",
      "Product Name",
      "Product Codes",
      "Category",
      "Brand",
      "Unit",
      "Selling Price",
      allowCostView ? "Cost Price" : "",
      "Stock Quantity",
      "Spec Type",
      "Conductor Material",
      "Cable Size",
      "Core Count",
      "Current Rating",
      "Voltage Grade",
      "Wattage",
      "Is Cut Sellable",
      "Status",
    ].filter(Boolean);

    const rows = products.map((p) => {
      let codesStr = "";
      try {
        const parsed = typeof p.product_code === "string" ? JSON.parse(p.product_code) : p.product_code;
        codesStr = Array.isArray(parsed) ? parsed.join("; ") : String(p.product_code || "");
      } catch {
        codesStr = String(p.product_code || "");
      }

      const spec = p.electrical_specifications;
      const row = [
        escapeCsvField(p.id.toString()),
        escapeCsvField(p.product_name),
        escapeCsvField(codesStr),
        escapeCsvField(p.categories?.category_name || ""),
        escapeCsvField(p.brands?.name || ""),
        escapeCsvField(p.units?.unit_name || "Pcs"),
        escapeCsvField(p.sell_price || "0"),
        allowCostView ? escapeCsvField(p.cost_price || "0") : null,
        escapeCsvField(p.quantity || "0"),
        escapeCsvField(spec?.spec_type || ""),
        escapeCsvField(spec?.conductor_material || ""),
        escapeCsvField(spec?.cable_size || ""),
        escapeCsvField(spec?.core_count || ""),
        escapeCsvField(spec?.current_rating || ""),
        escapeCsvField(spec?.voltage_grade || ""),
        escapeCsvField(spec?.wattage || ""),
        escapeCsvField(spec?.spec_type === "CABLE" ? "YES" : "NO"),
        escapeCsvField(p.status || "active"),
      ].filter((v) => v !== null);

      return row.join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="protikkha-products-catalog-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Product export error:", error);
    return NextResponse.json(
      { status: "error", message: error.message || "Failed to export products" },
      { status: 500 }
    );
  }
}
