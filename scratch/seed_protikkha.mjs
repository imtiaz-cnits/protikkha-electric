import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding clean electrical data into protikkha_electric_db...");

  // Clear existing if any
  await prisma.warranty_records.deleteMany({});
  await prisma.quotation_items.deleteMany({});
  await prisma.project_quotations.deleteMany({});
  await prisma.order_payment_details.deleteMany({});
  await prisma.order_details.deleteMany({});
  await prisma.orders.deleteMany({});
  await prisma.packaging_conversions.deleteMany({});
  await prisma.electrical_specifications.deleteMany({});
  await prisma.products.deleteMany({});
  await prisma.categories.deleteMany({});
  await prisma.brands.deleteMany({});
  await prisma.units.deleteMany({});
  await prisma.suppliers.deleteMany({});
  await prisma.customers.deleteMany({});
  await prisma.expense_types.deleteMany({});
  await prisma.users.deleteMany({});

  // 1. Password Hashing
  const adminPasswordHash = await bcrypt.hash("123456", 10);

  // 2. Super Admin User
  const admin = await prisma.users.create({
    data: {
      id: BigInt(1),
      name: "Super Admin",
      email: "admin@protikkhaelectric.com",
      mobile: "01700000000",
      password: adminPasswordHash,
      role: "admin",
      status: "approved",
      otp: "000000",
      permissions: JSON.stringify({
        pos: true,
        products: true,
        purchases: true,
        customers: true,
        expenses: true,
        reports: true,
        users: true,
      }),
    },
  });
  console.log("Super Admin user created: 01700000000 / 123456");

  // 3. Staff Users
  const manager = await prisma.users.create({
    data: {
      id: BigInt(2),
      name: "Rahim Chowdhury",
      email: "manager@protikkhaelectric.com",
      mobile: "01711001122",
      password: adminPasswordHash,
      role: "manager",
      status: "approved",
      otp: "000000",
    },
  });

  const cashier = await prisma.users.create({
    data: {
      id: BigInt(3),
      name: "Tanvir Ahmed",
      email: "cashier@protikkhaelectric.com",
      mobile: "01722002233",
      password: adminPasswordHash,
      role: "cashier",
      status: "approved",
      otp: "000000",
    },
  });
  console.log("Manager and Cashier staff created.");

  // 4. Units
  const meterUnit = await prisma.units.create({
    data: { unit_name: "Meter", status: "active", user_id: admin.id },
  });
  const reelUnit = await prisma.units.create({
    data: { unit_name: "Reel", status: "active", user_id: admin.id },
  });
  const pcsUnit = await prisma.units.create({
    data: { unit_name: "Pcs", status: "active", user_id: admin.id },
  });
  const boxUnit = await prisma.units.create({
    data: { unit_name: "Box", status: "active", user_id: admin.id },
  });
  console.log("Units created.");

  // 5. Categories
  const catWires = await prisma.categories.create({
    data: { category_name: "Wires & Cables", status: "active", user_id: admin.id },
  });
  const catSwitches = await prisma.categories.create({
    data: { category_name: "Switches & Sockets", status: "active", user_id: admin.id },
  });
  const catBreakers = await prisma.categories.create({
    data: { category_name: "Circuit Breakers & Protection", status: "active", user_id: admin.id },
  });
  console.log("Categories created.");

  // 6. Brands
  const brandBrb = await prisma.brands.create({
    data: { name: "BRB Cable Industries", status: "active", user_id: admin.id },
  });
  const brandSuperstar = await prisma.brands.create({
    data: { name: "Super Star Group", status: "active", user_id: admin.id },
  });
  const brandSchneider = await prisma.brands.create({
    data: { name: "Schneider Electric", status: "active", user_id: admin.id },
  });
  console.log("Brands created.");

  // 7. Products with Electrical Specifications & Packaging Conversions
  // Product 1: BRB Wire
  const prod1 = await prisma.products.create({
    data: {
      product_name: "BRB 1.5 RM Single Core Copper Wire (Red)",
      product_code: JSON.stringify(["WIR-1.5RM-RED", "890123456001"]),
      cost_price: "35.00",
      sell_price: "45.00",
      quantity: "850.00",
      category_id: catWires.id,
      brand_id: brandBrb.id,
      unit_id: meterUnit.id,
      user_id: admin.id,
      status: "active",
      electrical_specifications: {
        create: {
          spec_type: "CABLE",
          cable_size: "1.5 RM",
          conductor_material: "COPPER",
          voltage_grade: "450/750V",
          warranty_months: 60,
        },
      },
      packaging_conversions: {
        create: {
          packaging_unit: "Reel",
          base_unit: "Meter",
          conversion_ratio: 100,
          is_default: true,
        },
      },
    },
  });

  // Product 2: Super Star Switch
  const prod2 = await prisma.products.create({
    data: {
      product_name: "Super Star Premier 1-Gang Switch",
      product_code: JSON.stringify(["SW-1G-PREM", "890123456002"]),
      cost_price: "140.00",
      sell_price: "185.00",
      quantity: "120.00",
      category_id: catSwitches.id,
      brand_id: brandSuperstar.id,
      unit_id: pcsUnit.id,
      user_id: admin.id,
      status: "active",
      electrical_specifications: {
        create: {
          spec_type: "SWITCH",
          gang_module: "1-Gang",
          current_rating: "10A",
          voltage_grade: "250V",
          warranty_months: 24,
        },
      },
      packaging_conversions: {
        create: {
          packaging_unit: "Box",
          base_unit: "Pcs",
          conversion_ratio: 10,
          is_default: true,
        },
      },
    },
  });

  // Product 3: Schneider MCB Breaker
  const prod3 = await prisma.products.create({
    data: {
      product_name: "Schneider Easy9 16A Single Pole MCB",
      product_code: JSON.stringify(["MCB-16A-SP", "890123456003"]),
      cost_price: "360.00",
      sell_price: "460.00",
      quantity: "65.00",
      category_id: catBreakers.id,
      brand_id: brandSchneider.id,
      unit_id: pcsUnit.id,
      user_id: admin.id,
      status: "active",
      electrical_specifications: {
        create: {
          spec_type: "BREAKER",
          pole_type: "SP (1-Pole)",
          current_rating: "16A",
          breaking_capacity: "6kA",
          tripping_curve: "C-Curve",
          warranty_months: 36,
        },
      },
      packaging_conversions: {
        create: {
          packaging_unit: "Box",
          base_unit: "Pcs",
          conversion_ratio: 12,
          is_default: true,
        },
      },
    },
  });
  console.log("Electrical products created with specs and packaging conversions.");

  // 8. Suppliers
  const sup1 = await prisma.suppliers.create({
    data: {
      supplier_id: "SUPP-1001",
      name: "Eastern Electrical Syndicate",
      company: "Eastern Cable Distributors Ltd",
      mobile: "01811223344",
      email: "eastern@electrical.com",
      address: "Nawabpur Road, Dhaka",
      purchase_payable_amount: "0",
      status: "active",
      user_id: admin.id,
    },
  });

  const sup2 = await prisma.suppliers.create({
    data: {
      supplier_id: "SUPP-1002",
      name: "National Switch & Gear Agency",
      company: "National Electric Co.",
      mobile: "01711223344",
      email: "national@gears.com",
      address: "Stadium Market, Dhaka",
      purchase_payable_amount: "0",
      status: "active",
      user_id: admin.id,
    },
  });
  console.log("Suppliers created.");

  // 9. Customers
  const cust1 = await prisma.customers.create({
    data: {
      customer_id: "CUST-1001",
      customer_name: "Al-Amin Electrical Works",
      mobile: "01911223344",
      email: "alamin@contractor.com",
      address_details: "Gulshan-1, Dhaka",
      previous_due_amount: "0",
      user_id: admin.id,
    },
  });

  const cust2 = await prisma.customers.create({
    data: {
      customer_id: "CUST-1002",
      customer_name: "Master Electrician Rafiq",
      mobile: "01611223344",
      email: "rafiq@electrician.com",
      address_details: "Mirpur-10, Dhaka",
      previous_due_amount: "0",
      user_id: admin.id,
    },
  });
  console.log("Customers created.");

  // 10. Expense Types
  await prisma.expense_types.create({
    data: { type_name: "Shop Rent & Electricity", status: "active", user_id: admin.id },
  });
  await prisma.expense_types.create({
    data: { type_name: "Staff Salary & Allowances", status: "active", user_id: admin.id },
  });
  console.log("Expense types created.");

  // 11. Sample POS Retail Order & Invoice
  const sampleOrder = await prisma.orders.create({
    data: {
      order_no: "ORD-20261028-1001",
      customer_id: cust1.id,
      sub_total: "6750.00",
      discount_amount: "0.00",
      delivery_charge: "0.00",
      paid_amount: "6750.00",
      due_amount: "0.00",
      previous_due_amount: "0.00",
      invoice_date: new Date(),
      user_id: cashier.id,
      order_details: {
        create: [
          {
            product_id: prod1.id,
            quantity: "150.00",
            price: "35.00",
            selling_price: "45.00",
            user_id: cashier.id,
          },
        ],
      },
      order_payment_details: {
        create: [
          {
            paid_amount: "6750.00",
            payment_method: "Cash",
            payment_status: "Paid",
            user_id: cashier.id,
          },
        ],
      },
    },
  });

  // 12. Sample Warranty Card
  await prisma.warranty_records.create({
    data: {
      product_id: prod3.id,
      customer_id: cust1.id,
      order_id: sampleOrder.id,
      serial_number: "SCH-E9-994821",
      purchase_date: new Date(),
      warranty_months: 36,
      expiry_date: new Date(Date.now() + 36 * 30 * 24 * 60 * 60 * 1000),
      status: "ACTIVE",
    },
  });

  // 13. Sample Contractor Quotation
  await prisma.project_quotations.create({
    data: {
      quotation_no: "QUO-20261028-001",
      project_name: "Gulshan Residence Electrification",
      client_name: cust1.customer_name,
      client_phone: cust1.mobile,
      client_address: cust1.address_details,
      contractor_name: "Master Electrician Rafiq",
      contractor_phone: "01611223344",
      commission_percent: "5.00",
      commission_amount: "1205.00",
      subtotal: "24100.00",
      discount_amount: "0.00",
      estimated_total: "24100.00",
      status: "APPROVED",
      validity_days: 15,
      expiry_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      user_id: admin.id,
      quotation_items: {
        create: [
          {
            product_id: prod1.id,
            item_name: "BRB 1.5 RM Wire (Coil)",
            quantity: "5.00",
            packaging_unit: "Reel",
            unit_price: "3200.00",
            total_price: "16000.00",
          },
          {
            product_id: prod2.id,
            item_name: "Super Star Premier 1-Gang Switch",
            quantity: "20.00",
            packaging_unit: "Pcs",
            unit_price: "180.00",
            total_price: "3600.00",
          },
          {
            product_id: prod3.id,
            item_name: "Schneider Easy9 16A SP MCB",
            quantity: "10.00",
            packaging_unit: "Pcs",
            unit_price: "450.00",
            total_price: "4500.00",
          },
        ],
      },
    },
  });

  console.log("Seeding completed successfully in protikkha_electric_db!");
  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
