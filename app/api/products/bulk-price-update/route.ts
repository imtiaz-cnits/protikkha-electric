import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST: Bulk update product prices by percentage (%)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();

    const {
      brand_id,
      product_ids,
      percentage,
      target_field = "sell_price", // "sell_price" | "cost_price" | "both"
    } = body;

    const pct = parseFloat(String(percentage));
    if (isNaN(pct) || pct === 0) {
      return NextResponse.json(
        { status: "fail", message: "A valid non-zero percentage is required" },
        { status: 400 }
      );
    }

    const where: any = {};
    if (Array.isArray(product_ids) && product_ids.length > 0) {
      where.id = { in: product_ids.map((id: any) => BigInt(id)) };
    } else if (brand_id) {
      where.brand_id = BigInt(brand_id);
    } else {
      return NextResponse.json(
        { status: "fail", message: "Either product_ids or brand_id must be provided" },
        { status: 400 }
      );
    }

    // Fetch target products
    const productsToUpdate = await prisma.products.findMany({
      where,
      select: {
        id: true,
        product_name: true,
        cost_price: true,
        sell_price: true,
      },
    });

    if (productsToUpdate.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "No products matched the given selection" },
        { status: 404 }
      );
    }

    const multiplier = 1 + pct / 100;

    // Update in transaction
    await prisma.$transaction(async (tx) => {
      for (const prod of productsToUpdate) {
        const updateData: any = {};

        if (target_field === "sell_price" || target_field === "both") {
          const currentSell = parseFloat(prod.sell_price || "0");
          const newSell = Math.max(0, parseFloat((currentSell * multiplier).toFixed(2)));
          updateData.sell_price = String(newSell);
        }

        if (target_field === "cost_price" || target_field === "both") {
          const currentCost = parseFloat(prod.cost_price || "0");
          const newCost = Math.max(0, parseFloat((currentCost * multiplier).toFixed(2)));
          updateData.cost_price = String(newCost);
        }

        await tx.products.update({
          where: { id: prod.id },
          data: updateData,
        });
      }
    });

    return NextResponse.json({
      status: "success",
      message: `Successfully updated prices for ${productsToUpdate.length} products (${pct > 0 ? `+${pct}` : pct}%)`,
      updated_count: productsToUpdate.length,
    });
  } catch (err: any) {
    console.error("Bulk Price Update Error:", err);
    return NextResponse.json(
      { status: "fail", message: err?.message || "Failed to bulk update prices" },
      { status: 500 }
    );
  }
}
