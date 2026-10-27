import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Check if admin already exists
  const existingAdmin = await prisma.users.findFirst({
    where: { email: "admin@gmail.com" },
  });

  if (!existingAdmin) {
    const admin = await prisma.users.create({
      data: {
        name: "Admin",
        email: "admin@gmail.com",
        mobile: "01975-703216",
        password: hashedPassword,
        role: "admin",
        status: "approved",
        otp: "000000",
        permissions: JSON.stringify({
          pos: true,
          products: true,
          purchases: true,
          invoices: true,
          customers: true,
          suppliers: true,
          expenses: true,
          reports: true,
          users: true,
        }),
      },
    });
    console.log("Admin user created:", admin.email);
  } else {
    // Update password to admin123
    await prisma.users.update({
      where: { id: existingAdmin.id },
      data: {
        password: hashedPassword,
        status: "approved",
      },
    });
    console.log("Admin user updated with password 'admin123'");
  }

  // Create default Brand, Category, Unit if not present
  const adminUser = await prisma.users.findFirst({ where: { email: "admin@gmail.com" } });
  if (adminUser) {
    const brandCount = await prisma.brands.count();
    if (brandCount === 0) {
      await prisma.brands.create({
        data: {
          name: "General",
          status: "active",
          user_id: adminUser.id,
        },
      });
      console.log("Default brand created");
    }

    const catCount = await prisma.categories.count();
    if (catCount === 0) {
      await prisma.categories.create({
        data: {
          category_name: "General",
          status: "active",
          user_id: adminUser.id,
        },
      });
      console.log("Default category created");
    }

    const unitCount = await prisma.units.count();
    if (unitCount === 0) {
      await prisma.units.create({
        data: {
          unit_name: "Pcs",
          status: "active",
          user_id: adminUser.id,
        },
      });
      console.log("Default unit created");
    }
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
