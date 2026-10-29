import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding electrical products for POS...");

  // 1. Get or create category
  let cat = await prisma.categories.findFirst({
    where: { category_name: "Electrical & Fittings" },
  });
  if (!cat) {
    cat = await prisma.categories.create({
      data: {
        category_name: "Electrical & Fittings",
        user_id: 1n,
        status: "active",
      },
    });
  }

  // 2. Get or create brand
  let brand = await prisma.brands.findFirst({
    where: { name: "Protikkha Standard" },
  });
  if (!brand) {
    brand = await prisma.brands.create({
      data: {
        name: "Protikkha Standard",
        user_id: 1n,
        status: "active",
      },
    });
  }

  // 3. Get unit Pcs (id 1)
  const unit = await prisma.units.findFirst({ where: { unit_name: "Pcs" } }) || { id: 1n };

  // 4. Products to seed
  const productsToSeed = [
    {
      product_name: "3/4 GI BAN",
      cost_price: "60.00",
      sell_price: "80.00",
      wholesale_price: "72.00",
      quantity: "250",
      product_code: ["GIBAN-34", "8900010034"],
      status: "active",
    },
    {
      product_name: "1\" GI BAN",
      cost_price: "85.00",
      sell_price: "110.00",
      wholesale_price: "100.00",
      quantity: "180",
      product_code: ["GIBAN-100", "8900010100"],
      status: "active",
    },
    {
      product_name: "1.5 RM BYA Red (Single Core Cable)",
      cost_price: "38.00",
      sell_price: "48.00",
      wholesale_price: "44.00",
      quantity: "800",
      product_code: ["BYA-15-RED", "8900010150"],
      status: "active",
    },
    {
      product_name: "2.5 RM BYA Black (Single Core Cable)",
      cost_price: "62.00",
      sell_price: "78.00",
      wholesale_price: "72.00",
      quantity: "600",
      product_code: ["BYA-25-BLK", "8900010250"],
      status: "active",
    },
    {
      product_name: "Super Star 1 Gang 1 Way Switch",
      cost_price: "105.00",
      sell_price: "135.00",
      wholesale_price: "120.00",
      quantity: "150",
      product_code: ["SS-1G1W", "8900010301"],
      status: "active",
    },
    {
      product_name: "Super Star 2 Gang 1 Way Switch",
      cost_price: "150.00",
      sell_price: "195.00",
      wholesale_price: "175.00",
      quantity: "120",
      product_code: ["SS-2G1W", "8900010302"],
      status: "active",
    },
    {
      product_name: "Schneider 16A 1P MCB Circuit Breaker",
      cost_price: "295.00",
      sell_price: "380.00",
      wholesale_price: "340.00",
      quantity: "60",
      product_code: ["MCB-16A-1P", "8900010416"],
      status: "active",
    },
    {
      product_name: "Schneider 32A 2P MCB Circuit Breaker",
      cost_price: "610.00",
      sell_price: "750.00",
      wholesale_price: "690.00",
      quantity: "45",
      product_code: ["MCB-32A-2P", "8900010432"],
      status: "active",
    },
    {
      product_name: "12W LED Bulb (Cool Daylight)",
      cost_price: "135.00",
      sell_price: "180.00",
      wholesale_price: "160.00",
      quantity: "140",
      product_code: ["LED-12W-CDL", "8900010512"],
      status: "active",
    },
    {
      product_name: "3/4 PVC Conduit Pipe (10 Feet Heavy)",
      cost_price: "75.00",
      sell_price: "95.00",
      wholesale_price: "85.00",
      quantity: "300",
      product_code: ["PVC-34-10FT", "8900010634"],
      status: "active",
    },
  ];

  for (const item of productsToSeed) {
    const existing = await prisma.products.findFirst({
      where: { product_name: item.product_name },
    });

    if (existing) {
      await prisma.products.update({
        where: { id: existing.id },
        data: {
          cost_price: item.cost_price,
          sell_price: item.sell_price,
          wholesale_price: item.wholesale_price,
          quantity: item.quantity,
          status: "active",
        },
      });
      console.log(`Updated product: ${item.product_name}`);
    } else {
      await prisma.products.create({
        data: {
          product_name: item.product_name,
          cost_price: item.cost_price,
          sell_price: item.sell_price,
          wholesale_price: item.wholesale_price,
          quantity: item.quantity,
          product_code: item.product_code,
          category_id: cat.id,
          brand_id: brand.id,
          unit_id: unit.id,
          user_id: 1n,
          status: "active",
        },
      });
      console.log(`Created product: ${item.product_name}`);
    }
  }

  console.log("Electrical POS products seeded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

