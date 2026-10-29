import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe("DESCRIBE products");
  console.log("Products columns:", cols.map(c => c.Field));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

