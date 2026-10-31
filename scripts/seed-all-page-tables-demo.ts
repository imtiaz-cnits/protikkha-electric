import prisma from "../lib/prisma";

function localDateYmd(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateObj(daysAgo = 0): Date {
  return new Date(`${localDateYmd(daysAgo)}T10:30:00.000Z`);
}

async function main() {
  console.log("⚡ Seeding dynamic Protikkha Electric records across all ERP page tables...");

  const adminUser = await prisma.users.findFirst({ orderBy: { id: "asc" } });
  if (!adminUser) {
    throw new Error("No user found in users table.");
  }
  const userId = adminUser.id;

  const categories = await prisma.categories.findMany({ orderBy: { id: "asc" } });
  const brands = await prisma.brands.findMany({ orderBy: { id: "asc" } });
  const units = await prisma.units.findMany({ orderBy: { id: "asc" } });
  const suppliers = await prisma.suppliers.findMany({ orderBy: { id: "asc" } });
  const customers = await prisma.customers.findMany({ orderBy: { id: "asc" }, take: 12 });
  const expenseTypes = await prisma.expense_types.findMany({ orderBy: { id: "asc" } });

  const defaultCatId = categories[0]?.id ?? BigInt(1);
  const defaultBrandId = brands[0]?.id ?? BigInt(1);
  const pcsUnit = units.find((u) => /pcs|piece/i.test(u.unit_name)) || units[0];
  const coilUnit = units.find((u) => /coil|meter/i.test(u.unit_name)) || pcsUnit;

  // 1. Ensure 4 Low-Stock / Out-of-Stock Electrical Products exist (for /reports/stock-out)
  const lowStockCount = await prisma.products.count({
    where: { quantity: { in: ["0", "1", "2", "3", "4", "5"] } },
  });
  if (lowStockCount < 4) {
    const lowStockItems = [
      {
        product_name: "Schneider Acti9 63A 3P MCB Circuit Breaker",
        quantity: "0",
        cost_price: "1450",
        sell_price: "1780",
        wholesale_price: "1650",
        code: "ELC-LOW-8801",
        unit_id: pcsUnit?.id ?? null,
      },
      {
        product_name: "Super Star 30W IP65 Outdoor LED Flood Light",
        quantity: "2",
        cost_price: "920",
        sell_price: "1180",
        wholesale_price: "1080",
        code: "ELC-LOW-8802",
        unit_id: pcsUnit?.id ?? null,
      },
      {
        product_name: "BBS 6.0 RM BYA Green/Yellow Earth Wire Coil",
        quantity: "3",
        cost_price: "7800",
        sell_price: "8650",
        wholesale_price: "8300",
        code: "ELC-LOW-8803",
        unit_id: coilUnit?.id ?? null,
      },
      {
        product_name: "Click Heavy-Duty 4-Way Multi Socket 5m Surge",
        quantity: "4",
        cost_price: "540",
        sell_price: "690",
        wholesale_price: "620",
        code: "ELC-LOW-8804",
        unit_id: pcsUnit?.id ?? null,
      },
    ];

    for (const item of lowStockItems) {
      const existing = await prisma.products.findFirst({
        where: { product_name: item.product_name },
      });
      if (!existing) {
        await prisma.products.create({
          data: {
            product_name: item.product_name,
            quantity: item.quantity,
            cost_price: item.cost_price,
            sell_price: item.sell_price,
            wholesale_price: item.wholesale_price,
            status: "active",
            product_code: [item.code],
            brand_id: defaultBrandId,
            category_id: defaultCatId,
            unit_id: item.unit_id,
            user_id: userId,
          },
        });
      }
    }
    console.log("  ✔ Seeded 4 low-stock / out-of-stock electrical products.");
  }

  const allProducts = await prisma.products.findMany({
    where: { status: "active" },
    orderBy: { id: "asc" },
  });

  // 2. Product Variants (/products/variants)
  const variantCount = await prisma.product_variants.count();
  if (variantCount < 4 && allProducts.length >= 2) {
    const pCable = allProducts.find((p) => /wire|cable|rm/i.test(p.product_name)) || allProducts[0];
    const pSwitch = allProducts.find((p) => /switch|gang|socket/i.test(p.product_name)) || allProducts[1];

    const variantsToSeed = [
      {
        product_id: pCable.id,
        variant_name: "Red Insulation — 100m Factory Coil",
        sku: "VAR-CBL-RED-100M",
        barcode: "894110020101",
        cost_price: pCable.cost_price,
        sell_price: pCable.sell_price,
        wholesale_price: pCable.wholesale_price || pCable.cost_price,
        stock_quantity: "24",
        attributes: { color: "Red", length: "100m" },
      },
      {
        product_id: pCable.id,
        variant_name: "Black Insulation — 100m Factory Coil",
        sku: "VAR-CBL-BLK-100M",
        barcode: "894110020102",
        cost_price: pCable.cost_price,
        sell_price: pCable.sell_price,
        wholesale_price: pCable.wholesale_price || pCable.cost_price,
        stock_quantity: "18",
        attributes: { color: "Black", length: "100m" },
      },
      {
        product_id: pSwitch.id,
        variant_name: "Pearl White — Fire-Retardant Polycarbonate",
        sku: "VAR-SW-WHT-01",
        barcode: "894110020201",
        cost_price: pSwitch.cost_price,
        sell_price: pSwitch.sell_price,
        wholesale_price: pSwitch.wholesale_price || pSwitch.cost_price,
        stock_quantity: "65",
        attributes: { finish: "Pearl White", rating: "10A 250V" },
      },
      {
        product_id: pSwitch.id,
        variant_name: "Champagne Gold — Brushed Metallic Series",
        sku: "VAR-SW-GLD-02",
        barcode: "894110020202",
        cost_price: String(Math.round(parseFloat(pSwitch.cost_price || "120") * 1.15)),
        sell_price: String(Math.round(parseFloat(pSwitch.sell_price || "160") * 1.15)),
        wholesale_price: String(Math.round(parseFloat(pSwitch.cost_price || "120") * 1.08)),
        stock_quantity: "40",
        attributes: { finish: "Champagne Gold", rating: "10A 250V" },
      },
    ];

    for (const v of variantsToSeed) {
      await prisma.product_variants.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          ...v,
          status: "active",
        },
      });
    }
    console.log("  ✔ Seeded 4 electrical product variants.");
  }

  // 3. Ensure at least 4 Suppliers exist, then seed Purchases, Purchase Details, Payments & Payable Dues
  while (suppliers.length < 4) {
    const idx = suppliers.length + 1;
    const createdSup = await prisma.suppliers.create({
      data: {
        supplier_id: `SUP-100${idx}`,
        name: `Electrical Vendor ${idx}`,
        company: `Bangladesh Electrical Industries ${idx}`,
        mobile: `0171100220${idx}`,
        address: "Nawabpur Electrical Market, Dhaka",
        email: `vendor${idx}@protikkha-electric.com`,
        purchase_payable_amount: "0.00",
        status: "active",
        user_id: userId,
      },
    });
    suppliers.push(createdSup);
  }

  const purchaseCount = await prisma.purchases.count();
  if (purchaseCount < 4 && allProducts.length >= 6) {
    const purchaseSpecs = [
      {
        purchase_id: "PUR-20261031-101",
        referance_no: "BBS-INV-8841",
        supplier: suppliers[0],
        daysAgo: 3,
        items: [
          { prod: allProducts[0], qty: 10 },
          { prod: allProducts[1], qty: 15 },
        ],
        paidRatio: 0.7, // Partial -> creates payable due
        method: "Bank Transfer",
      },
      {
        purchase_id: "PUR-20261031-102",
        referance_no: "BRB-DEP-4410",
        supplier: suppliers[1] || suppliers[0],
        daysAgo: 2,
        items: [
          { prod: allProducts[2], qty: 20 },
          { prod: allProducts[3], qty: 12 },
        ],
        paidRatio: 1.0, // Paid in full
        method: "Cash",
      },
      {
        purchase_id: "PUR-20261031-103",
        referance_no: "SSG-DIST-9023",
        supplier: suppliers[2] || suppliers[0],
        daysAgo: 1,
        items: [
          { prod: allProducts[4], qty: 30 },
          { prod: allProducts[5], qty: 25 },
        ],
        paidRatio: 0.5, // Partial -> creates payable due
        method: "bKash Merchant",
      },
      {
        purchase_id: "PUR-20261031-104",
        referance_no: "SCH-BD-5519",
        supplier: suppliers[3] || suppliers[0],
        daysAgo: 0,
        items: [
          { prod: allProducts[6 % allProducts.length], qty: 16 },
          { prod: allProducts[7 % allProducts.length], qty: 10 },
        ],
        paidRatio: 0.0, // Due -> creates payable due
        method: "Credit Bill",
      },
    ];

    for (const ps of purchaseSpecs) {
      let grandSub = 0;
      const detailPayloads = ps.items.map((it) => {
        const cost = Math.max(50, parseFloat(it.prod.cost_price || "250"));
        const sub = Math.round(cost * it.qty * 100) / 100;
        grandSub += sub;
        return {
          product_id: it.prod.id,
          quantity: String(it.qty),
          cost_price: cost.toFixed(2),
          subtotal: sub.toFixed(2),
          user_id: userId,
        };
      });

      const paidAmt = Math.round(grandSub * ps.paidRatio);
      const dueAmt = Math.round((grandSub - paidAmt) * 100) / 100;
      const pDate = dateObj(ps.daysAgo);

      const createdPurchase = await prisma.purchases.create({
        data: {
          purchase_id: ps.purchase_id,
          referance_no: ps.referance_no,
          grand_subtotal: grandSub.toFixed(2),
          paid_amount: paidAmt.toFixed(2),
          due_amount: dueAmt.toFixed(2),
          purchase_payable_amount: grandSub.toFixed(2),
          delivery_charge: 0,
          date: pDate,
          supplier_id: ps.supplier.id,
          user_id: userId,
          created_at: pDate,
          updated_at: pDate,
        },
      });

      for (const dp of detailPayloads) {
        const det = await prisma.purchase_order_details.create({
          data: {
            ...dp,
            purchase_id: createdPurchase.id,
            created_at: pDate,
            updated_at: pDate,
          },
        });

        await prisma.stock_movements.create({
          data: {
            product_id: dp.product_id,
            movement_type: "PURCHASE",
            quantity: Number(dp.quantity),
            unit_price: Number(dp.cost_price),
            total_value: Number(dp.subtotal),
            reference_type: "PURCHASE",
            reference_id: createdPurchase.id,
            reference_no: ps.purchase_id,
            stock_after: 50,
            date: pDate,
            note: `Inward stock received via ${ps.purchase_id}`,
            user_id: userId,
            created_at: pDate,
          },
        });

        if (paidAmt > 0 && dp === detailPayloads[0]) {
          await prisma.purchase_payment_details.create({
            data: {
              purchases_id: createdPurchase.id,
              purchase_order_details_id: det.id,
              paid_amount: paidAmt,
              discount_amount: 0,
              payment_method: ps.method,
              payment_status: dueAmt <= 0 ? "Paid" : "Partial",
              transaction_id: `TXN-${ps.referance_no}`,
              purchase_due_collection_date: pDate,
              user_id: userId,
              created_at: pDate,
              updated_at: pDate,
            },
          });
        }
      }

      if (dueAmt > 0) {
        const prevSup = await prisma.suppliers.findUnique({ where: { id: ps.supplier.id } });
        const curDue = parseFloat(prevSup?.purchase_payable_amount || "0");
        const nextDue = curDue + dueAmt;
        await prisma.suppliers.update({
          where: { id: ps.supplier.id },
          data: { purchase_payable_amount: nextDue.toFixed(2) },
        });

        await prisma.party_ledger_entries.create({
          data: {
            party_type: "SUPPLIER",
            supplier_id: ps.supplier.id,
            transaction_type: "PURCHASE",
            reference_type: "PURCHASE",
            reference_id: createdPurchase.id,
            reference_no: ps.purchase_id,
            debit: paidAmt,
            credit: grandSub,
            balance: nextDue,
            date: pDate,
            note: `Manufacturer purchase bill ${ps.purchase_id}`,
            user_id: userId,
            created_at: pDate,
          },
        });
      }
    }
    console.log("  ✔ Seeded 4 manufacturer purchase bills, GRN details, payments & supplier payables.");
  }

  // 4. Supplier Due Collections (/supplier-dues & /suppliers/ledger)
  const supColCount = await prisma.supplier_due_collections.count();
  if (supColCount < 3) {
    const dueSuppliers = await prisma.suppliers.findMany({ take: 3, orderBy: { id: "asc" } });
    for (let i = 0; i < Math.min(3, dueSuppliers.length); i++) {
      const sup = dueSuppliers[i];
      const curPayable = Math.max(5000, parseFloat(sup.purchase_payable_amount || "12000"));
      const paid = 2000 + i * 1500;
      const remaining = Math.max(1500, curPayable - paid);
      const cDate = dateObj(i);

      await prisma.supplier_due_collections.create({
        data: {
          paid_amount: paid.toFixed(2),
          due_amount: remaining.toFixed(2),
          discount_amount: "0.00",
          purchase_payable_amount: curPayable.toFixed(2),
          payment_method: i === 0 ? "Cash" : i === 1 ? "Bank Transfer" : "bKash",
          transaction_id: `SUP-PAY-2026-${101 + i}`,
          payment_status: "Partial",
          due_collection_date: cDate,
          supplier_id: sup.id,
          user_id: userId,
          created_at: cDate,
          updated_at: cDate,
        },
      });

      await prisma.suppliers.update({
        where: { id: sup.id },
        data: { purchase_payable_amount: remaining.toFixed(2) },
      });
    }
    console.log("  ✔ Seeded 3 supplier due payment records.");
  }

  // 5. Purchase Returns (/purchase-returns)
  const purRetCount = await prisma.purchase_returns.count();
  if (purRetCount < 3) {
    const allPurchases = await prisma.purchases.findMany({
      include: { purchase_order_details: true },
      orderBy: { id: "desc" },
      take: 3,
    });
    for (let i = 0; i < allPurchases.length; i++) {
      const pur = allPurchases[i];
      const det = pur.purchase_order_details[0];
      if (!det) continue;
      const unitCost = parseFloat(det.cost_price || "300");
      const qty = i + 1;
      const amt = Math.round(unitCost * qty * 100) / 100;
      const rDate = dateObj(i);

      await prisma.purchase_returns.create({
        data: {
          purchase_id: pur.id,
          supplier_id: pur.supplier_id,
          product_id: det.product_id,
          user_id: userId,
          amount: amt,
          discount_amount: 0,
          due_amount: 0,
          quantity: qty,
          date: rDate,
          created_at: rDate,
          updated_at: rDate,
        },
      });
    }
    console.log("  ✔ Seeded 3 supplier purchase return records.");
  }

  // 6. Sales Orders & Invoices (/dashboard, /invoices, /reports/sales, /reports/profit-margin)
  const orderCount = await prisma.orders.count();
  if (orderCount < 5 && customers.length >= 4 && allProducts.length >= 8) {
    const orderSpecs = [
      {
        order_no: "ORD-20261031-8101",
        customer: customers[1] || customers[0],
        daysAgo: 3,
        items: [
          { prod: allProducts[0], qty: 5 },
          { prod: allProducts[2], qty: 4 },
        ],
        discount: 100,
        paidRatio: 0.65, // Partial due
        method: "Cash",
        note: "2nd floor flat house wiring materials",
      },
      {
        order_no: "ORD-20261031-8102",
        customer: customers[2] || customers[0],
        daysAgo: 1,
        items: [
          { prod: allProducts[1], qty: 6 },
          { prod: allProducts[3], qty: 3 },
        ],
        discount: 50,
        paidRatio: 1.0, // Paid
        method: "bKash",
        note: "Retail counter electrical switchboard & breaker sale",
      },
      {
        order_no: "ORD-20261031-8103",
        customer: customers[3] || customers[0],
        daysAgo: 0, // TODAY
        items: [
          { prod: allProducts[4], qty: 8 },
          { prod: allProducts[5], qty: 4 },
        ],
        discount: 120,
        paidRatio: 1.0, // Paid today
        method: "Cash",
        note: "POS counter cash sale — LED panels & modular switches",
      },
      {
        order_no: "ORD-20261031-8104",
        customer: customers[4] || customers[0],
        daysAgo: 0, // TODAY
        items: [
          { prod: allProducts[6 % allProducts.length], qty: 10 },
          { prod: allProducts[7 % allProducts.length], qty: 5 },
        ],
        discount: 80,
        paidRatio: 0.6, // Partial today -> creates customer receivable due
        method: "Cash",
        note: "Shop renovation electrical conduits, cables & breakers",
      },
    ];

    for (const os of orderSpecs) {
      let gross = 0;
      const itemRows = os.items.map((it) => {
        const cost = Math.max(40, parseFloat(it.prod.cost_price || "150"));
        const sell = Math.max(cost + 35, parseFloat(it.prod.sell_price || String(cost * 1.25)));
        gross += sell * it.qty;
        return {
          product_id: it.prod.id,
          quantity: String(it.qty),
          price: cost.toFixed(2),
          selling_price: sell.toFixed(2),
          lineTotal: sell * it.qty,
        };
      });

      const netPayable = Math.max(100, gross - os.discount);
      const paidAmt = os.paidRatio >= 1 ? netPayable : Math.round(netPayable * os.paidRatio);
      const dueAmt = Math.round((netPayable - paidAmt) * 100) / 100;
      const oDate = dateObj(os.daysAgo);

      const createdOrder = await prisma.orders.create({
        data: {
          order_no: os.order_no,
          sub_total: gross,
          discount_amount: os.discount,
          delivery_charge: 0,
          paid_amount: paidAmt,
          due_amount: dueAmt,
          previous_due_amount: 0,
          order_note: os.note,
          customer_id: os.customer.id,
          invoice_date: oDate,
          user_id: userId,
          created_at: oDate,
          updated_at: oDate,
        },
      });

      for (const ir of itemRows) {
        await prisma.order_details.create({
          data: {
            order_id: createdOrder.id,
            product_id: ir.product_id,
            quantity: ir.quantity,
            price: ir.price,
            selling_price: ir.selling_price,
            user_id: userId,
            created_at: oDate,
            updated_at: oDate,
          },
        });

        await prisma.stock_movements.create({
          data: {
            product_id: ir.product_id,
            movement_type: "SALE",
            quantity: -Number(ir.quantity),
            unit_price: Number(ir.selling_price),
            total_value: ir.lineTotal,
            reference_type: "ORDER",
            reference_id: createdOrder.id,
            reference_no: os.order_no,
            stock_after: 40,
            date: oDate,
            note: `POS / Invoice sale ${os.order_no}`,
            user_id: userId,
            created_at: oDate,
          },
        });
      }

      await prisma.order_payment_details.create({
        data: {
          order_id: createdOrder.id,
          paid_amount: paidAmt,
          discount_amount: os.discount,
          payment_method: os.method,
          payment_status: dueAmt <= 0 ? "Paid" : "Partial",
          transaction_id: `INV-${os.order_no.slice(-4)}`,
          due_collection_date: localDateYmd(os.daysAgo),
          user_id: userId,
          created_at: oDate,
          updated_at: oDate,
        },
      });

      if (dueAmt > 0) {
        const curCust = await prisma.customers.findUnique({ where: { id: os.customer.id } });
        const prevDue = parseFloat(curCust?.previous_due_amount || "0");
        const nextDue = prevDue + dueAmt;
        await prisma.customers.update({
          where: { id: os.customer.id },
          data: { previous_due_amount: nextDue.toFixed(2) },
        });

        await prisma.party_ledger_entries.create({
          data: {
            party_type: "CUSTOMER",
            customer_id: os.customer.id,
            transaction_type: "SALE",
            reference_type: "ORDER",
            reference_id: createdOrder.id,
            reference_no: os.order_no,
            debit: netPayable,
            credit: paidAmt,
            balance: nextDue,
            date: oDate,
            note: os.note,
            user_id: userId,
            created_at: oDate,
          },
        });
      }
    }

    // Ensure at least 3 customers have previous_due_amount > 0 for /customer-dues
    const dueCustCount = await prisma.customers.count({
      where: {
        NOT: [
          { previous_due_amount: null },
          { previous_due_amount: "0" },
          { previous_due_amount: "0.00" },
        ],
      },
    });
    if (dueCustCount < 4 && customers.length >= 6) {
      await prisma.customers.update({
        where: { id: customers[5].id },
        data: { previous_due_amount: "3250.00" },
      });
    }
    console.log("  ✔ Seeded 4 electrical sales invoices, line items, payments & customer dues.");
  }

  // 7. Customer Payment Details / Due Collections (/customer-dues, /dashboard, /reports/daily-ledger)
  const custPayCount = await prisma.customer_payment_details.count();
  if (custPayCount < 3 && customers.length >= 3) {
    const colSpecs = [
      { cust: customers[1], paid: 1500, prev: 4500, daysAgo: 2, method: "Cash" },
      { cust: customers[2], paid: 2200, prev: 5200, daysAgo: 1, method: "bKash" },
      { cust: customers[3], paid: 1800, prev: 3800, daysAgo: 0, method: "Cash" },
    ];
    for (let i = 0; i < colSpecs.length; i++) {
      const cs = colSpecs[i];
      const cDate = dateObj(cs.daysAgo);
      const rem = cs.prev - cs.paid;
      await prisma.customer_payment_details.create({
        data: {
          paid_amount: cs.paid.toFixed(2),
          discount_amount: "0.00",
          previous_due_amount: cs.prev.toFixed(2),
          due_amount: rem.toFixed(2),
          due_collection_date: cDate,
          payment_method: cs.method,
          transaction_id: `DUE-COL-${201 + i}`,
          payment_status: "Partial",
          customer_id: cs.cust.id,
          user_id: userId,
          created_at: cDate,
          updated_at: cDate,
        },
      });
    }
    console.log("  ✔ Seeded 3 customer due collection records.");
  }

  // 8. Sales Returns (/returns)
  const salesRetCount = await prisma.product_returns.count();
  if (salesRetCount < 3) {
    const recentOrders = await prisma.orders.findMany({
      include: { order_details: true },
      orderBy: { id: "desc" },
      take: 3,
    });
    for (let i = 0; i < recentOrders.length; i++) {
      const ord = recentOrders[i];
      const det = ord.order_details[0];
      if (!det || !ord.customer_id) continue;
      const unitSell = parseFloat(det.selling_price || "250");
      const rDate = dateObj(i);
      await prisma.product_returns.create({
        data: {
          order_id: ord.id,
          product_id: det.product_id,
          customer_id: ord.customer_id,
          user_id: userId,
          quantity: 1,
          amount: unitSell.toFixed(2),
          discount_amount: "0.00",
          due_amount: "0.00",
          date: localDateYmd(i),
          created_at: rDate,
          updated_at: rDate,
        },
      });
    }
    console.log("  ✔ Seeded 3 customer sales return records.");
  }

  // 9. Expenses & Opening Balance (/expenses, /dashboard, /reports/daily-ledger, /reports/income-expense)
  const expCount = await prisma.expenses.count();
  if (expCount < 4 && expenseTypes.length > 0) {
    const expRows = [
      {
        type: expenseTypes[0],
        amount: 1850,
        details: "Showroom & Warehouse DESCO Commercial Electricity Bill",
        daysAgo: 3,
      },
      {
        type: expenseTypes[1 % expenseTypes.length],
        amount: 650,
        details: "Pickup van carriage for cable drum & PVC conduit unloading",
        daysAgo: 1,
      },
      {
        type: expenseTypes[2 % expenseTypes.length],
        amount: 420,
        details: "Staff afternoon refreshment & customer hospitality",
        daysAgo: 0,
      },
      {
        type: expenseTypes[3 % expenseTypes.length],
        amount: 380,
        details: "Thermal POS paper rolls, PVC tape & carry bags for counter",
        daysAgo: 0,
      },
    ];

    for (const er of expRows) {
      const eDate = dateObj(er.daysAgo);
      await prisma.expenses.create({
        data: {
          expense_type_id: er.type.id,
          staff_id: userId,
          expense_amount: er.amount,
          expense_details: er.details,
          date: localDateYmd(er.daysAgo),
          user_id: userId,
          created_at: eDate,
          updated_at: eDate,
        },
      });
    }
    console.log("  ✔ Seeded 4 electrical shop expense records.");
  }

  const openingCount = await prisma.opening_balances.count();
  if (openingCount < 1) {
    const todayDate = new Date(`${localDateYmd(0)}T00:00:00.000Z`);
    await prisma.opening_balances.upsert({
      where: {
        date_user_id: {
          date: todayDate,
          user_id: userId,
        },
      },
      update: {},
      create: {
        amount: 25000,
        date: todayDate,
        note: "Opening counter cash drawer float",
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log("  ✔ Seeded opening cash drawer balance.");
  }

  // 10. Stock Reconciliation Adjustments (/inventory/adjustments)
  const adjCount = await prisma.stock_movements.count({
    where: { movement_type: { in: ["ADJUSTMENT", "DAMAGE", "SCRAP"] } },
  });
  if (adjCount < 4 && allProducts.length >= 4) {
    const adjRows = [
      {
        prod: allProducts[0],
        type: "SCRAP",
        qty: -3,
        ref: "SCRP-202610-01",
        note: "End-of-drum cable insulation trim scrap write-off",
        daysAgo: 2,
      },
      {
        prod: allProducts[1],
        type: "ADJUSTMENT",
        qty: 2,
        ref: "ADJ-202610-02",
        note: "Physical shelf audit surplus verified in Rack B-2",
        daysAgo: 1,
      },
      {
        prod: allProducts[2],
        type: "DAMAGE",
        qty: -1,
        ref: "DMG-202610-03",
        note: "Cracked outer casing during transport unloading",
        daysAgo: 1,
      },
      {
        prod: allProducts[3],
        type: "ADJUSTMENT",
        qty: -2,
        ref: "ADJ-202610-04",
        note: "Monthly showroom display sample reconciliation",
        daysAgo: 0,
      },
    ];

    for (const ar of adjRows) {
      const aDate = dateObj(ar.daysAgo);
      const unitCost = parseFloat(ar.prod.cost_price || "150");
      await prisma.stock_movements.create({
        data: {
          product_id: ar.prod.id,
          movement_type: ar.type,
          quantity: ar.qty,
          unit_price: unitCost,
          total_value: Math.abs(ar.qty) * unitCost,
          reference_type: "ADJUSTMENT",
          reference_no: ar.ref,
          stock_after: Math.max(5, parseFloat(ar.prod.quantity || "25")),
          date: aDate,
          note: ar.note,
          user_id: userId,
          created_at: aDate,
        },
      });
    }
    console.log("  ✔ Seeded 4 stock reconciliation / damage / scrap records.");
  }

  // 11. Warranty Records & Replacement Claims (/warranty & /warranty/claims)
  const warCount = await prisma.warranty_records.count();
  if (warCount < 5 && allProducts.length >= 5 && customers.length >= 4) {
    const latestOrders = await prisma.orders.findMany({ orderBy: { id: "desc" }, take: 4 });
    const warrantyRows = [
      {
        serial: "SN-SCH-MCB-2026-901",
        prod: allProducts[0],
        cust: customers[0],
        ord: latestOrders[0],
        months: 24,
        status: "ACTIVE",
        pDaysAgo: 15,
        notes: "2-Year official Schneider replacement warranty card issued",
      },
      {
        serial: "SN-SSG-LED-2026-902",
        prod: allProducts[1],
        cust: customers[1],
        ord: latestOrders[1] || latestOrders[0],
        months: 12,
        status: "ACTIVE",
        pDaysAgo: 10,
        notes: "12-Month LED panel replacement warranty active",
      },
      {
        serial: "SN-FAN-SSG-2026-903",
        prod: allProducts[2],
        cust: customers[2],
        ord: latestOrders[2] || latestOrders[0],
        months: 24,
        status: "CLAIMED",
        pDaysAgo: 45,
        notes: "Coil humming noise under load — sent for service center check",
      },
      {
        serial: "SN-BRK-ACT9-2026-904",
        prod: allProducts[3],
        cust: customers[3],
        ord: latestOrders[0],
        months: 18,
        status: "REPLACED",
        pDaysAgo: 60,
        notes: "Thermal latch issue verified — instant counter replacement given",
      },
      {
        serial: "SN-FLD-30W-2026-905",
        prod: allProducts[4],
        cust: customers[1],
        ord: latestOrders[1] || latestOrders[0],
        months: 12,
        status: "CLAIMED",
        pDaysAgo: 30,
        notes: "LED driver surge failure — logged for factory replacement",
      },
    ];

    for (const wr of warrantyRows) {
      const pDate = dateObj(wr.pDaysAgo);
      const expDate = new Date(pDate);
      expDate.setMonth(expDate.getMonth() + wr.months);

      await prisma.warranty_records.upsert({
        where: { serial_number: wr.serial },
        update: {},
        create: {
          serial_number: wr.serial,
          product_id: wr.prod.id,
          customer_id: wr.cust.id,
          order_id: wr.ord?.id ?? null,
          purchase_date: pDate,
          warranty_months: wr.months,
          expiry_date: expDate,
          status: wr.status,
          notes: wr.notes,
        },
      });
    }
    console.log("  ✔ Seeded 5 serial warranty & replacement claim records.");
  }

  console.log("✅ All ERP tables now have rich, consistent Protikkha Electric records!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});

