import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchaseId = BigInt(id);

    const purchase = await prisma.purchases.findUnique({
      where: { id: purchaseId },
      include: {
        suppliers: true,
        purchase_order_details: {
          include: {
            products: {
              include: {
                units: true,
              },
            },
          },
        },
        purchase_payment_details: true,
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!purchase) {
      return NextResponse.json({ status: "fail", message: "Purchase not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: "success",
      data: {
        id: Number(purchase.id),
        purchase_id: purchase.purchase_id,
        referance_no: purchase.referance_no,
        date: purchase.date ? purchase.date.toISOString().split("T")[0] : null,
        grand_subtotal: parseFloat(purchase.grand_subtotal || "0"),
        delivery_charge: parseFloat(String(purchase.delivery_charge || 0)),
        paid_amount: parseFloat(purchase.paid_amount || "0"),
        due_amount: parseFloat(purchase.due_amount || "0"),
        purchase_payable_amount: parseFloat(purchase.purchase_payable_amount || "0"),
        creator: purchase.users?.name || "Admin",
        supplier: purchase.suppliers
          ? {
              id: Number(purchase.suppliers.id),
              supplier_id: purchase.suppliers.supplier_id,
              name: purchase.suppliers.name,
              company: purchase.suppliers.company,
              mobile: purchase.suppliers.mobile,
              address: purchase.suppliers.address,
              payable_amount: parseFloat(purchase.suppliers.purchase_payable_amount || "0"),
            }
          : null,
        details: purchase.purchase_order_details.map((d) => ({
          id: Number(d.id),
          product_id: Number(d.product_id),
          product_name: d.products?.product_name || "N/A",
          quantity: parseFloat(d.quantity || "0"),
          cost_price: parseFloat(d.cost_price || "0"),
          subtotal: parseFloat(d.subtotal || "0"),
          unit: d.products?.units?.unit_name || "Pcs",
        })),
        payments: purchase.purchase_payment_details.map((pm) => ({
          id: Number(pm.id),
          paid_amount: Number(pm.paid_amount || 0),
          payment_method: pm.payment_method || "Cash",
          payment_status: pm.payment_status || "Paid",
          transaction_id: pm.transaction_id,
          date: pm.purchase_due_collection_date
            ? pm.purchase_due_collection_date.toISOString().split("T")[0]
            : null,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: "fail", message: error?.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const purchaseId = BigInt(id);

    const purchase = await prisma.purchases.findUnique({
      where: { id: purchaseId },
      include: {
        purchase_order_details: true,
      },
    });

    if (!purchase) {
      return NextResponse.json({ status: "fail", message: "Purchase record not found" }, { status: 404 });
    }

    // Execute atomic deletion with stock and balance reversal
    await prisma.$transaction(async (tx) => {
      // 1. Revert product stocks
      for (const d of purchase.purchase_order_details) {
        const qtyNum = parseFloat(d.quantity || "0");
        const prod = await tx.products.findUnique({
          where: { id: d.product_id },
          select: { quantity: true },
        });
        if (prod) {
          const currentStock = parseFloat(prod.quantity || "0");
          const revertedStock = Math.max(0, currentStock - qtyNum);
          await tx.products.update({
            where: { id: d.product_id },
            data: { quantity: String(revertedStock) },
          });
        }
      }

      // 2. Adjust supplier payable due amount
      const dueNum = parseFloat(purchase.due_amount || "0");
      if (purchase.supplier_id && dueNum > 0) {
        const supp = await tx.suppliers.findUnique({
          where: { id: purchase.supplier_id },
          select: { purchase_payable_amount: true },
        });
        if (supp) {
          const currentPayable = parseFloat(supp.purchase_payable_amount || "0");
          const revertedPayable = Math.max(0, currentPayable - dueNum);
          await tx.suppliers.update({
            where: { id: purchase.supplier_id },
            data: { purchase_payable_amount: String(revertedPayable) },
          });
        }
      }

      // 3. Delete returns, payments, items, and purchase
      await tx.purchase_returns.deleteMany({
        where: { purchase_id: purchaseId },
      });

      await tx.purchase_payment_details.deleteMany({
        where: { purchases_id: purchaseId },
      });

      await tx.purchase_order_details.deleteMany({
        where: { purchase_id: purchaseId },
      });

      await tx.purchases.delete({
        where: { id: purchaseId },
      });
    });

    return NextResponse.json({
      status: "success",
      message: "Purchase record deleted and inventory/balances reverted successfully.",
    });
  } catch (error: any) {
    console.error("Purchase DELETE Error:", error);
    return NextResponse.json({ status: "fail", message: error?.message || "Failed to delete purchase" }, { status: 500 });
  }
}
