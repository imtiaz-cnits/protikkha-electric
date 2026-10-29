import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const dbs = await prisma.$queryRawUnsafe("SHOW DATABASES;");
  console.log("Databases:", dbs);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
