import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prodId = BigInt(id);

    const product = await prisma.products.findUnique({
      where: { id: prodId },
      include: {
        categories: true,
        brands: true,
        units: true,
        sub_categories: true,
        electrical_specifications: true,
        packaging_conversions: true,
      },
    });

    if (!product) {
      return NextResponse.json({ status: "fail", message: "Product not found" }, { status: 404 });
    }

    const spec = product.electrical_specifications;
    const conversions = (product.packaging_conversions || []).map((c) => ({
      id: Number(c.id),
      packaging_unit: c.packaging_unit,
      base_unit: c.base_unit,
      conversion_ratio: parseFloat(c.conversion_ratio.toString()),
      is_default: Boolean(c.is_default),
    }));

    return NextResponse.json({
      status: "success",
      data: {
        ...product,
        id: Number(product.id),
        brand_id: Number(product.brand_id),
        category_id: Number(product.category_id),
        sub_category_id: product.sub_category_id ? Number(product.sub_category_id) : null,
        unit_id: product.unit_id ? Number(product.unit_id) : null,
        user_id: Number(product.user_id),
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
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prodId = BigInt(id);
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
      // Electrical spec fields
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
      // Packaging conversion fields
      packaging_unit,
      conversion_ratio,
      // Legacy fields
      tile_size,
      sqft_per_box,
      pcs_per_box,
      grade,
      surface_finish,
    } = body;

    const updated = await prisma.products.update({
      where: { id: prodId },
      data: {
        product_name: product_name ? product_name.trim() : undefined,
        product_code: product_code !== undefined ? product_code : undefined,
        cost_price: cost_price !== undefined ? String(cost_price) : undefined,
        sell_price: sell_price !== undefined ? String(sell_price) : undefined,
        wholesale_price: wholesale_price !== undefined ? (wholesale_price ? String(wholesale_price) : null) : undefined,
        quantity: quantity !== undefined ? String(quantity) : undefined,
        brand_id: brand_id ? BigInt(brand_id) : undefined,
        category_id: category_id ? BigInt(category_id) : undefined,
        sub_category_id: sub_category_id !== undefined ? (sub_category_id ? BigInt(sub_category_id) : null) : undefined,
        unit_id: unit_id !== undefined ? (unit_id ? BigInt(unit_id) : null) : undefined,
        img_url: img_url !== undefined ? img_url : undefined,
        status: status !== undefined ? status : undefined,
        tile_size: tile_size !== undefined ? (tile_size ? String(tile_size).trim() : null) : undefined,
        sqft_per_box: sqft_per_box !== undefined ? (sqft_per_box ? String(sqft_per_box).trim() : null) : undefined,
        pcs_per_box: pcs_per_box !== undefined ? (pcs_per_box ? String(pcs_per_box).trim() : null) : undefined,
        grade: grade !== undefined ? (grade ? String(grade).trim() : null) : undefined,
        surface_finish: surface_finish !== undefined ? (surface_finish ? String(surface_finish).trim() : null) : undefined,
      },
    });

    // Upsert electrical specifications if any field provided
    const hasSpecFields =
      spec_type ||
      cable_size !== undefined ||
      current_rating !== undefined ||
      wattage !== undefined ||
      gang_module !== undefined ||
      conduit_diameter !== undefined ||
      warranty_months !== undefined;

    if (hasSpecFields) {
      await prisma.electrical_specifications.upsert({
        where: { product_id: prodId },
        create: {
          product_id: prodId,
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
        update: {
          spec_type: spec_type || undefined,
          conductor_material: conductor_material !== undefined ? conductor_material : undefined,
          cable_size: cable_size !== undefined ? cable_size : undefined,
          core_count: core_count !== undefined ? parseInt(String(core_count)) : undefined,
          voltage_grade: voltage_grade !== undefined ? voltage_grade : undefined,
          current_rating: current_rating !== undefined ? current_rating : undefined,
          pole_type: pole_type !== undefined ? pole_type : undefined,
          breaking_capacity: breaking_capacity !== undefined ? breaking_capacity : undefined,
          tripping_curve: tripping_curve !== undefined ? tripping_curve : undefined,
          gang_module: gang_module !== undefined ? gang_module : undefined,
          conduit_diameter: conduit_diameter !== undefined ? conduit_diameter : undefined,
          wattage: wattage !== undefined ? wattage : undefined,
          color_temperature: color_temperature !== undefined ? color_temperature : undefined,
          warranty_months: warranty_months !== undefined ? parseInt(String(warranty_months)) : undefined,
        },
      });
    }

    // Upsert packaging conversion if provided
    if (packaging_unit && conversion_ratio && parseFloat(String(conversion_ratio)) > 0) {
      const baseUnit = unit_name ? String(unit_name).trim() : "Piece";
      await prisma.packaging_conversions.upsert({
        where: {
          product_id_packaging_unit: {
            product_id: prodId,
            packaging_unit: String(packaging_unit).trim(),
          },
        },
        create: {
          product_id: prodId,
          packaging_unit: String(packaging_unit).trim(),
          base_unit: baseUnit,
          conversion_ratio: String(conversion_ratio),
          is_default: true,
        },
        update: {
          base_unit: baseUnit,
          conversion_ratio: String(conversion_ratio),
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Electrical product updated successfully",
      data: {
        ...updated,
        id: Number(updated.id),
        brand_id: Number(updated.brand_id),
        category_id: Number(updated.category_id),
        sub_category_id: updated.sub_category_id ? Number(updated.sub_category_id) : null,
        unit_id: updated.unit_id ? Number(updated.unit_id) : null,
        user_id: Number(updated.user_id),
      },
    });
  } catch (error: any) {
    console.error("Product Update Error:", error);
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prodId = BigInt(id);

    const [orderCount, purchaseCount, returnCount, challanCount] = await Promise.all([
      prisma.order_details.count({ where: { product_id: prodId } }),
      prisma.purchase_order_details.count({ where: { product_id: prodId } }),
      prisma.product_returns.count({ where: { product_id: prodId } }),
      prisma.challan_items.count({ where: { product_id: prodId } }),
    ]);

    if (orderCount > 0 || purchaseCount > 0 || returnCount > 0 || challanCount > 0) {
      return NextResponse.json(
        {
          status: "fail",
          message: `Cannot delete product because it has active transaction records (${orderCount} sales, ${purchaseCount} purchases, ${returnCount} returns, ${challanCount} challans).`,
        },
        { status: 400 }
      );
    }

    await prisma.products.delete({
      where: { id: prodId },
    });

    return NextResponse.json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to delete product" },
      { status: 500 }
    );
  }
}
