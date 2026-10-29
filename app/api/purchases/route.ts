import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function generatePurchaseNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `PUR-${dateStr}-${randomSuffix}`;
}

// GET: All Purchases (Latest first, Rule 7.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const supplierId = searchParams.get("supplier_id");
    const limitParam = searchParams.get("limit");
    const limit = limitParam && limitParam !== "all" && !isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

    const where: any = {};
    if (supplierId) where.supplier_id = BigInt(supplierId);

    const purchases = await prisma.purchases.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      orderBy: { id: "desc" },
      include: {
        suppliers: {
          select: {
            id: true,
            supplier_id: true,
            name: true,
            company: true,
            mobile: true,
          },
        },
        purchase_order_details: {
          include: {
            products: {
              select: {
                id: true,
                product_name: true,
                units: true,
                electrical_specifications: true,
                packaging_conversions: true,
              },
            },
          },
        },
        purchase_payment_details: true,
      },
    });

    let formatted = purchases.map((p) => {
      const itemsCount = p.purchase_order_details.reduce(
        (sum, item) => sum + parseFloat(item.quantity || "0"),
        0
      );

      return {
        id: Number(p.id),
        purchase_id: p.purchase_id,
        referance_no: p.referance_no,
        date: p.date ? p.date.toISOString().split("T")[0] : null,
        grand_subtotal: parseFloat(p.grand_subtotal || "0"),
        delivery_charge: parseFloat(String(p.delivery_charge || 0)),
        paid_amount: parseFloat(p.paid_amount || "0"),
        due_amount: parseFloat(p.due_amount || "0"),
        attach_document: p.attach_document,
        supplier_id: Number(p.supplier_id),
        supplier: p.suppliers
          ? {
              id: Number(p.suppliers.id),
              name: p.suppliers.name,
              company: p.suppliers.company,
              mobile: p.suppliers.mobile,
            }
          : null,
        total_items: itemsCount,
        details: p.purchase_order_details.map((d) => {
          const spec = d.products?.electrical_specifications;
          return {
            id: Number(d.id),
            product_id: Number(d.product_id),
            product_name: d.products?.product_name || "N/A",
            quantity: parseFloat(d.quantity || "0"),
            cost_price: parseFloat(d.cost_price || "0"),
            subtotal: parseFloat(d.subtotal || "0"),
            unit: d.products?.units?.unit_name || "Pcs",
            electrical_spec: spec
              ? {
                  spec_type: spec.spec_type,
                  cable_size: spec.cable_size,
                  voltage_grade: spec.voltage_grade,
                  current_rating: spec.current_rating,
                  wattage: spec.wattage,
                  gang_module: spec.gang_module,
                }
              : null,
          };
        }),
        payments: p.purchase_payment_details.map((pm) => ({
          id: Number(pm.id),
          paid_amount: Number(pm.paid_amount || 0),
          payment_method: pm.payment_method || "Cash",
          payment_status: pm.payment_status || "Paid",
          transaction_id: pm.transaction_id,
        })),
      };
    });

    if (search) {
      formatted = formatted.filter(
        (p) =>
          p.purchase_id.toLowerCase().includes(search) ||
          (p.referance_no && p.referance_no.toLowerCase().includes(search)) ||
          (p.supplier && p.supplier.name.toLowerCase().includes(search)) ||
          (p.supplier && p.supplier.company.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Purchases GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load purchases" },
      { status: 500 }
    );
  }
}

