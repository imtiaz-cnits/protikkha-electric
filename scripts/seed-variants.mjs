import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedVariants() {
  console.log("Checking product variants...");
  console.log("Models on prisma:", Object.keys(prisma).filter(k => !k.startsWith("$") && !k.startsWith("_")));

  // Check count using prisma.product_variants or raw query
  const countRes = await prisma.$queryRawUnsafe("SELECT COUNT(*) as cnt FROM product_variants");
  const count = Number(countRes[0]?.cnt || 0);

  if (count > 0) {
    console.log(`Product variants already exist (${count}). Skipping.`);
    return;
  }

  // Find cable product
  const cable = await prisma.products.findFirst({
    where: { product_name: { contains: "Wire" } },
  });

  // Find switch product
  const swt = await prisma.products.findFirst({
    where: { product_name: { contains: "Switch" } },
  });

  // Find breaker product
  const brk = await prisma.products.findFirst({
    where: { product_name: { contains: "MCB" } },
  });

  const variantsToCreate = [
    {
      productId: cable?.id || BigInt(19),
      name: "1.5 RM Red (100m Coil)",
      sku: "VAR-WIR-RED",
      barcode: "89411001001",
      costPrice: "42",
      sellPrice: "48",
      wholesalePrice: "45",
      stock: "200",
      attrs: { color: "Red", size: "1.5 RM", length: "100m" },
    },
    {
      productId: cable?.id || BigInt(19),
      name: "1.5 RM Black (100m Coil)",
      sku: "VAR-WIR-BLK",
      barcode: "89411001002",
      costPrice: "42",
      sellPrice: "48",
      wholesalePrice: "45",
      stock: "150",
      attrs: { color: "Black", size: "1.5 RM", length: "100m" },
    },
    {
      productId: swt?.id || BigInt(20),
      name: "Premier 1-Gang Matte White",
      sku: "VAR-SWT-WHT",
      barcode: "89412001001",
      costPrice: "90",
      sellPrice: "115",
      wholesalePrice: "102",
      stock: "80",
      attrs: { finish: "Matte White", rating: "10A" },
    },
    {
      productId: brk?.id || BigInt(21),
      name: "Easy9 16A 1P C-Curve 6kA",
      sku: "VAR-BRK-16A",
      barcode: "89413001001",
      costPrice: "240",
      sellPrice: "310",
      wholesalePrice: "275",
      stock: "60",
      attrs: { rating: "16A", curve: "C", poles: "1P" },
    },
  ];

  for (const v of variantsToCreate) {
    if (prisma.product_variants) {
      await prisma.product_variants.create({
        data: {
          product_id: v.productId,
          variant_name: v.name,
          sku: v.sku,
          barcode: v.barcode,
          cost_price: v.costPrice,
          sell_price: v.sellPrice,
          wholesale_price: v.wholesalePrice,
          stock_quantity: v.stock,
          status: "active",
          attributes: v.attrs,
        },
      });
    } else {
      // Direct raw insert fallback to ensure 100% reliability
      await prisma.$executeRawUnsafe(
        "INSERT INTO product_variants (product_id, variant_name, sku, barcode, cost_price, sell_price, wholesale_price, stock_quantity, status, attributes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        v.productId,
        v.name,
        v.sku,
        v.barcode,
        v.costPrice,
        v.sellPrice,
        v.wholesalePrice,
        v.stock,
        "active",
        JSON.stringify(v.attrs)
      );
    }
  }

  console.log("Created 4 sample product variants successfully.");
}

seedVariants()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Variants seed failed:", err);
    process.exit(1);
  });
