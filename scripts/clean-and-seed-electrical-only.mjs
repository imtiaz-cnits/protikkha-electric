import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function serializeBigInt(obj) {
  return JSON.stringify(
    obj,
    (_key, val) => (typeof val === "bigint" ? val.toString() : val),
    2
  );
}

async function main() {
  console.log("=== Protikkha Electric: Backup, Purge Non-Electrical Data & Multi-Unit Electrical Seed ===");

  // 1. Find primary admin user_id
  const adminUser =
    (await prisma.users.findFirst({ where: { role: "admin" } })) ||
    (await prisma.users.findFirst());
  if (!adminUser) {
    throw new Error("No user found in users table. Cannot seed without user_id.");
  }
  const userId = adminUser.id;

  // 2. Full JSON Backup before deleting any non-electrical data
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupPath = path.join(backupDir, "pre-electrical-cleanup-backup.json");

  if (!fs.existsSync(backupPath)) {
    console.log("1. Backing up existing database records to", backupPath);
    const [
      oldCategories,
      oldSubCategories,
      oldBrands,
      oldUnits,
      oldProducts,
      oldSuppliers,
      oldCustomers,
      oldOrders,
      oldOrderDetails,
      oldPurchases,
      oldBusinessUnits,
    ] = await Promise.all([
      prisma.categories.findMany(),
      prisma.sub_categories.findMany(),
      prisma.brands.findMany(),
      prisma.units.findMany(),
      prisma.products.findMany(),
      prisma.suppliers.findMany(),
      prisma.customers.findMany(),
      prisma.orders.findMany(),
      prisma.order_details.findMany(),
      prisma.purchases.findMany(),
      prisma.business_units.findMany(),
    ]);

    fs.writeFileSync(
      backupPath,
      serializeBigInt({
        backed_up_at: new Date().toISOString(),
        counts: {
          categories: oldCategories.length,
          sub_categories: oldSubCategories.length,
          brands: oldBrands.length,
          units: oldUnits.length,
          products: oldProducts.length,
          suppliers: oldSuppliers.length,
          customers: oldCustomers.length,
          orders: oldOrders.length,
          order_details: oldOrderDetails.length,
          purchases: oldPurchases.length,
        },
        categories: oldCategories,
        sub_categories: oldSubCategories,
        brands: oldBrands,
        units: oldUnits,
        products: oldProducts,
        suppliers: oldSuppliers,
        customers: oldCustomers,
        orders: oldOrders,
        order_details: oldOrderDetails,
        purchases: oldPurchases,
        business_units: oldBusinessUnits,
      }),
      "utf-8"
    );
    console.log("   Backup written successfully.");
  } else {
    console.log("1. Existing pre-cleanup backup preserved at", backupPath);
  }

  async function safeDeleteMany(modelName) {
    try {
      if (prisma[modelName]?.deleteMany) {
        await prisma[modelName].deleteMany({});
      }
    } catch (e) {
      if (e?.code === "P2021") return; // Table does not exist in DB
      throw e;
    }
  }

  // Ensure electrical_specifications and packaging_conversions exist if missing
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS electrical_specifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL,
      spec_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
      conductor_material VARCHAR(50) NULL,
      cable_size VARCHAR(50) NULL,
      core_count INT NULL DEFAULT 1,
      voltage_grade VARCHAR(50) NULL,
      current_rating VARCHAR(50) NULL,
      pole_type VARCHAR(50) NULL,
      breaking_capacity VARCHAR(50) NULL,
      tripping_curve VARCHAR(20) NULL,
      gang_module VARCHAR(50) NULL,
      conduit_diameter VARCHAR(50) NULL,
      wattage VARCHAR(50) NULL,
      color_temperature VARCHAR(50) NULL,
      warranty_months INT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX electrical_specifications_product_id_key (product_id),
      INDEX electrical_specifications_spec_type_idx (spec_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS packaging_conversions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      product_id BIGINT UNSIGNED NOT NULL,
      packaging_unit VARCHAR(50) NOT NULL,
      base_unit VARCHAR(50) NOT NULL,
      conversion_ratio DECIMAL(12, 4) NOT NULL,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE INDEX packaging_conversions_product_id_packaging_unit_key (product_id, packaging_unit),
      INDEX packaging_conversions_product_id_idx (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 3. Purge Poultry / Fish / Feed tables completely
  console.log("2. Purging Poultry, Fish, Egg & Feed records...");
  for (const m of [
    "fish_harvests",
    "fish_mortalities",
    "fish_samplings",
    "fish_batches",
    "fish_ponds",
    "fish_species",
    "egg_regradings",
    "egg_collection_grades",
    "egg_collections",
    "poultry_flocks",
    "internal_feed_issues",
    "feed_products",
  ]) {
    await safeDeleteMany(m);
  }

  // 4. Purge Runa Traders Ceramic/Tiles/Sanitary & Agro Orders, Returns, Purchases, Movements
  console.log("3. Purging Runa Traders Ceramic/Sanitary/Agro transactions & catalog...");
  for (const m of [
    "challan_items",
    "challans",
    "cancelled_tiles",
    "product_returns",
    "order_payment_details",
    "quotation_items",
    "project_quotations",
    "contractor_commissions",
    "contractors",
    "stock_transfer_items",
    "stock_transfers",
    "cable_drums",
    "warranty_records",
    "order_details",
    "orders",
    "purchase_payment_details",
    "purchase_returns",
    "purchase_order_details",
    "purchases",
    "supplier_due_collections",
    "customer_payment_details",
    "party_ledger_entries",
    "financial_transactions",
    "stock_movements",
    "packaging_conversions",
    "electrical_specifications",
    "product_variants",
    "products",
    "sub_categories",
    "categories",
    "brands",
    "unit_conversions",
    "units",
    "suppliers",
  ]) {
    await safeDeleteMany(m);
  }

  // Clean non-electrical / test agro customers and reset stale Runa tile dues on real retail customers
  await prisma.customers.deleteMany({
    where: {
      OR: [
        { customer_name: { contains: "Fish" } },
        { customer_name: { contains: "Feed" } },
        { customer_name: { contains: "Egg" } },
        { customer_name: { contains: "Poultry" } },
        { customer_name: { contains: "Accounting Test" } },
        { customer_name: { contains: "TIELS" } },
        { customer_name: { contains: "TILES" } },
        { customer_name: { contains: "CERAMIC" } },
        { customer_name: { contains: "Sanitary" } },
      ],
    },
  });

  await prisma.customers.updateMany({
    data: { previous_due_amount: "0" },
  });

  // Ensure Walk-in Customer exists
  const walkIn = await prisma.customers.findFirst({
    where: {
      OR: [
        { customer_name: "Walk-in Customer" },
        { customer_name: "PUBLIC" },
      ],
    },
  });
  if (!walkIn) {
    await prisma.customers.create({
      data: {
        customer_id: "CUS-0001",
        customer_name: "Walk-in Customer",
        mobile: "01700000000",
        address_details: "Counter Cash Sale",
        previous_due_amount: "0",
        user_id: userId,
      },
    });
  }

  // Replace Poultry/Fish/Egg business units with Electrical Retail business units
  await prisma.business_units.deleteMany({});
  const mainUnit = await prisma.business_units.create({
    data: {
      code: "MAIN_STORE",
      name: "Protikkha Electric - Main Retail Showroom",
      status: "active",
      user_id: userId,
    },
  });
  await prisma.business_units.create({
    data: {
      code: "GODOWN",
      name: "Protikkha Electric - Cable & Pipe Godown",
      status: "active",
      user_id: userId,
    },
  });

  // Clean Expense Types (replace test3 / typo with clean electrical retail expense categories)
  await prisma.expenses.deleteMany({});
  await prisma.expense_types.deleteMany({});
  for (const expName of [
    "Staff Salary & Wages",
    "Shop Rent & Electricity Bill",
    "Transport & Rickshaw/Van Fare",
    "Tea, Refreshment & Daily Store Expense",
    "Packaging, Tape & Store Supplies",
  ]) {
    await prisma.expense_types.create({
      data: {
        type_name: expName,
        status: "Active",
        user_id: userId,
      },
    });
  }

  // 5. Seed Complete Electrical Measurement Units (16 Units)
  console.log("4. Seeding 16 Electrical Measurement Units...");
  const unitNames = [
    "Pcs",
    "Meter",
    "Goj",
    "Feet",
    "Coil",
    "Roll",
    "mm",
    "Inch",
    "Dozen",
    "Box",
    "Packet",
    "Set",
    "Pair",
    "Kg",
    "Gram",
    "Bundle",
  ];
  const unitMap = new Map();
  for (const uName of unitNames) {
    const u = await prisma.units.create({
      data: {
        unit_name: uName,
        status: "Active",
        user_id: userId,
      },
    });
    unitMap.set(uName, u.id);
  }

  // Seed global unit conversions for reference
  const globalConversions = [
    ["Coil", "Meter", 100],
    ["Roll", "Meter", 90],
    ["Goj", "Feet", 3],
    ["Goj", "Meter", 0.9144],
    ["Feet", "Inch", 12],
    ["Feet", "Meter", 0.3048],
    ["Meter", "mm", 1000],
    ["Dozen", "Pcs", 12],
    ["Pair", "Pcs", 2],
    ["Kg", "Gram", 1000],
  ];
  for (const [fromU, toU, rate] of globalConversions) {
    await prisma.unit_conversions.create({
      data: {
        from_unit_id: unitMap.get(fromU),
        to_unit_id: unitMap.get(toU),
        conversion_rate: rate,
        operator: "MULTIPLY",
        business_unit_id: mainUnit.id,
        note: `1 ${fromU} = ${rate} ${toU}`,
        user_id: userId,
      },
    });
  }

  // 6. Seed Pure Electrical Categories & Subcategories
  console.log("5. Seeding Electrical Categories & Subcategories...");
  const categoryDefs = [
    {
      name: "Wires & Cables",
      subs: ["Domestic House Wire (BYA/BYM)", "Flexible Multi-Core Cable", "Earth & Service Cable"],
    },
    {
      name: "Switches & Sockets",
      subs: ["Gang Switches", "Power Sockets & Multiplugs", "Switch Boards & Gang Boxes"],
    },
    {
      name: "Circuit Breakers (MCB/DB)",
      subs: ["MCB & MCCB Breakers", "RCCB & Main Isolators", "DB Distribution Boxes"],
    },
    {
      name: "Pipes & GI Fittings",
      subs: ["PVC Conduit Pipes", "GI Bends, Sockets & Saddles"],
    },
    {
      name: "LED Lighting & Bulbs",
      subs: ["LED Bulbs & Tubes", "Ceiling Panel & Flood Lights"],
    },
    {
      name: "Fans & Regulators",
      subs: ["Ceiling & Exhaust Fans", "Dimmer Regulators & Capacitors"],
    },
    {
      name: "Meters & Electrical Tools",
      subs: ["Digital Sub-Meters", "Insulation Tapes & Testers"],
    },
    {
      name: "Nuts, Bolts & Hardware",
      subs: ["GI Nuts, Bolts & Fasteners", "Cable Clips, Nails & Screws"],
    },
  ];

  const catMap = new Map();
  const subCatMap = new Map();
  for (const cDef of categoryDefs) {
    const cat = await prisma.categories.create({
      data: {
        category_name: cDef.name,
        status: "Active",
        user_id: userId,
      },
    });
    catMap.set(cDef.name, cat.id);
    for (const subName of cDef.subs) {
      const sub = await prisma.sub_categories.create({
        data: {
          sub_category_name: subName,
          category_id: cat.id,
          status: "Active",
          user_id: userId,
        },
      });
      subCatMap.set(subName, sub.id);
    }
  }

  // 7. Seed Electrical Brands
  console.log("6. Seeding Electrical Brands...");
  const brandNames = [
    "BRB Cable",
    "BBS Cables",
    "Paradise Cables",
    "Super Star (SSG)",
    "Click (RFL)",
    "Walton",
    "Schneider Electric",
    "ABB",
    "EnergyPac",
    "Protikkha Standard",
  ];
  const brandMap = new Map();
  for (const bName of brandNames) {
    const b = await prisma.brands.create({
      data: {
        name: bName,
        status: "Active",
        user_id: userId,
      },
    });
    brandMap.set(bName, b.id);
  }

  // 8. Seed Electrical Suppliers
  console.log("7. Seeding Electrical Suppliers...");
  const supplierDefs = [
    {
      supplier_id: "SUP-1001",
      name: "Md. Kamrul Hasan",
      company: "BRB Cable Industries Depot",
      mobile: "01711882201",
      address: "BSCIC Industrial Estate, Kushtia / Dhaka Depot",
      email: "sales@brbcables-depot.com",
    },
    {
      supplier_id: "SUP-1002",
      name: "Engr. Tariqul Islam",
      company: "Super Star Group (SSG Electrical)",
      mobile: "01713445590",
      address: "Banani / Nawabpur Distribution Hub, Dhaka",
      email: "dealer@ssgbd.com",
    },
    {
      supplier_id: "SUP-1003",
      name: "Md. Rezaul Karim",
      company: "RFL Click & PVC Electricals",
      mobile: "01819223344",
      address: "Middle Badda, Dhaka",
      email: "click.sales@prangroup.com",
    },
    {
      supplier_id: "SUP-1004",
      name: "Haji Abdul Mannan",
      company: "Nawabpur Electrical Syndicate",
      mobile: "01715998877",
      address: "142 Nawabpur Road, Kaptan Bazar, Dhaka",
      email: "nawabpur.elec@gmail.com",
    },
  ];
  for (const sDef of supplierDefs) {
    await prisma.suppliers.create({
      data: {
        ...sDef,
        purchase_payable_amount: "0",
        status: "Active",
        user_id: userId,
      },
    });
  }

  // 9. Seed 36 Authentic Electrical Products across all Multi-Unit Systems
  console.log("8. Seeding 36 Multi-Unit Electrical Products...");
  const productsSeed = [
    // --- WIRES & CABLES (Meter / Goj / Feet / Coil / mm) ---
    {
      code: "PE-CB-1001",
      name: "BRB 1.0 RM BYA Single Core Cable (Red)",
      cat: "Wires & Cables",
      sub: "Domestic House Wire (BYA/BYM)",
      brand: "BRB Cable",
      unit: "Meter",
      qty: "500",
      cost: "26",
      sell: "32",
      wholesale: "29",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "1.0 rm", core_count: 1, voltage_grade: "450/750V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1002",
      name: "BRB 1.5 RM BYA Single Core Cable (Red)",
      cat: "Wires & Cables",
      sub: "Domestic House Wire (BYA/BYM)",
      brand: "BRB Cable",
      unit: "Meter",
      qty: "600",
      cost: "38",
      sell: "46",
      wholesale: "42",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "1.5 rm", core_count: 1, voltage_grade: "450/750V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1003",
      name: "BRB 2.5 RM BYA Single Core Cable (Black)",
      cat: "Wires & Cables",
      sub: "Domestic House Wire (BYA/BYM)",
      brand: "BRB Cable",
      unit: "Meter",
      qty: "400",
      cost: "64",
      sell: "78",
      wholesale: "72",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "2.5 rm", core_count: 1, voltage_grade: "450/750V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1004",
      name: "BBS 2.5 RM BYA Copper House Wire (Red)",
      cat: "Wires & Cables",
      sub: "Domestic House Wire (BYA/BYM)",
      brand: "BBS Cables",
      unit: "Meter",
      qty: "300",
      cost: "63",
      sell: "76",
      wholesale: "70",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "2.5 rm", core_count: 1, voltage_grade: "450/750V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1005",
      name: "BRB 4.0 RM BYA Heavy Load AC Cable",
      cat: "Wires & Cables",
      sub: "Domestic House Wire (BYA/BYM)",
      brand: "BRB Cable",
      unit: "Meter",
      qty: "300",
      cost: "102",
      sell: "122",
      wholesale: "112",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "4.0 rm", core_count: 1, voltage_grade: "450/750V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1006",
      name: "Paradise 6.0 RM BYM Main Line Cable",
      cat: "Wires & Cables",
      sub: "Earth & Service Cable",
      brand: "Paradise Cables",
      unit: "Meter",
      qty: "200",
      cost: "158",
      sell: "185",
      wholesale: "172",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "6.0 rm", core_count: 1, voltage_grade: "600/1000V", warranty_months: 120 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1007",
      name: "Click 23/76 Twin Flexible Wire (2-Core)",
      cat: "Wires & Cables",
      sub: "Flexible Multi-Core Cable",
      brand: "Click (RFL)",
      unit: "Goj",
      qty: "450",
      cost: "18",
      sell: "24",
      wholesale: "21",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "23/76", core_count: 2, voltage_grade: "250/440V", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Roll", base_unit: "Goj", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Meter", base_unit: "Goj", conversion_ratio: 1.0936, is_default: false },
        { packaging_unit: "Feet", base_unit: "Goj", conversion_ratio: 0.3333, is_default: false },
      ],
    },
    {
      code: "PE-CB-1008",
      name: "SSG 70/76 3-Core Round Flexible Cable",
      cat: "Wires & Cables",
      sub: "Flexible Multi-Core Cable",
      brand: "Super Star (SSG)",
      unit: "Meter",
      qty: "270",
      cost: "52",
      sell: "65",
      wholesale: "58",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "70/76", core_count: 3, voltage_grade: "300/500V", warranty_months: 36 },
      conversions: [
        { packaging_unit: "Roll", base_unit: "Meter", conversion_ratio: 90, is_default: false },
        { packaging_unit: "Goj", base_unit: "Meter", conversion_ratio: 0.9144, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },
    {
      code: "PE-CB-1009",
      name: "4.0 mm PVC Insulated Earth Wire (Green/Yellow)",
      cat: "Wires & Cables",
      sub: "Earth & Service Cable",
      brand: "BBS Cables",
      unit: "Meter",
      qty: "300",
      cost: "42",
      sell: "52",
      wholesale: "47",
      spec: { spec_type: "CABLE", conductor_material: "Copper", cable_size: "4.0 mm", core_count: 1, voltage_grade: "450/750V", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Coil", base_unit: "Meter", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Feet", base_unit: "Meter", conversion_ratio: 0.3048, is_default: false },
      ],
    },

    // --- PIPES & GI FITTINGS (Feet / Pcs / Inch / mm / Dozen / Bundle) ---
    {
      code: "PE-PF-2001",
      name: "3/4 GI BAN (Heavy Conduit Bend)",
      cat: "Pipes & GI Fittings",
      sub: "GI Bends, Sockets & Saddles",
      brand: "Protikkha Standard",
      unit: "Pcs",
      qty: "180",
      cost: "62",
      sell: "80",
      wholesale: "72",
      spec: { spec_type: "CONDUIT", conduit_diameter: '3/4" (20mm)' },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 50, is_default: false },
      ],
    },
    {
      code: "PE-PF-2002",
      name: '1" GI BAN (Heavy Conduit Bend)',
      cat: "Pipes & GI Fittings",
      sub: "GI Bends, Sockets & Saddles",
      brand: "Protikkha Standard",
      unit: "Pcs",
      qty: "120",
      cost: "85",
      sell: "110",
      wholesale: "98",
      spec: { spec_type: "CONDUIT", conduit_diameter: '1" (25mm)' },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },
    {
      code: "PE-PF-2003",
      name: '3/4" PVC Conduit Pipe (10ft Stick - RFL)',
      cat: "Pipes & GI Fittings",
      sub: "PVC Conduit Pipes",
      brand: "Click (RFL)",
      unit: "Feet",
      qty: "600",
      cost: "8.5",
      sell: "11",
      wholesale: "9.8",
      spec: { spec_type: "CONDUIT", conduit_diameter: "20mm (3/4 inch)" },
      conversions: [
        { packaging_unit: "Pcs", base_unit: "Feet", conversion_ratio: 10, is_default: false },
        { packaging_unit: "Bundle", base_unit: "Feet", conversion_ratio: 250, is_default: false },
        { packaging_unit: "Meter", base_unit: "Feet", conversion_ratio: 3.2808, is_default: false },
      ],
    },
    {
      code: "PE-PF-2004",
      name: '1" Heavy PVC Conduit Pipe (10ft Stick - RFL)',
      cat: "Pipes & GI Fittings",
      sub: "PVC Conduit Pipes",
      brand: "Click (RFL)",
      unit: "Feet",
      qty: "500",
      cost: "12",
      sell: "16",
      wholesale: "14",
      spec: { spec_type: "CONDUIT", conduit_diameter: "25mm (1 inch)" },
      conversions: [
        { packaging_unit: "Pcs", base_unit: "Feet", conversion_ratio: 10, is_default: false },
        { packaging_unit: "Bundle", base_unit: "Feet", conversion_ratio: 200, is_default: false },
        { packaging_unit: "Meter", base_unit: "Feet", conversion_ratio: 3.2808, is_default: false },
      ],
    },
    {
      code: "PE-PF-2005",
      name: "20mm Flexible PVC Corrugated Pipe",
      cat: "Pipes & GI Fittings",
      sub: "PVC Conduit Pipes",
      brand: "Click (RFL)",
      unit: "Feet",
      qty: "500",
      cost: "4.5",
      sell: "7",
      wholesale: "5.8",
      spec: { spec_type: "CONDUIT", conduit_diameter: "20mm" },
      conversions: [
        { packaging_unit: "Roll", base_unit: "Feet", conversion_ratio: 100, is_default: false },
        { packaging_unit: "Goj", base_unit: "Feet", conversion_ratio: 3, is_default: false },
        { packaging_unit: "Meter", base_unit: "Feet", conversion_ratio: 3.2808, is_default: false },
      ],
    },
    {
      code: "PE-PF-2006",
      name: "20mm PVC 4-Way Circular Junction Box",
      cat: "Pipes & GI Fittings",
      sub: "GI Bends, Sockets & Saddles",
      brand: "Click (RFL)",
      unit: "Pcs",
      qty: "240",
      cost: "18",
      sell: "28",
      wholesale: "23",
      spec: { spec_type: "CONDUIT", conduit_diameter: "20mm" },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },

    // --- SWITCHES & SOCKETS (Pcs / Dozen / Box) ---
    {
      code: "PE-SW-3001",
      name: "Click Piano 1-Gang 1-Way Switch (10A)",
      cat: "Switches & Sockets",
      sub: "Gang Switches",
      brand: "Click (RFL)",
      unit: "Pcs",
      qty: "360",
      cost: "32",
      sell: "45",
      wholesale: "38",
      spec: { spec_type: "SWITCH", current_rating: "10A", gang_module: "1-Gang", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 20, is_default: false },
      ],
    },
    {
      code: "PE-SW-3002",
      name: "Super Star 2-Gang Modular Switch",
      cat: "Switches & Sockets",
      sub: "Gang Switches",
      brand: "Super Star (SSG)",
      unit: "Pcs",
      qty: "160",
      cost: "105",
      sell: "135",
      wholesale: "120",
      spec: { spec_type: "SWITCH", current_rating: "10A", gang_module: "2-Gang", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },
    {
      code: "PE-SW-3003",
      name: "Super Star 3-Gang Modular Switch",
      cat: "Switches & Sockets",
      sub: "Gang Switches",
      brand: "Super Star (SSG)",
      unit: "Pcs",
      qty: "120",
      cost: "148",
      sell: "190",
      wholesale: "170",
      spec: { spec_type: "SWITCH", current_rating: "10A", gang_module: "3-Gang", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
      ],
    },
    {
      code: "PE-SW-3004",
      name: "Click 13A 3-Pin Universal Multi Socket",
      cat: "Switches & Sockets",
      sub: "Power Sockets & Multiplugs",
      brand: "Click (RFL)",
      unit: "Pcs",
      qty: "140",
      cost: "155",
      sell: "210",
      wholesale: "185",
      spec: { spec_type: "SWITCH", current_rating: "13A", gang_module: "Universal 3-Pin", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
      ],
    },
    {
      code: "PE-SW-3005",
      name: "Walton 20A AC DP Switch with Neon",
      cat: "Switches & Sockets",
      sub: "Gang Switches",
      brand: "Walton",
      unit: "Pcs",
      qty: "90",
      cost: "230",
      sell: "295",
      wholesale: "260",
      spec: { spec_type: "SWITCH", current_rating: "20A", pole_type: "DP", warranty_months: 60 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
      ],
    },
    {
      code: "PE-SW-3006",
      name: "5-Socket Surge Multiplug Extension (3m Cable)",
      cat: "Switches & Sockets",
      sub: "Power Sockets & Multiplugs",
      brand: "Super Star (SSG)",
      unit: "Pcs",
      qty: "65",
      cost: "340",
      sell: "450",
      wholesale: "395",
      spec: { spec_type: "ACCESSORY", current_rating: "10A", warranty_months: 12 },
      conversions: [],
    },
    {
      code: "PE-SW-3007",
      name: '3x3" GI Concealed Metal Gang Box',
      cat: "Switches & Sockets",
      sub: "Switch Boards & Gang Boxes",
      brand: "Protikkha Standard",
      unit: "Pcs",
      qty: "240",
      cost: "28",
      sell: "42",
      wholesale: "34",
      spec: { spec_type: "ACCESSORY", gang_module: '3x3"' },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },

    // --- CIRCUIT BREAKERS (MCB / RCCB / DB) ---
    {
      code: "PE-MCB-4001",
      name: "Schneider Acti9 16A 1P MCB Circuit Breaker",
      cat: "Circuit Breakers (MCB/DB)",
      sub: "MCB & MCCB Breakers",
      brand: "Schneider Electric",
      unit: "Pcs",
      qty: "84",
      cost: "330",
      sell: "420",
      wholesale: "380",
      spec: { spec_type: "BREAKER", current_rating: "16A", pole_type: "1P", breaking_capacity: "6kA", tripping_curve: "C", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },
    {
      code: "PE-MCB-4002",
      name: "Schneider Acti9 32A 2P MCB Circuit Breaker",
      cat: "Circuit Breakers (MCB/DB)",
      sub: "MCB & MCCB Breakers",
      brand: "Schneider Electric",
      unit: "Pcs",
      qty: "72",
      cost: "590",
      sell: "750",
      wholesale: "680",
      spec: { spec_type: "BREAKER", current_rating: "32A", pole_type: "2P", breaking_capacity: "6kA", tripping_curve: "C", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 6, is_default: false },
      ],
    },
    {
      code: "PE-MCB-4003",
      name: "ABB 63A 2P Main RCCB / Isolator Breaker",
      cat: "Circuit Breakers (MCB/DB)",
      sub: "RCCB & Main Isolators",
      brand: "ABB",
      unit: "Pcs",
      qty: "36",
      cost: "1280",
      sell: "1550",
      wholesale: "1420",
      spec: { spec_type: "BREAKER", current_rating: "63A", pole_type: "2P", breaking_capacity: "10kA", warranty_months: 24 },
      conversions: [],
    },
    {
      code: "PE-MCB-4004",
      name: "EnergyPac 8-Way Metal Flush DB Distribution Box",
      cat: "Circuit Breakers (MCB/DB)",
      sub: "DB Distribution Boxes",
      brand: "EnergyPac",
      unit: "Set",
      qty: "30",
      cost: "780",
      sell: "980",
      wholesale: "880",
      spec: { spec_type: "BREAKER", pole_type: "8-Way SPN", warranty_months: 24 },
      conversions: [],
    },

    // --- LED LIGHTING & BULBS ---
    {
      code: "PE-LD-5001",
      name: "Super Star 12W AC LED Bulb (Daylight 6500K)",
      cat: "LED Lighting & Bulbs",
      sub: "LED Bulbs & Tubes",
      brand: "Super Star (SSG)",
      unit: "Pcs",
      qty: "240",
      cost: "118",
      sell: "155",
      wholesale: "138",
      spec: { spec_type: "LIGHTING", wattage: "12W", color_temperature: "Daylight 6500K", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 50, is_default: false },
      ],
    },
    {
      code: "PE-LD-5002",
      name: "Click 18W T8 Glass LED Tube Light (4 Feet)",
      cat: "LED Lighting & Bulbs",
      sub: "LED Bulbs & Tubes",
      brand: "Click (RFL)",
      unit: "Pcs",
      qty: "100",
      cost: "235",
      sell: "310",
      wholesale: "275",
      spec: { spec_type: "LIGHTING", wattage: "18W", color_temperature: "Daylight 6500K", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 25, is_default: false },
      ],
    },
    {
      code: "PE-LD-5003",
      name: "Walton 18W Round Concealed LED Panel Light",
      cat: "LED Lighting & Bulbs",
      sub: "Ceiling Panel & Flood Lights",
      brand: "Walton",
      unit: "Pcs",
      qty: "85",
      cost: "320",
      sell: "420",
      wholesale: "370",
      spec: { spec_type: "LIGHTING", wattage: "18W", color_temperature: "Daylight 6500K", warranty_months: 24 },
      conversions: [],
    },

    // --- FANS & REGULATORS ---
    {
      code: "PE-FN-6001",
      name: 'BRB 56" High Speed Copper Ceiling Fan',
      cat: "Fans & Regulators",
      sub: "Ceiling & Exhaust Fans",
      brand: "BRB Cable",
      unit: "Pcs",
      qty: "28",
      cost: "2680",
      sell: "3150",
      wholesale: "2920",
      spec: { spec_type: "GENERAL", wattage: "75W", warranty_months: 84 },
      conversions: [],
    },
    {
      code: "PE-FN-6002",
      name: "Click Electronic Dimmer Fan Regulator",
      cat: "Fans & Regulators",
      sub: "Dimmer Regulators & Capacitors",
      brand: "Click (RFL)",
      unit: "Pcs",
      qty: "100",
      cost: "145",
      sell: "210",
      wholesale: "175",
      spec: { spec_type: "SWITCH", wattage: "100W", warranty_months: 24 },
      conversions: [
        { packaging_unit: "Box", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
      ],
    },

    // --- METERS & TOOLS ---
    {
      code: "PE-MT-7001",
      name: "Single Phase Digital kWh Sub-Meter (5-30A)",
      cat: "Meters & Electrical Tools",
      sub: "Digital Sub-Meters",
      brand: "EnergyPac",
      unit: "Pcs",
      qty: "40",
      cost: "640",
      sell: "850",
      wholesale: "760",
      spec: { spec_type: "GENERAL", current_rating: "5-30A", voltage_grade: "220V", warranty_months: 12 },
      conversions: [],
    },
    {
      code: "PE-MT-7002",
      name: "PVC Electrical Insulation Tape (18mm Flame Retardant)",
      cat: "Meters & Electrical Tools",
      sub: "Insulation Tapes & Testers",
      brand: "Super Star (SSG)",
      unit: "Pcs",
      qty: "300",
      cost: "16",
      sell: "25",
      wholesale: "20",
      spec: { spec_type: "ACCESSORY" },
      conversions: [
        { packaging_unit: "Roll", base_unit: "Pcs", conversion_ratio: 10, is_default: false },
        { packaging_unit: "Dozen", base_unit: "Pcs", conversion_ratio: 12, is_default: false },
      ],
    },

    // --- NUTS, BOLTS & HARDWARE (Kg / Gram / Packet / Dozen / Pcs) ---
    {
      code: "PE-NB-8001",
      name: "GI Hex Nut & Bolt Assorted (6mm / 8mm / 10mm)",
      cat: "Nuts, Bolts & Hardware",
      sub: "GI Nuts, Bolts & Fasteners",
      brand: "Protikkha Standard",
      unit: "Kg",
      qty: "85",
      cost: "155",
      sell: "210",
      wholesale: "185",
      spec: { spec_type: "ACCESSORY" },
      conversions: [
        { packaging_unit: "Packet", base_unit: "Kg", conversion_ratio: 0.5, is_default: false },
        { packaging_unit: "Gram", base_unit: "Kg", conversion_ratio: 0.001, is_default: false },
      ],
    },
    {
      code: "PE-NB-8002",
      name: 'Concrete Steel Wall Nail / Pin (1.5" & 2")',
      cat: "Nuts, Bolts & Hardware",
      sub: "Cable Clips, Nails & Screws",
      brand: "Protikkha Standard",
      unit: "Kg",
      qty: "60",
      cost: "135",
      sell: "180",
      wholesale: "160",
      spec: { spec_type: "ACCESSORY" },
      conversions: [
        { packaging_unit: "Packet", base_unit: "Kg", conversion_ratio: 0.5, is_default: false },
        { packaging_unit: "Gram", base_unit: "Kg", conversion_ratio: 0.001, is_default: false },
      ],
    },
    {
      code: "PE-NB-8003",
      name: "8mm PVC Nail Cable Clip (100 Pcs Packet)",
      cat: "Nuts, Bolts & Hardware",
      sub: "Cable Clips, Nails & Screws",
      brand: "Click (RFL)",
      unit: "Packet",
      qty: "180",
      cost: "34",
      sell: "55",
      wholesale: "44",
      spec: { spec_type: "ACCESSORY" },
      conversions: [
        { packaging_unit: "Dozen", base_unit: "Packet", conversion_ratio: 12, is_default: false },
        { packaging_unit: "Box", base_unit: "Packet", conversion_ratio: 20, is_default: false },
      ],
    },
  ];

  for (const p of productsSeed) {
    const created = await prisma.products.create({
      data: {
        product_name: p.name,
        product_code: [p.code],
        category_id: catMap.get(p.cat),
        sub_category_id: subCatMap.get(p.sub),
        brand_id: brandMap.get(p.brand),
        unit_id: unitMap.get(p.unit),
        quantity: p.qty,
        cost_price: p.cost,
        sell_price: p.sell,
        wholesale_price: p.wholesale,
        status: "Active",
        user_id: userId,
      },
    });

    if (p.spec) {
      await prisma.electrical_specifications.create({
        data: {
          product_id: created.id,
          ...p.spec,
        },
      });
    }

    if (p.conversions && p.conversions.length > 0) {
      for (const conv of p.conversions) {
        await prisma.packaging_conversions.create({
          data: {
            product_id: created.id,
            packaging_unit: conv.packaging_unit,
            base_unit: conv.base_unit,
            conversion_ratio: conv.conversion_ratio,
            is_default: conv.is_default ?? false,
          },
        });
      }
    }

    // Record initial opening stock movement for Stock Movement Ledger
    await prisma.stock_movements.create({
      data: {
        product_id: created.id,
        business_unit_id: mainUnit.id,
        movement_type: "OPENING_STOCK",
        quantity: parseFloat(p.qty),
        unit_price: parseFloat(p.cost),
        total_value: +(parseFloat(p.qty) * parseFloat(p.cost)).toFixed(2),
        reference_type: "SEED",
        reference_id: created.id,
        reference_no: p.code,
        stock_after: parseFloat(p.qty),
        note: `Opening electrical stock (${p.qty} ${p.unit})`,
        user_id: userId,
      },
    });
  }

  console.log("=== Electrical Cleanup & Seed Completed Successfully ===");
  const finalCounts = {
    categories: await prisma.categories.count(),
    sub_categories: await prisma.sub_categories.count(),
    brands: await prisma.brands.count(),
    units: await prisma.units.count(),
    products: await prisma.products.count(),
    packaging_conversions: await prisma.packaging_conversions.count(),
    suppliers: await prisma.suppliers.count(),
    customers: await prisma.customers.count(),
    feed_products: await prisma.feed_products.count(),
    fish_batches: await prisma.fish_batches.count(),
  };
  console.log("Final DB Counts:", finalCounts);
}

main()
  .catch((err) => {
    console.error("Cleanup/Seed Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
