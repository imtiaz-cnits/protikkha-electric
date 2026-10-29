import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const {
      supplier_id,
      purchase_id,
      paid_amount,
      discount_amount,
      payment_method,
      transaction_id,
      due_collection_date,
    } = body;

    if (!supplier_id || !paid_amount) {
      return NextResponse.json(
        { status: "fail", message: "Supplier and paid amount are required" },
        { status: 400 }
      );
    }

    const suppId = BigInt(supplier_id);
    const paidNum = parseFloat(String(paid_amount || "0"));
    const discNum = parseFloat(String(discount_amount || "0"));
    const totalDeduction = Math.round((paidNum + discNum) * 100) / 100;
    const colDate = due_collection_date ? new Date(due_collection_date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.suppliers.findUnique({
        where: { id: suppId },
      });

      if (!supplier) {
        throw new Error("Supplier not found");
      }

      const currentDue = parseFloat(supplier.purchase_payable_amount || "0");
      const newDue = Math.max(0, Math.round((currentDue - totalDeduction) * 100) / 100);

      // Create due collection record
      const collection = await tx.supplier_due_collections.create({
        data: {
          supplier_id: suppId,
          paid_amount: String(paidNum),
          discount_amount: String(discNum),
          due_amount: String(newDue),
          purchase_payable_amount: String(currentDue),
          payment_method: payment_method || "Cash",
          transaction_id: transaction_id || null,
          payment_status: newDue <= 0 ? "Paid" : "Partial",
          due_collection_date: colDate,
          user_id: BigInt(userId),
        },
      });

      // Update supplier's balance & Record Ledger
      await tx.suppliers.update({
        where: { id: suppId },
        data: {
          purchase_payable_amount: String(newDue),
        },
      });

      // Record in party_ledger_entries for General Ledger & Audit trail
      await tx.party_ledger_entries.create({
        data: {
          party_type: "SUPPLIER",
          supplier_id: suppId,
          transaction_type: "PAYMENT",
          reference_type: "PURCHASE_PAYMENT",
          reference_no: transaction_id || (purchase_id ? `PURCH-${purchase_id}` : undefined),
          debit: new Prisma.Decimal(totalDeduction.toFixed(2)),
          credit: new Prisma.Decimal(0),
          balance: new Prisma.Decimal(newDue.toFixed(2)),
          date: colDate,
          note: discNum > 0 ? `Paid: ৳${paidNum}, Discount: ৳${discNum}` : `Paid: ৳${paidNum}`,
          user_id: BigInt(userId),
        },
      });

      // Apply payment to supplier's purchase(s) so purchase bills and ledger remain perfectly synchronized
      let remainingDeduction = totalDeduction;
      let remainingPaid = paidNum;

      // 1. If a specific purchase is targeted, apply to it first
      if (purchase_id) {
        const specificPurchase = await tx.purchases.findUnique({
          where: { id: BigInt(purchase_id) },
        });

        if (specificPurchase) {
          const curPurchDue = parseFloat(specificPurchase.due_amount || "0");
          const curPurchPaid = parseFloat(specificPurchase.paid_amount || "0");
          const toDeduct = Math.min(curPurchDue, remainingDeduction);
          const toPay = Math.min(remainingPaid, toDeduct);
          const toDisc = Math.round((toDeduct - toPay) * 100) / 100;
          const newPurchPaid = Math.round((curPurchPaid + toPay) * 100) / 100;
          const newPurchDue = Math.max(0, Math.round((curPurchDue - toDeduct) * 100) / 100);

          await tx.purchases.update({
            where: { id: specificPurchase.id },
            data: {
              paid_amount: String(newPurchPaid),
              due_amount: String(newPurchDue),
            },
          });

          await tx.purchase_payment_details.create({
            data: {
              purchases_id: specificPurchase.id,
              paid_amount: toPay,
              discount_amount: toDisc > 0 ? toDisc : null,
              payment_method: payment_method || "Cash",
              transaction_id: transaction_id || null,
              payment_status: newPurchDue <= 0 ? "Paid" : "Due",
              purchase_due_collection_date: colDate,
              user_id: BigInt(userId),
            },
          });

          remainingDeduction = Math.round((remainingDeduction - toDeduct) * 100) / 100;
          remainingPaid = Math.round((remainingPaid - toPay) * 100) / 100;
        }
      }

      // 2. Distribute remaining payment to any other due purchases of this supplier (oldest first)
      if (remainingDeduction > 0) {
        const allPurchases = await tx.purchases.findMany({
          where: {
            supplier_id: suppId,
            ...(purchase_id ? { id: { not: BigInt(purchase_id) } } : {}),
          },
          orderBy: { id: "asc" },
        });

        for (const purch of allPurchases) {
          if (remainingDeduction <= 0) break;
          const curPurchDue = parseFloat(purch.due_amount || "0");
          if (curPurchDue <= 0) continue;

          const toDeduct = Math.min(curPurchDue, remainingDeduction);
          const toPay = Math.min(remainingPaid, toDeduct);
          const toDisc = Math.round((toDeduct - toPay) * 100) / 100;
          const curPurchPaid = parseFloat(purch.paid_amount || "0");
          const newPurchPaid = Math.round((curPurchPaid + toPay) * 100) / 100;
          const newPurchDue = Math.max(0, Math.round((curPurchDue - toDeduct) * 100) / 100);

          await tx.purchases.update({
            where: { id: purch.id },
            data: {
              paid_amount: String(newPurchPaid),
              due_amount: String(newPurchDue),
            },
          });

          await tx.purchase_payment_details.create({
            data: {
              purchases_id: purch.id,
              paid_amount: toPay,
              discount_amount: toDisc > 0 ? toDisc : null,
              payment_method: payment_method || "Cash",
              transaction_id: transaction_id || null,
              payment_status: newPurchDue <= 0 ? "Paid" : "Due",
              purchase_due_collection_date: colDate,
              user_id: BigInt(userId),
            },
          });

          remainingDeduction = Math.round((remainingDeduction - toDeduct) * 100) / 100;
          remainingPaid = Math.round((remainingPaid - toPay) * 100) / 100;
        }
      }

      return { collection, newDue };
    });

    return NextResponse.json({
      status: "success",
      message: "Supplier due payment recorded successfully",
      new_due_amount: result.newDue,
      collection_id: Number(result.collection.id),
    });
  } catch (error: any) {
    console.error("Supplier Due Collection Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to record due payment" },
      { status: 500 }
    );
  }
}
