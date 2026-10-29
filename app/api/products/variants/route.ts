import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Product Variants (Newest first)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("product_id");
    const search = searchParams.get("search")?.trim().toLowerCase();

    const where: any = {};
    if (productId) {
      where.product_id = BigInt(productId);
    }

    const variants = await prisma.product_variants.findMany({
      where,
      orderBy: { id: "desc" },
      include: {
        products: {
          select: {
            id: true,
            product_name: true,
            categories: { select: { category_name: true } },
            brands: { select: { name: true } },
          },
        },
      },
    });

    let formatted = variants.map((v) => ({
      id: Number(v.id),
      product_id: Number(v.product_id),
      product_name: v.products?.product_name || "N/A",
      category_name: v.products?.categories?.category_name || "N/A",
      brand_name: v.products?.brands?.name || "N/A",
      variant_name: v.variant_name,
      sku: v.sku || "",
      barcode: v.barcode || "",
      cost_price: parseFloat(v.cost_price || "0"),
      sell_price: parseFloat(v.sell_price || "0"),
      wholesale_price: parseFloat(v.wholesale_price || "0"),
      stock_quantity: parseFloat(v.stock_quantity || "0"),
      status: v.status,
      attributes: v.attributes,
      created_at: v.created_at,
    }));

    if (search) {
      formatted = formatted.filter(
        (v) =>
          v.variant_name.toLowerCase().includes(search) ||
          v.product_name.toLowerCase().includes(search) ||
          v.sku.toLowerCase().includes(search) ||
          v.barcode.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Variants GET error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load variants" },
      { status: 500 }
    );
  }
}

// POST: Create Product Variant
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_id,
      variant_name,
      sku,
      barcode,
      cost_price,
      sell_price,
      wholesale_price,
      stock_quantity,
      status,
      attributes,
    } = body;

    if (!product_id || !variant_name?.trim()) {
      return NextResponse.json(
        { status: "fail", message: "Product and Variant name are required" },
        { status: 400 }
      );
    }

    // Auto-generate SKU/Barcode if missing
    const finalSku = sku?.trim() || `SKU-VAR-${Date.now().toString().slice(-6)}`;
    const finalBarcode = barcode?.trim() || `BAR-VAR-${Date.now().toString().slice(-6)}`;

    const newVariant = await prisma.product_variants.create({
      data: {
        product_id: BigInt(product_id),
        variant_name: variant_name.trim(),
        sku: finalSku,
        barcode: finalBarcode,
        cost_price: String(cost_price || "0"),
        sell_price: String(sell_price || "0"),
        wholesale_price: String(wholesale_price || sell_price || "0"),
        stock_quantity: String(stock_quantity || "0"),
        status: status || "active",
        attributes: attributes || {},
      },
      include: {
        products: true,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Product variant created successfully",
      data: {
        ...newVariant,
        id: Number(newVariant.id),
        product_id: Number(newVariant.product_id),
      },
    });
  } catch (error: any) {
    console.error("Variant create error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to create variant" },
      { status: 500 }
    );
  }
}
