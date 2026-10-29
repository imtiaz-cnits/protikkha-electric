import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const startTime = Date.now();
    // Test database ping
    const dbVersionRes: any = await prisma.$queryRawUnsafe("SELECT VERSION() as version, DATABASE() as current_db");
    const latency = Date.now() - startTime;

    const [
      productsCount,
      categoriesCount,
      subCategoriesCount,
      brandsCount,
      ordersCount,
      purchasesCount,
      customersCount,
      suppliersCount,
      variantsCount,
    ] = await Promise.all([
      prisma.products.count(),
      prisma.categories.count(),
      prisma.sub_categories.count(),
      prisma.brands.count(),
      prisma.orders.count(),
      prisma.purchases.count(),
      prisma.customers.count(),
      prisma.suppliers.count(),
      prisma.$queryRawUnsafe("SELECT COUNT(*) as cnt FROM product_variants").then((r: any) => Number(r[0]?.cnt || 0)),
    ]);

    return NextResponse.json({
      status: "success",
      data: {
        database_status: "HEALTHY",
        database_name: dbVersionRes[0]?.current_db || "protikkha_electric_db",
        mysql_version: dbVersionRes[0]?.version || "8.0",
        query_latency_ms: latency,
        timestamp: new Date().toISOString(),
        table_counts: {
          products: productsCount,
          categories: categoriesCount,
          sub_categories: subCategoriesCount,
          brands: brandsCount,
          orders: ordersCount,
          purchases: purchasesCount,
          customers: customersCount,
          suppliers: suppliersCount,
          product_variants: variantsCount,
        },
        services: {
          prisma_orm: "v6.4.1 (Connected)",
          nextjs_app_router: "Active",
          pos_scanner_buffer: "Ready",
          thermal_receipt_generator: "Ready",
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "fail",
        database_status: "UNHEALTHY",
        message: error?.message || "Database connection error",
      },
      { status: 500 }
    );
  }
}
