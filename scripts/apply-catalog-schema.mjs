import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function applyCatalogSchema() {
  console.log("Applying catalog schema updates via Prisma...");

  try {
    // 1. Add wholesale_price column if not exists
    const cols = await prisma.$queryRawUnsafe(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'wholesale_price'
    `);

    if (!Array.isArray(cols) || cols.length === 0) {
      console.log("Adding wholesale_price column to products...");
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `products` ADD COLUMN `wholesale_price` VARCHAR(255) NULL AFTER `sell_price`"
      );
      console.log("wholesale_price column added successfully.");
    } else {
      console.log("wholesale_price column already exists.");
    }

    // 2. Create product_variants table if not exists
    console.log("Ensuring product_variants table exists...");
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`product_variants\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`product_id\` BIGINT UNSIGNED NOT NULL,
        \`variant_name\` VARCHAR(255) NOT NULL,
        \`sku\` VARCHAR(100) NULL,
        \`barcode\` VARCHAR(100) NULL,
        \`attributes\` JSON NULL,
        \`cost_price\` VARCHAR(255) NULL DEFAULT '0',
        \`sell_price\` VARCHAR(255) NOT NULL DEFAULT '0',
        \`wholesale_price\` VARCHAR(255) NULL DEFAULT '0',
        \`stock_quantity\` VARCHAR(255) NULL DEFAULT '0',
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'active',
        \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`product_variants_product_id_idx\` (\`product_id\`),
        INDEX \`product_variants_sku_idx\` (\`sku\`),
        INDEX \`product_variants_barcode_idx\` (\`barcode\`),
        CONSTRAINT \`product_variants_product_id_foreign\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("product_variants table verified successfully.");

    // 3. Verify sub_categories table exists
    const subCat = await prisma.$queryRawUnsafe(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'sub_categories'
    `);
    console.log("sub_categories table status:", Array.isArray(subCat) && subCat.length > 0 ? "EXISTS" : "MISSING");

  } finally {
    await prisma.$disconnect();
  }
}

applyCatalogSchema()
  .then(() => {
    console.log("Catalog Schema Update completed successfully!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Catalog Schema Update failed:", err);
    process.exit(1);
  });
