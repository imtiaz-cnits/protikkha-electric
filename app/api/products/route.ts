import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canViewCostPrice } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// Helper: parse product_code safely into array of strings
function parseCodes(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.map(String) : [String(raw)];
  } catch {
    return [String(raw)];
  }
}

// GET: Product List with eager loading & newest first (Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    const allowCostView = authUser ? canViewCostPrice(authUser.role, authUser.permissions) : true;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const categoryId = searchParams.get("category_id");
    const brandId = searchParams.get("brand_id");
    const specType = searchParams.get("spec_type");
    const limitParam = searchParams.get("limit");
    const limit = limitParam && limitParam !== "all" && !isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

    const where: any = {};
    if (categoryId) where.category_id = BigInt(categoryId);
    if (brandId) where.brand_id = BigInt(brandId);
    if (specType && specType !== "all") {
      where.electrical_specifications = {
        spec_type: specType,
      };
    }

    const products = await prisma.products.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      orderBy: { id: "desc" }, // Strict Rule: Latest records on top
      include: {
        categories: true,
        brands: true,
        units: true,
        sub_categories: true,
        electrical_specifications: true,
        packaging_conversions: true,
      },
    });

    let formatted = products.map((p) => {
      const codes = parseCodes(p.product_code);
      const primaryCode = codes.length > 0 ? codes[0] : "";
      const displayCodes = codes.join(", ");

      const spec = p.electrical_specifications;
      const conversions = (p.packaging_conversions || []).map((c) => ({
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
        primary_code: primaryCode,
        display_codes: displayCodes,
        all_codes: codes,
        cost_price: allowCostView ? parseFloat(p.cost_price || "0") : null,
        sell_price: parseFloat(p.sell_price || "0"),
        wholesale_price: p.wholesale_price ? parseFloat(p.wholesale_price) : null,
        quantity: parseFloat(p.quantity || "0"),
        status: p.status,
        img_url: p.img_url,
        brand_id: Number(p.brand_id),
        category_id: Number(p.category_id),
        unit_id: p.unit_id ? Number(p.unit_id) : null,
        sub_category_id: p.sub_category_id ? Number(p.sub_category_id) : null,
        category: p.categories?.category_name || "N/A",
        brand: p.brands?.name || "N/A",
        unit: p.units?.unit_name || "Pcs",
        created_at: p.created_at,
        // Electrical Specifications
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
        // Packaging conversions
        packaging_conversions: conversions,
        // Legacy fields preserved for backward compatibility
        tile_size: p.tile_size || null,
        sqft_per_box: p.sqft_per_box ? parseFloat(p.sqft_per_box) : null,
        pcs_per_box: p.pcs_per_box ? parseInt(p.pcs_per_box) : null,
        grade: p.grade || null,
        surface_finish: p.surface_finish || null,
      };
    });

    // Client-side text filter if search parameter passed
    if (search) {
      formatted = formatted.filter((p) => {
        const spec = p.electrical_spec;
        const specSearch = spec
          ? [
              spec.spec_type,
              spec.cable_size,
              spec.current_rating,
              spec.wattage,
              spec.gang_module,
              spec.voltage_grade,
              spec.conduit_diameter,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase()
          : "";

        return (
          p.product_name.toLowerCase().includes(search) ||
          p.display_codes.toLowerCase().includes(search) ||
          (p.brand && p.brand.toLowerCase().includes(search)) ||
          (p.category && p.category.toLowerCase().includes(search)) ||
          specSearch.includes(search) ||
          String(p.id) === search
        );
      });
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Products GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load products" },
      { status: 500 }
    );
  }
}

// POST: Create Product with multi-barcode & electrical specifications
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const {
      product_name,
      product_code,
      cost_price,
      sell_price,
      wholesale_price,
      quantity,
      brand_id,
      category_id,
      sub_category_id,
      unit_id,
      unit_name,
      img_url,
      status,
      // Electrical specifications
      spec_type,
      conductor_material,
      cable_size,
      core_count,
      voltage_grade,
      current_rating,
      pole_type,
      breaking_capacity,
      tripping_curve,
      gang_module,
      conduit_diameter,
      wattage,
      color_temperature,
      warranty_months,
      // Packaging conversion
      packaging_unit,
      conversion_ratio,
      // Legacy fields
      tile_size,
      sqft_per_box,
      pcs_per_box,
      grade,
      surface_finish,
    } = body;

    if (!product_name || !brand_id || !category_id) {
      return NextResponse.json(
        { status: "fail", message: "Product name, brand, and category are required" },
        { status: 400 }
      );
    }

    // Auto-generate barcode if not provided
    let finalCodes: string[] = [];
    if (Array.isArray(product_code) && product_code.length > 0) {
      finalCodes = product_code.map(String).map((c) => c.trim()).filter(Boolean);
    } else if (typeof product_code === "string" && product_code.trim()) {
      finalCodes = [product_code.trim()];
    }

    if (finalCodes.length === 0) {
      const maxProduct = await prisma.products.findFirst({
        orderBy: { id: "desc" },
        select: { id: true },
      });
      const nextId = (maxProduct ? Number(maxProduct.id) : 0) + 1;
      finalCodes = [`PE-${String(nextId).padStart(5, "0")}`];
    }

    // Create product
    const newProduct = await prisma.products.create({
      data: {
        product_name: product_name.trim(),
        product_code: finalCodes as any, // stored as json array
        cost_price: String(cost_price || "0"),
        sell_price: String(sell_price || "0"),
        wholesale_price: wholesale_price ? String(wholesale_price) : null,
        quantity: String(quantity || "0"),
        brand_id: BigInt(brand_id),
        category_id: BigInt(category_id),
        sub_category_id: sub_category_id ? BigInt(sub_category_id) : null,
        unit_id: unit_id ? BigInt(unit_id) : null,
        img_url: img_url || null,
        status: status || "active",
        user_id: BigInt(userId),
        // Preserve legacy fields safely
        tile_size: tile_size ? String(tile_size).trim() : null,
        sqft_per_box: sqft_per_box ? String(sqft_per_box).trim() : null,
        pcs_per_box: pcs_per_box ? String(pcs_per_box).trim() : null,
        grade: grade ? String(grade).trim() : null,
        surface_finish: surface_finish ? String(surface_finish).trim() : null,
      },
    });

    // If electrical specifications are provided, create them
    let createdSpec = null;
    const hasSpecFields =
      spec_type ||
      cable_size ||
      current_rating ||
      wattage ||
      gang_module ||
      conduit_diameter ||
      voltage_grade ||
      warranty_months;

    if (hasSpecFields) {
      createdSpec = await prisma.electrical_specifications.create({
        data: {
          product_id: newProduct.id,
          spec_type: spec_type || "GENERAL",
          conductor_material: conductor_material || null,
          cable_size: cable_size || null,
          core_count: core_count ? parseInt(String(core_count)) : 1,
          voltage_grade: voltage_grade || null,
          current_rating: current_rating || null,
          pole_type: pole_type || null,
          breaking_capacity: breaking_capacity || null,
          tripping_curve: tripping_curve || null,
          gang_module: gang_module || null,
          conduit_diameter: conduit_diameter || null,
          wattage: wattage || null,
          color_temperature: color_temperature || null,
          warranty_months: warranty_months ? parseInt(String(warranty_months)) : 0,
        },
      });
    }

    // If packaging unit and conversion ratio are provided, create conversion
    let createdPackaging = null;
    if (packaging_unit && conversion_ratio && parseFloat(String(conversion_ratio)) > 0) {
      const baseUnit = unit_name ? String(unit_name).trim() : "Piece";
      createdPackaging = await prisma.packaging_conversions.create({
        data: {
          product_id: newProduct.id,
          packaging_unit: String(packaging_unit).trim(),
          base_unit: baseUnit,
          conversion_ratio: String(conversion_ratio),
          is_default: true,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Electrical product created successfully",
      data: {
        ...newProduct,
        id: Number(newProduct.id),
        brand_id: Number(newProduct.brand_id),
        category_id: Number(newProduct.category_id),
        sub_category_id: newProduct.sub_category_id ? Number(newProduct.sub_category_id) : null,
        unit_id: newProduct.unit_id ? Number(newProduct.unit_id) : null,
        user_id: Number(newProduct.user_id),
        electrical_spec: createdSpec ? { ...createdSpec, id: Number(createdSpec.id) } : null,
        packaging_conversions: createdPackaging
          ? [
              {
                id: Number(createdPackaging.id),
                packaging_unit: createdPackaging.packaging_unit,
                base_unit: createdPackaging.base_unit,
                conversion_ratio: parseFloat(createdPackaging.conversion_ratio.toString()),
                is_default: Boolean(createdPackaging.is_default),
              },
            ]
          : [],
      },
    });
  } catch (error: any) {
    console.error("Product Create Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create product" },
      { status: 500 }
    );
  }
}
