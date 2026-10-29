import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function generateOrderNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const { id } = await params;
    const quotId = BigInt(id);

    const quotation = await prisma.project_quotations.findUnique({
      where: { id: quotId },
      include: {
        quotation_items: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!quotation) {
      return NextResponse.json(
        { status: "fail", message: "Quotation not found" },
        { status: 404 }
      );
    }

    if (quotation.status === "CONVERTED_TO_ORDER" && quotation.order_id) {
      return NextResponse.json(
        {
          status: "fail",
          message: `This quotation is already converted to Order #${quotation.order_id}`,
        },
        { status: 400 }
      );
    }

    const orderNumber = generateOrderNumber();
    const invDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Customer
      let customerId: bigint;
      if (quotation.client_phone) {
        let existingCust = await tx.customers.findFirst({
          where: { mobile: quotation.client_phone },
        });

        if (!existingCust) {
          const custCode = `CUST-${Date.now().toString().slice(-5)}`;
          existingCust = await tx.customers.create({
            data: {
              customer_id: custCode,
              customer_name: quotation.client_name,
              mobile: quotation.client_phone,
              address_details: quotation.client_address || null,
              previous_due_amount: "0",
              user_id: BigInt(userId),
            },
          });
        }
        customerId = existingCust.id;
      } else {
        const defaultCust = await tx.customers.findFirst({
          where: { customer_name: { contains: "Walk-in" } },
        });
        customerId = defaultCust ? defaultCust.id : BigInt(1);
      }

      const subtotal = parseFloat(String(quotation.subtotal || 0));
      const discount = parseFloat(String(quotation.discount_amount || 0));
      const grandTotal = parseFloat(String(quotation.estimated_total || subtotal - discount));

      // 2. Create Order
      const newOrder = await tx.orders.create({
        data: {
          customer_id: customerId,
          order_no: orderNumber,
          sub_total: subtotal,
          delivery_charge: 0,
          discount_amount: discount,
          paid_amount: 0,
          due_amount: grandTotal,
          previous_due_amount: 0,
          order_note: `Generated from Project Estimation ${quotation.quotation_no} (${quotation.project_name})`,
          invoice_date: invDate,
          user_id: BigInt(userId),
          challan_status: "NOT_REQUIRED",
        },
      });

      // 3. Insert Order Details and decrement stock
      for (const item of quotation.quotation_items) {
        const prodId = item.product_id;
        const qty = parseFloat(String(item.quantity || 1));
        const price = parseFloat(String(item.products?.cost_price || "0"));
        const sellPrice = parseFloat(String(item.unit_price || "0"));

        await tx.order_details.create({
          data: {
            order_id: newOrder.id,
            product_id: prodId,
            quantity: String(qty),
            price: String(price),
            selling_price: String(sellPrice),
            user_id: BigInt(userId),
            stock_lifecycle_state: "DEDUCTED_AT_INVOICE",
          },
        });

        // Decrement stock in physical warehouse
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT quantity FROM products WHERE id = ? FOR UPDATE",
          prodId
        );
        if (currentProd) {
          const currentQty = parseFloat(String(currentProd.quantity || 0));
          const newQty = Math.max(0, currentQty - qty);
          await tx.products.update({
            where: { id: prodId },
            data: { quantity: String(newQty) },
          });
        }
      }

      // 4. Create Order Payment Details (Due)
      await tx.order_payment_details.create({
        data: {
          order_id: newOrder.id,
          paid_amount: 0,
          payment_method: "Cash",
          payment_status: "Due",
          due_collection_date: invDate.toISOString().split("T")[0],
          user_id: BigInt(userId),
        },
      });

      // 5. Update Customer previous_due_amount & Party Ledger
      const customer = await tx.customers.findUnique({
        where: { id: customerId },
        select: { previous_due_amount: true },
      });

      if (customer) {
        const curDue = parseFloat(customer.previous_due_amount || "0");
        const newDue = curDue + grandTotal;

        await tx.customers.update({
          where: { id: customerId },
          data: { previous_due_amount: String(newDue) },
        });

        await tx.party_ledger_entries.create({
          data: {
            party_type: "CUSTOMER",
            customer_id: customerId,
            transaction_type: "INVOICE",
            reference_type: "ORDER",
            reference_id: newOrder.id,
            reference_no: newOrder.order_no,
            debit: new Prisma.Decimal(grandTotal.toFixed(2)),
            credit: new Prisma.Decimal(0),
            balance: new Prisma.Decimal(newDue.toFixed(2)),
            date: invDate,
            note: `Invoice ${newOrder.order_no} from Quotation ${quotation.quotation_no}`,
            user_id: BigInt(userId),
          },
        });
      }

      // 6. Update Quotation Status
      await tx.project_quotations.update({
        where: { id: quotId },
        data: {
          status: "CONVERTED_TO_ORDER",
          order_id: newOrder.id,
        },
      });

      return newOrder;
    });

    return NextResponse.json({
      status: "success",
      message: `Quotation successfully converted to Invoice #${result.order_no}!`,
      data: {
        order_id: Number(result.id),
        order_no: result.order_no,
      },
    });
  } catch (error: any) {
    console.error("Quotation Conversion Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to convert quotation" },
      { status: 500 }
    );
  }
}
