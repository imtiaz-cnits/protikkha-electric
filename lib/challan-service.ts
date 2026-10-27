import prisma from "@/lib/prisma";

/**
 * Returns current date at midnight UTC representing Bangladesh Business Date (Asia/Dhaka)
 */
export function getBangladeshDate(): Date {
  const bstStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // "YYYY-MM-DD"
  return new Date(`${bstStr}T00:00:00.000Z`);
}

/**
 * Returns Bangladesh date formatted as "YYYY-MM-DD"
 */
export function getBangladeshDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Generates unique Challan Number: CHL-YYYYMMDD-XXXX
 */
export function generateChallanNumber(): string {
  const dateStr = getBangladeshDateString().replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `CHL-${dateStr}-${randomSuffix}`;
}

/**
 * Checks if a category name signifies Tiles.
 * Uses category relationship rather than hardcoded IDs or product names.
 */
export function isTilesCategoryName(categoryName?: string | null): boolean {
  if (!categoryName) return false;
  return categoryName.trim().toLowerCase().includes("tile");
}

/**
 * Returns a Map of productId -> { isTiles: boolean, categoryName: string, product: any }
 */
export async function getProductCategoryMap(
  productIds: (bigint | number)[],
  tx: any = prisma
): Promise<Map<string, { isTiles: boolean; categoryName: string; product: any }>> {
  const uniqueIds = Array.from(new Set(productIds.map((id) => BigInt(id))));
  if (uniqueIds.length === 0) return new Map();

  const prods = await tx.products.findMany({
    where: { id: { in: uniqueIds } },
    include: { categories: true },
  });

  const map = new Map<string, { isTiles: boolean; categoryName: string; product: any }>();
  for (const p of prods) {
    const catName = p.categories?.category_name || "";
    map.set(p.id.toString(), {
      isTiles: isTilesCategoryName(catName),
      categoryName: catName,
      product: p,
    });
  }
  return map;
}

/**
 * Locks product rows in ascending order to prevent deadlocks across concurrent requests.
 * @param productIds List of product IDs to lock
 * @param tx Prisma transaction client
 */
export async function lockProductsAscending(
  productIds: (bigint | number)[],
  tx: any
): Promise<void> {
  const sortedIds = Array.from(new Set(productIds.map((id) => BigInt(id)))).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0
  );

  for (const id of sortedIds) {
    await tx.$queryRawUnsafe("SELECT id, quantity FROM products WHERE id = ? FOR UPDATE", id);
  }
}

/**
 * Calculates currently available stock for a product, factoring in any PENDING_CHALLAN reservations.
 * @param productId Product ID
 * @param tx Prisma transaction client
 */
export async function getAvailableStockWithPendingReservations(
  productId: bigint | number,
  tx: any
): Promise<{ physicalStock: number; reservedStock: number; availableStock: number }> {
  const pid = BigInt(productId);

  // Fetch product physical stock
  const [prod]: any = await tx.$queryRawUnsafe(
    "SELECT id, quantity FROM products WHERE id = ?",
    pid
  );
  if (!prod) {
    throw new Error(`Product ID ${pid} does not exist`);
  }

  const physicalStock = parseFloat(prod.quantity || "0");

  // Sum pending reservations across unfulfilled Tiles order details
  const pendingRows: any = await tx.$queryRawUnsafe(
    "SELECT quantity FROM order_details WHERE product_id = ? AND stock_lifecycle_state = 'PENDING_CHALLAN'",
    pid
  );

  const reservedStock = (pendingRows as any[]).reduce(
    (acc: number, row: any) => acc + parseFloat(row.quantity || "0"),
    0
  );

  const availableStock = Math.max(0, physicalStock - reservedStock);

  return { physicalStock, reservedStock, availableStock };
}
