import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const {
      customer_id,
      paid_amount,
      discount_amount,
      payment_method,
      transaction_id,
      order_id,
      note,
    } = body;

    if (!customer_id || !paid_amount) {
      return NextResponse.json(
        { status: "fail", message: "Customer and payment amount are required!" },
        { status: 400 }
      );
    }

    const custId = BigInt(customer_id);
    const paidNum = parseFloat(String(paid_amount || "0"));
    const discNum = parseFloat(String(discount_amount || "0"));
    const totalDeduction = paidNum + discNum;

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customers.findUnique({
        where: { id: custId },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      const prevDue = parseFloat(customer.previous_due_amount || "0");
      const newCustomerDue = Math.max(0, prevDue - totalDeduction);

      const colDate = body.due_collection_date ? new Date(body.due_collection_date) : new Date();
      const colDateStr = colDate.toISOString().split("T")[0];

      // Update customer previous due amount
      await tx.customers.update({
        where: { id: custId },
        data: {
          previous_due_amount: String(newCustomerDue),
        },
      });

      // Create customer_payment_details record
      await tx.customer_payment_details.create({
        data: {
          customer_id: custId,
          paid_amount: String(paidNum),
          discount_amount: String(discNum),
          due_amount: String(newCustomerDue),
          previous_due_amount: String(prevDue),
          payment_method: payment_method || "Cash",
          transaction_id: transaction_id || null,
          payment_status: newCustomerDue <= 0 ? "Paid" : "Partial",
          due_collection_date: colDate,
          user_id: BigInt(userId),
        },
      });

      // Apply payment to customer's order(s) so invoice balances and paid amounts remain perfectly synchronized
      let remainingDeduction = totalDeduction;
      let remainingPaid = paidNum;

      // 1. If a specific order is targeted (e.g. from Invoices List), apply to it first
      if (order_id) {
        const specificOrder = await tx.orders.findUnique({
          where: { id: BigInt(order_id) },
        });

        if (specificOrder) {
          const curOrderDue = Number(specificOrder.due_amount || 0);
          const curOrderPaid = Number(specificOrder.paid_amount || 0);
          const toDeduct = Math.min(curOrderDue, remainingDeduction);
          const toPay = Math.min(remainingPaid, toDeduct);
          const toDisc = Math.round((toDeduct - toPay) * 100) / 100;
          const newOrderPaid = Math.round((curOrderPaid + toPay) * 100) / 100;
          const newOrderDue = Math.max(0, Math.round((curOrderDue - toDeduct) * 100) / 100);

          await tx.orders.update({
            where: { id: specificOrder.id },
            data: {
              paid_amount: newOrderPaid,
              due_amount: newOrderDue,
            },
          });

          await tx.order_payment_details.create({
            data: {
              order_id: specificOrder.id,
              paid_amount: toPay,
              discount_amount: toDisc > 0 ? toDisc : null,
              payment_method: payment_method || "Cash",
              transaction_id: transaction_id || null,
              payment_status: newOrderDue <= 0 ? "Paid" : "Due",
              due_collection_date: colDateStr,
              user_id: BigInt(userId),
            },
          });

          remainingDeduction = Math.round((remainingDeduction - toDeduct) * 100) / 100;
          remainingPaid = Math.round((remainingPaid - toPay) * 100) / 100;
        }
      }

      // 2. Distribute remaining payment to any other due orders of this customer (oldest first)
      if (remainingDeduction > 0) {
        const dueOrders = await tx.orders.findMany({
          where: {
            customer_id: custId,
            due_amount: { gt: 0 },
            ...(order_id ? { id: { not: BigInt(order_id) } } : {}),
          },
          orderBy: { id: "asc" },
        });

        for (const ord of dueOrders) {
          if (remainingDeduction <= 0) break;
          const curOrderDue = Number(ord.due_amount || 0);
          if (curOrderDue <= 0) continue;

          const toDeduct = Math.min(curOrderDue, remainingDeduction);
          const toPay = Math.min(remainingPaid, toDeduct);
          const toDisc = Math.round((toDeduct - toPay) * 100) / 100;
          const curOrderPaid = Number(ord.paid_amount || 0);
          const newOrderPaid = Math.round((curOrderPaid + toPay) * 100) / 100;
          const newOrderDue = Math.max(0, Math.round((curOrderDue - toDeduct) * 100) / 100);

          await tx.orders.update({
            where: { id: ord.id },
            data: {
              paid_amount: newOrderPaid,
              due_amount: newOrderDue,
            },
          });

          await tx.order_payment_details.create({
            data: {
              order_id: ord.id,
              paid_amount: toPay,
              discount_amount: toDisc > 0 ? toDisc : null,
              payment_method: payment_method || "Cash",
              transaction_id: transaction_id || null,
              payment_status: newOrderDue <= 0 ? "Paid" : "Due",
              due_collection_date: colDateStr,
              user_id: BigInt(userId),
            },
          });

          remainingDeduction = Math.round((remainingDeduction - toDeduct) * 100) / 100;
          remainingPaid = Math.round((remainingPaid - toPay) * 100) / 100;
        }
      }

      return { newCustomerDue };
    });

    return NextResponse.json({
      status: "success",
      message: "Customer due payment collected successfully!",
      new_due_amount: result.newCustomerDue,
    });
  } catch (error: any) {
    console.error("Customer Due Collection Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to collect due" },
      { status: 500 }
    );
  }
}