// POST: Create Purchase Inward (Atomic Transaction & Electrical Stock Increment)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const {
      supplier_id,
      referance_no,
      date,
      grand_subtotal,
      delivery_charge,
      paid_amount,
      due_amount,
      payment_method,
      transaction_id,
      items, // Array of { product_id, quantity, package_unit?, conversion_ratio?, base_quantity?, cost_price, subtotal }
    } = body;

    if (!supplier_id) {
      return NextResponse.json(
        { status: "fail", message: "Supplier selection is required!" },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Purchase items list cannot be empty!" },
        { status: 400 }
      );
    }

    const suppId = BigInt(supplier_id);
    const purchaseCode = generatePurchaseNumber();
    const purDate = date ? new Date(date) : new Date();
    const grandSub = parseFloat(String(grand_subtotal || "0"));
    const delivChg = parseFloat(String(delivery_charge || "0"));
    const paidNum = parseFloat(String(paid_amount || "0"));
    const dueNum = parseFloat(String(due_amount || "0"));

    const productIds = items
      .map((item: any) => (item && item.product_id ? Number(item.product_id) : null))
      .filter((id): id is number => id !== null);

    const result = await prisma.$transaction(async (tx) => {
      // Lock affected product rows in ascending order
      if (productIds.length > 0) {
        const sortedIds = Array.from(new Set(productIds)).sort((a, b) => a - b);
        for (const pid of sortedIds) {
          await tx.$queryRawUnsafe("SELECT id, quantity FROM products WHERE id = ? FOR UPDATE", BigInt(pid));
        }
      }

      // 1. Get supplier to check current balance
      const supplier = await tx.suppliers.findUnique({
        where: { id: suppId },
      });

      if (!supplier) {
        throw new Error("Selected supplier does not exist!");
      }

      const prevPayable = parseFloat(supplier.purchase_payable_amount || "0");
      const totalPayable = prevPayable + dueNum;

      // 2. Create Purchase Record
      const newPurchase = await tx.purchases.create({
        data: {
          purchase_id: purchaseCode,
          referance_no: referance_no ? String(referance_no).trim() : null,
          grand_subtotal: String(grandSub),
          delivery_charge: delivChg,
          paid_amount: String(paidNum),
          due_amount: String(dueNum),
          purchase_payable_amount: String(totalPayable),
          date: purDate,
          supplier_id: suppId,
          user_id: BigInt(userId),
        },
      });

      // 3. Insert Purchase Order Details & Increment Stock
      for (const item of items) {
        if (!item.product_id || !item.quantity) continue;

        const prodId = BigInt(item.product_id);
        const qtyNum = parseFloat(String(item.quantity || "0"));
        const costNum = parseFloat(String(item.cost_price || "0"));

        // If purchased in bulk packaging (e.g. 5 Reels with ratio 100 -> 500 Meters)
        let effectiveQty = qtyNum;
        if (item.base_quantity && parseFloat(String(item.base_quantity)) > 0) {
          effectiveQty = parseFloat(String(item.base_quantity));
        } else if (item.conversion_ratio && parseFloat(String(item.conversion_ratio)) > 1) {
          effectiveQty = qtyNum * parseFloat(String(item.conversion_ratio));
        }

        const lineTotal = item.subtotal ? parseFloat(String(item.subtotal)) : costNum * qtyNum;

        await tx.purchase_order_details.create({
          data: {
            purchase_id: newPurchase.id,
            product_id: prodId,
            quantity: String(effectiveQty),
            cost_price: String(costNum),
            subtotal: String(lineTotal),
            user_id: BigInt(userId),
          },
        });

        // INCREMENT PRODUCT STOCK (Stock Inward)
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT quantity FROM products WHERE id = ?",
          prodId
        );

        if (currentProd) {
          const currentStock = parseFloat(currentProd.quantity || "0");
          const newStock = currentStock + effectiveQty;

          await tx.products.update({
            where: { id: prodId },
            data: {
              quantity: String(newStock),
              cost_price: String(costNum), // update latest cost price
            },
          });
        }
      }

      // 4. Create Purchase Payment Details
      await tx.purchase_payment_details.create({
        data: {
          purchases_id: newPurchase.id,
          paid_amount: paidNum,
          payment_method: payment_method || "Cash",
          payment_status: dueNum <= 0 ? "Paid" : paidNum > 0 ? "Partial" : "Due",
          transaction_id: transaction_id || null,
          purchase_due_collection_date: purDate,
          user_id: BigInt(userId),
        },
      });

      // 5. Update Supplier Balance if Due & Record Ledger
      if (dueNum > 0) {
        await tx.suppliers.update({
          where: { id: suppId },
          data: {
            purchase_payable_amount: String(totalPayable),
          },
        });

        await tx.party_ledger_entries.create({
          data: {
            party_type: "SUPPLIER",
            supplier_id: suppId,
            transaction_type: "PURCHASE",
            reference_type: "PURCHASE",
            reference_id: newPurchase.id,
            reference_no: newPurchase.purchase_id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(dueNum.toFixed(2)),
            balance: new Prisma.Decimal(totalPayable.toFixed(2)),
            date: purDate,
            note: `Purchase Bill ${newPurchase.purchase_id} Due Payable`,
            user_id: BigInt(userId),
          },
        });
      }

      return newPurchase;
    });

    return NextResponse.json({
      status: "success",
      message: "Electrical purchase inward recorded and stock updated successfully!",
      id: Number(result.id),
      purchase_id: result.purchase_id,
    });
  } catch (error: any) {
    console.error("Purchase Inward Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to record purchase" },
      { status: 500 }
    );
  }
}
