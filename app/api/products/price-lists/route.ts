import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("category_id");
    const search = searchParams.get("search")?.toLowerCase().trim();

    const where: any = {};
    if (categoryId && categoryId !== "all") {
      where.category_id = BigInt(categoryId);
    }

    const products = await prisma.products.findMany({
      where,
      orderBy: { id: "desc" },
      take: 100,
      include: {
        categories: true,
        brands: true,
        units: true,
        electrical_specifications: true,
      },
    });

    let items = products.map((p) => {
      const cost = parseFloat(p.cost_price || "0");
      const retail = parseFloat(p.sell_price || "0");
      const wholesale = p.wholesale_price ? parseFloat(p.wholesale_price) : Math.round(retail * 0.92);
      const retailMargin = retail > 0 ? (((retail - cost) / retail) * 100).toFixed(1) : "0.0";
      const wholesaleMargin = wholesale > 0 ? (((wholesale - cost) / wholesale) * 100).toFixed(1) : "0.0";

      return {
        id: Number(p.id),
        name: p.product_name,
        code: Array.isArray(p.product_code) ? String(p.product_code[0] || "") : String(p.product_code || ""),
        category: p.categories?.category_name || "General Electrical",
        brand: p.brands?.name || "Standard",
        unit: p.units?.unit_name || "Pcs",
        spec: p.electrical_specifications?.cable_size || p.electrical_specifications?.current_rating || p.electrical_specifications?.wattage || "",
        cost_price: cost,
        retail_price: retail,
        wholesale_price: wholesale,
        retail_margin: retailMargin,
        wholesale_margin: wholesaleMargin,
        status: p.status || "active",
      };
    });

    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          String(i.code).toLowerCase().includes(search) ||
          i.category.toLowerCase().includes(search) ||
          i.brand.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: items,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load price lists" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, retail_price, wholesale_price } = body;

    if (!id) {
      return NextResponse.json({ status: "fail", message: "Product ID required" }, { status: 400 });
    }

    const updated = await prisma.products.update({
      where: { id: BigInt(id) },
      data: {
        sell_price: retail_price !== undefined ? String(retail_price) : undefined,
        wholesale_price: wholesale_price !== undefined ? String(wholesale_price) : undefined,
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Price list updated successfully",
      data: {
        id: Number(updated.id),
        retail_price: parseFloat(updated.sell_price || "0"),
        wholesale_price: updated.wholesale_price ? parseFloat(updated.wholesale_price) : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}
