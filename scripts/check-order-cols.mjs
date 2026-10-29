import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const orderCols = await prisma.$queryRawUnsafe("DESCRIBE orders");
  console.log("Orders columns:", orderCols.map(c => c.Field));
  const detailCols = await prisma.$queryRawUnsafe("DESCRIBE order_details");
  console.log("Order_details columns:", detailCols.map(c => c.Field));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

