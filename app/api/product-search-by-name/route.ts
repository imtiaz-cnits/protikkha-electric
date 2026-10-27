import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function handleSearch(query: string) {
  if (!query || query.trim() === "") {
    return NextResponse.json({ status: "success", data: [] });
  }

  const q = query.trim().toLowerCase();

  const products = await prisma.products.findMany({
    where: {
      status: "active",
      OR: [
        { product_name: { contains: q } },
      ],
    },
    take: 25,
    include: {
      categories: true,
      brands: true,
      units: true,
    },
  });

  const formatted = products.map((p) => {
    let codes: string[] = [];
    if (p.product_code) {
      try {
        codes = Array.isArray(p.product_code) ? p.product_code : JSON.parse(String(p.product_code));
      } catch {
        codes = [String(p.product_code)];
      }
    }

    let displayName = p.product_name;

    return {
      id: Number(p.id),
      name: displayName,
      product_name: p.product_name,
      product_code: codes[0] || "",
      display_codes: codes.join(", "),
      all_codes: codes,
      cost_price: parseFloat(p.cost_price || "0"),
      sell_price: parseFloat(p.sell_price || "0"),
      quantity: parseFloat(p.quantity || "0"),
      tile_size: p.tile_size || null,
      sqft_per_box: p.sqft_per_box ? parseFloat(p.sqft_per_box) : null,
      pcs_per_box: p.pcs_per_box ? parseInt(p.pcs_per_box) : null,
      grade: p.grade || null,
      surface_finish: p.surface_finish || null,
      img_url: p.img_url,
      unit: p.units?.unit_name || "Pcs",
    };
  });

  return NextResponse.json({
    status: "success",
    data: formatted,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query") || searchParams.get("q") || "";
  return handleSearch(query);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = body.query || body.q || "";
    return handleSearch(query);
  } catch {
    return handleSearch("");
  }
}
