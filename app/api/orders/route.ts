import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { validateDiscountLimit } from "@/lib/rbac";
import { logAudit } from "@/lib/audit-service";
import {
  getBangladeshDate,
  lockProductsAscending,
} from "@/lib/challan-service";

export const dynamic = "force-dynamic";

function generateOrderNumber(): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const {
      customer_id,
      order_no,
      sub_total,
      delivery_charge,
      discount_amount,
      return_adjustment_amount,
      paid_amount,
      due_amount,
      previous_due_amount,
      order_note,
      invoice_date,
      payment_method,
      transaction_id,
      payment_status,
      products, // Array of { product_id, quantity, price, selling_price }
    } = body;

    // RBAC: Validate discount percentage limit against user role
    const discountVal = parseFloat(String(discount_amount || "0"));
    const subTotalVal = parseFloat(String(sub_total || "0"));
    if (discountVal > 0 && subTotalVal > 0 && user?.role) {
      const discountPct = (discountVal / subTotalVal) * 100;
      const discountCheck = validateDiscountLimit(user.role, discountPct);
      if (!discountCheck.allowed) {
        return NextResponse.json(
          { status: "fail", message: discountCheck.reason },
          { status: 403 }
        );
      }
    }

    if (!customer_id) {
      return NextResponse.json(
        { status: "fail", message: "Customer selection or creation is required!" },
        { status: 422 }
      );
    }

    if (!Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Cart cannot be empty!" },
        { status: 400 }
      );
    }

    const orderNumber = order_no || generateOrderNumber();
    const invDate = invoice_date ? new Date(invoice_date) : getBangladeshDate();

    // Extract product IDs
    const validItems = products.filter(
      (item: any) => item && item.product_id && Number(item.quantity || 0) > 0
    );
    if (validItems.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Cart contains no valid items!" },
        { status: 400 }
      );
    }

    const productIds = validItems.map((item: any) => Number(item.product_id));

    // Run order creation and stock handling in single atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock affected product rows in ascending order to prevent deadlocks and lost updates
      await lockProductsAscending(productIds, tx);

      // 2. Pre-validate stock availability for all electrical items with packaging conversion ratio
      for (const item of validItems) {
        const reqQty = parseFloat(String(item.quantity || "0"));
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT product_name, quantity FROM products WHERE id = ?",
          BigInt(item.product_id)
        );
        const prodName = currentProd?.product_name || `Product #${item.product_id}`;
        const physicalStock = parseFloat(currentProd?.quantity || "0");
        const ratio = parseFloat(String(item.conversion_ratio || "1")) || 1;
        const requiredBaseQty =
          item.base_quantity != null
            ? parseFloat(String(item.base_quantity))
            : +(reqQty * ratio).toFixed(4);

        if (requiredBaseQty > physicalStock + 0.0001) {
          throw new Error(
            `Insufficient stock for "${prodName}". Available: ${physicalStock}, Requested: ${requiredBaseQty}`
          );
        }
      }

      // 3. Create Order
      const initialChallanStatus = Number(delivery_charge || 0) > 0 ? "PENDING" : "NOT_REQUIRED";
      const newOrder = await tx.orders.create({
        data: {
          customer_id: BigInt(customer_id),
          order_no: orderNumber,
          sub_total: Number(sub_total || 0),
          delivery_charge: Number(delivery_charge || 0),
          discount_amount: Number(discount_amount || 0),
          return_adjustment_amount: Number(return_adjustment_amount || 0),
          paid_amount: Number(paid_amount || 0),
          due_amount: Number(due_amount || 0),
          previous_due_amount: Number(previous_due_amount || 0),
          order_note: order_note || null,
          invoice_date: invDate,
          user_id: BigInt(userId),
          challan_status: initialChallanStatus,
        },
      });

      // 4. Insert OrderDetails and deduct electrical stock immediately
      for (const item of validItems) {
        await tx.order_details.create({
          data: {
            order_id: newOrder.id,
            product_id: BigInt(item.product_id),
            quantity: String(item.quantity),
            price: String(item.price || "0"), // Cost price
            selling_price: String(item.selling_price || item.price || "0"),
            user_id: BigInt(userId),
            stock_lifecycle_state: "DEDUCTED_AT_INVOICE",
          },
        });

        // Deduct electrical stock immediately in product base unit
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT quantity, cost_price FROM products WHERE id = ?",
          BigInt(item.product_id)
        );
        const currentQty = parseFloat(currentProd?.quantity || "0");
        const ratio = parseFloat(String(item.conversion_ratio || "1")) || 1;
        const decrementQty =
          item.base_quantity != null
            ? parseFloat(String(item.base_quantity))
            : +(parseFloat(String(item.quantity || "0")) * ratio).toFixed(4);
        const newStock = Math.max(0, +(currentQty - decrementQty).toFixed(4));

        await tx.products.update({
          where: { id: BigInt(item.product_id) },
          data: { quantity: String(newStock) },
        });

        await tx.stock_movements.create({
          data: {
            product_id: BigInt(item.product_id),
            movement_type: "SALE",
            quantity: new Prisma.Decimal(decrementQty.toFixed(3)),
            unit_price: new Prisma.Decimal(Number(item.selling_price || 0).toFixed(2)),
            total_value: new Prisma.Decimal(
              (Number(item.selling_price || 0) * Number(item.quantity || 0)).toFixed(2)
            ),
            reference_type: "ORDER",
            reference_id: newOrder.id,
            reference_no: newOrder.order_no,
            stock_after: new Prisma.Decimal(newStock.toFixed(3)),
            date: invDate,
            note: item.selected_unit
              ? `POS Sale (${item.quantity} ${item.selected_unit})`
              : `POS Sale (${item.quantity})`,
            user_id: BigInt(userId),
          },
        });
      }

      // 6. Create Payment Details
      await tx.order_payment_details.create({
        data: {
          order_id: newOrder.id,
          paid_amount: Number(paid_amount || 0),
          transaction_id: transaction_id || null,
          payment_method: payment_method || "Cash",
          payment_status: payment_status || (Number(due_amount || 0) <= 0 ? "Paid" : "Due"),
          due_collection_date: invDate.toISOString().split("T")[0],
          user_id: BigInt(userId),
        },
      });

      // 7. Update customer previous due amount
      if (Number(due_amount || 0) > 0) {
        const customer = await tx.customers.findUnique({
          where: { id: BigInt(customer_id) },
          select: { previous_due_amount: true },
        });

        if (customer) {
          const prevDue = parseFloat(customer.previous_due_amount || "0");
          const addedDue = parseFloat(String(due_amount || "0"));
          const newDue = prevDue + addedDue;
          await tx.customers.update({
            where: { id: BigInt(customer_id) },
            data: { previous_due_amount: String(newDue) },
          });

          await tx.party_ledger_entries.create({
            data: {
              party_type: "CUSTOMER",
              customer_id: BigInt(customer_id),
              transaction_type: "INVOICE",
              reference_type: "ORDER",
              reference_id: newOrder.id,
              reference_no: newOrder.order_no,
              debit: new Prisma.Decimal(addedDue.toFixed(2)),
              credit: new Prisma.Decimal(0),
              balance: new Prisma.Decimal(newDue.toFixed(2)),
              date: invDate,
              note: `Invoice ${newOrder.order_no} Due Amount`,
              user_id: BigInt(userId),
            },
          });
        }
      }

      return {
        ...newOrder,
        has_tiles: false,
        challan_status: initialChallanStatus,
      };
    });

    // Record immutable audit log
    await logAudit({
      userId,
      action: "CREATE",
      entityType: "ORDER",
      entityId: String(result.id),
      newValues: {
        order_no: result.order_no,
        customer_id,
        sub_total,
        paid_amount,
        due_amount,
        discount_amount,
      },
    });

    if (discountVal > 0) {
      await logAudit({
        userId,
        action: "APPROVE",
        entityType: "DISCOUNT_OVERRIDE",
        entityId: String(result.id),
        newValues: {
          order_no: result.order_no,
          discount_amount: discountVal,
          discount_percent: subTotalVal > 0 ? (discountVal / subTotalVal) * 100 : 0,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "Order created successfully",
      invoice_id: Number(result.id),
      order_no: result.order_no,
      has_tiles: result.has_tiles,
      challan_status: result.challan_status,
    });
  } catch (error: any) {
    console.error("Order Creation Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Order creation failed" },
      { status: 500 }
    );
  }
}
