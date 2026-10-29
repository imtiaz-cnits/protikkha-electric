import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe("CREATE DATABASE IF NOT EXISTS protikkha_electric_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
  console.log("Database protikkha_electric_db created successfully!");
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error creating database:", err);
  process.exit(1);
});
