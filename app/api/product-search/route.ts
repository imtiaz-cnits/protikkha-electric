import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatProduct(p: any) {
  let codes: string[] = [];
  if (p.product_code) {
    try {
      codes = Array.isArray(p.product_code)
        ? p.product_code.map(String)
        : JSON.parse(String(p.product_code));
      if (!Array.isArray(codes)) codes = [String(p.product_code)];
    } catch {
      codes = [String(p.product_code)];
    }
  }

  const spec = p.electrical_specifications;
  const conversions = (p.packaging_conversions || []).map((c: any) => ({
    id: Number(c.id),
    packaging_unit: c.packaging_unit,
    base_unit: c.base_unit,
    conversion_ratio: parseFloat(c.conversion_ratio.toString()),
    is_default: Boolean(c.is_default),
  }));

  return {
    id: Number(p.id),
    name: p.product_name,
    product_name: p.product_name,
    primary_code: codes[0] || "",
    display_codes: codes.join(", "),
    all_codes: codes,
    cost_price: parseFloat(p.cost_price || "0"),
    sell_price: parseFloat(p.sell_price || "0"),
    quantity: parseFloat(p.quantity || "0"),
    category_id: p.category_id ? Number(p.category_id) : null,
    brand_id: p.brand_id ? Number(p.brand_id) : null,
    unit_id: p.unit_id ? Number(p.unit_id) : null,
    category: p.categories?.category_name || "N/A",
    brand: p.brands?.name || "N/A",
    unit: p.units?.unit_name || "Pcs",
    img_url: p.img_url || null,
    status: p.status,
    electrical_spec: spec
      ? {
          id: Number(spec.id),
          spec_type: spec.spec_type,
          conductor_material: spec.conductor_material,
          cable_size: spec.cable_size,
          core_count: spec.core_count,
          voltage_grade: spec.voltage_grade,
          current_rating: spec.current_rating,
          pole_type: spec.pole_type,
          breaking_capacity: spec.breaking_capacity,
          tripping_curve: spec.tripping_curve,
          gang_module: spec.gang_module,
          conduit_diameter: spec.conduit_diameter,
          wattage: spec.wattage,
          color_temperature: spec.color_temperature,
          warranty_months: spec.warranty_months || 0,
        }
      : null,
    packaging_conversions: conversions,
    tile_size: p.tile_size || null,
    sqft_per_box: p.sqft_per_box ? parseFloat(p.sqft_per_box) : null,
    pcs_per_box: p.pcs_per_box ? parseInt(p.pcs_per_box) : null,
    grade: p.grade || null,
    surface_finish: p.surface_finish || null,
  };
}

async function handleBarcodeSearch(query: string) {
  if (!query || !query.trim()) {
    return NextResponse.json({ status: "fail", message: "Search code required" }, { status: 400 });
  }

  const trimmed = query.trim().toLowerCase();

  const products = await prisma.products.findMany({
    where: {
      status: "active",
    },
    include: {
      categories: true,
      brands: true,
      units: true,
      electrical_specifications: true,
      packaging_conversions: true,
    },
  });

  const matched = products.find((p) => {
    if (String(p.id) === trimmed) return true;
    if (!p.product_code) return false;
    try {
      const codes = Array.isArray(p.product_code)
        ? p.product_code
        : JSON.parse(String(p.product_code));
      return Array.isArray(codes) && codes.some((c) => String(c).toLowerCase() === trimmed);
    } catch {
      return String(p.product_code).toLowerCase().includes(trimmed);
    }
  });

  if (matched) {
    return NextResponse.json({
      status: "success",
      product: formatProduct(matched),
    });
  }

  return NextResponse.json({ status: "error", message: "Product not found" }, { status: 404 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query =
      searchParams.get("code") ||
      searchParams.get("barcode") ||
      searchParams.get("product_id") ||
      searchParams.get("query") ||
      "";

    return await handleBarcodeSearch(query);
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const query =
      body.code ||
      body.barcode ||
      body.product_id ||
      body.query ||
      "";

    return await handleBarcodeSearch(String(query));
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
