import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  getBangladeshDate,
  getProductCategoryMap,
  lockProductsAscending,
  getAvailableStockWithPendingReservations,
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

      // 2. Classify products by category (Tiles vs Non-Tiles)
      const categoryMap = await getProductCategoryMap(productIds, tx);

      let hasTiles = false;
      for (const item of validItems) {
        const catInfo = categoryMap.get(String(item.product_id));
        if (catInfo?.isTiles) {
          hasTiles = true;
          break;
        }
      }

      // 3. Pre-validate stock availability for all items
      for (const item of validItems) {
        const catInfo = categoryMap.get(String(item.product_id));
        const reqQty = parseFloat(String(item.quantity || "0"));
        const prodName = catInfo?.product?.product_name || `Product #${item.product_id}`;

        if (catInfo?.isTiles) {
          // Tiles: check available stock taking into account pending challan reservations
          const { availableStock } = await getAvailableStockWithPendingReservations(
            item.product_id,
            tx
          );
          if (reqQty > availableStock) {
            throw new Error(
              `Insufficient stock for "${prodName}". Available (after reservations): ${availableStock}, Requested: ${reqQty}`
            );
          }
        } else {
          // Non-Tiles: check direct physical stock
          const [currentProd]: any = await tx.$queryRawUnsafe(
            "SELECT quantity FROM products WHERE id = ?",
            BigInt(item.product_id)
          );
          const physicalStock = parseFloat(currentProd?.quantity || "0");
          if (reqQty > physicalStock) {
            throw new Error(
              `Insufficient stock for "${prodName}". In Stock: ${physicalStock}, Requested: ${reqQty}`
            );
          }
        }
      }

      // 4. Create Order with appropriate Challan status
      const initialChallanStatus = hasTiles ? "PENDING" : "NOT_REQUIRED";
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

      // 5. Insert OrderDetails and mutate stock only for non-Tiles items
      for (const item of validItems) {
        const catInfo = categoryMap.get(String(item.product_id));
        const isTiles = !!catInfo?.isTiles;
        const lineState = isTiles ? "PENDING_CHALLAN" : "DEDUCTED_AT_INVOICE";
        const decrementQty = parseFloat(String(item.quantity || "0"));

        await tx.order_details.create({
          data: {
            order_id: newOrder.id,
            product_id: BigInt(item.product_id),
            quantity: String(item.quantity),
            price: String(item.price || "0"), // Cost price
            selling_price: String(item.selling_price || item.price || "0"),
            user_id: BigInt(userId),
            stock_lifecycle_state: lineState,
          },
        });

        // Deduct stock immediately ONLY if NOT Tiles
        if (!isTiles) {
          const [currentProd]: any = await tx.$queryRawUnsafe(
            "SELECT quantity FROM products WHERE id = ?",
            BigInt(item.product_id)
          );
          const currentQty = parseFloat(currentProd?.quantity || "0");
          const newStock = Math.max(0, currentQty - decrementQty);

          await tx.products.update({
            where: { id: BigInt(item.product_id) },
            data: { quantity: String(newStock) },
          });
        }
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
          await tx.customers.update({
            where: { id: BigInt(customer_id) },
            data: { previous_due_amount: String(prevDue + addedDue) },
          });
        }
      }

      return {
        ...newOrder,
        has_tiles: hasTiles,
        challan_status: initialChallanStatus,
      };
    });

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
