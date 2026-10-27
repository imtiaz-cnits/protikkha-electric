import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST: Restore cancelled tiles products back into their original invoice
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const { id } = await params;
    const recordId = parseInt(id, 10);

    if (isNaN(recordId)) {
      return NextResponse.json(
        { status: "fail", message: "Invalid cancelled record ID." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch cancelled record
      const rawRecords = await tx.$queryRawUnsafe<any[]>(
        `SELECT * FROM cancelled_tiles WHERE id = ? LIMIT 1`,
        recordId
      );

      if (!rawRecords || rawRecords.length === 0) {
        throw new Error("Cancelled tiles record not found or already restored.");
      }

      const record = rawRecords[0];
      const orderIdBig = BigInt(record.order_id);

      let items: any[] = [];
      try {
        items =
          typeof record.items_data === "string"
            ? JSON.parse(record.items_data)
            : record.items_data;
      } catch {
        items = [];
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new Error("No item data found in this cancelled record.");
      }

      // 2. Fetch original order
      const order = await tx.orders.findUnique({
        where: { id: orderIdBig },
        include: { customers: true },
      });

      if (!order) {
        throw new Error(
          `Original invoice (${record.order_no}) no longer exists in the system.`
        );
      }

      // 3. Restore order_details items (merge with existing if partial, or create new if removed)
      let totalRestoredAmount = 0;
      for (const item of items) {
        const qty = parseFloat(String(item.quantity || "1"));
        const price = parseFloat(String(item.price || item.selling_price || "0"));
        const sellingPrice = parseFloat(String(item.selling_price || "0"));
        totalRestoredAmount += Math.round(qty * sellingPrice * 100) / 100;

        let existingDetail = null;
        if (item.order_detail_id) {
          existingDetail = await tx.order_details.findFirst({
            where: {
              id: BigInt(item.order_detail_id),
              order_id: orderIdBig,
            },
          });
        }

        if (!existingDetail) {
          existingDetail = await tx.order_details.findFirst({
            where: {
              order_id: orderIdBig,
              product_id: BigInt(item.product_id),
            },
          });
        }

        if (existingDetail) {
          const curQty = parseFloat(String(existingDetail.quantity || "0"));
          const newQty = curQty + qty;
          await tx.order_details.update({
            where: { id: existingDetail.id },
            data: { quantity: String(newQty) },
          });
        } else {
          await tx.order_details.create({
            data: {
              order_id: orderIdBig,
              product_id: BigInt(item.product_id),
              quantity: String(qty),
              price: String(price),
              selling_price: String(sellingPrice),
              stock_lifecycle_state:
                item.stock_lifecycle_state || "PENDING_CHALLAN",
              user_id: BigInt(userId),
            },
          });
        }

        // If stock was returned to warehouse physical stock upon cancellation, re-deduct it
        if (item.was_stock_returned) {
          const [currProd]: any = await tx.$queryRawUnsafe(
            "SELECT quantity FROM products WHERE id = ?",
            BigInt(item.product_id)
          );
          const curStock = parseFloat(currProd?.quantity || "0");
          const newStock = Math.max(0, curStock - qty);
          await tx.products.update({
            where: { id: BigInt(item.product_id) },
            data: { quantity: String(newStock) },
          });
        }
      }
      totalRestoredAmount = Math.round(totalRestoredAmount * 100) / 100;

      // 4. Recalculate order finances
      const curSubTotal = Number(order.sub_total || 0);
      const newSubTotal =
        Math.round((curSubTotal + totalRestoredAmount) * 100) / 100;
      const delivery = Number(order.delivery_charge || 0);
      const discount = Number(order.discount_amount || 0);
      const returnAdj = Number(order.return_adjustment_amount || 0);
      const newNetPayable = Math.max(
        0,
        Math.round((newSubTotal + delivery - discount - returnAdj) * 100) / 100
      );
      const curPaid = Number(order.paid_amount || 0);
      const curDue = Number(order.due_amount || 0);
      const newDue = Math.max(0, Math.round((newNetPayable - curPaid) * 100) / 100);
      const dueIncrease = Math.max(0, Math.round((newDue - curDue) * 100) / 100);

      // Reset challan status to PENDING if it was NOT_REQUIRED or CANCELLED
      let updatedChallanStatus = order.challan_status || "PENDING";
      if (
        updatedChallanStatus === "NOT_REQUIRED" ||
        updatedChallanStatus === "CANCELLED"
      ) {
        updatedChallanStatus = "PENDING";
      }

      await tx.orders.update({
        where: { id: orderIdBig },
        data: {
          sub_total: newSubTotal,
          due_amount: newDue,
          challan_status: updatedChallanStatus,
        },
      });

      // 5. Increase customer previous_due_amount by dueIncrease
      if (order.customer_id && dueIncrease > 0) {
        const cust = await tx.customers.findUnique({
          where: { id: order.customer_id },
        });

        if (cust) {
          const curCustDue = parseFloat(cust.previous_due_amount || "0");
          const newCustDue = Math.round((curCustDue + dueIncrease) * 100) / 100;
          await tx.customers.update({
            where: { id: order.customer_id },
            data: {
              previous_due_amount: String(newCustDue),
            },
          });
        }
      }

      // 6. Delete this record from cancelled_tiles
      await tx.$executeRawUnsafe(
        `DELETE FROM cancelled_tiles WHERE id = ?`,
        recordId
      );

      return {
        order_no: order.order_no,
        restoredCount: items.length,
        restoredAmount: totalRestoredAmount,
        newSubTotal,
        newDue,
        dueIncrease,
      };
    });

    return NextResponse.json({
      status: "success",
      message: `${result.restoredCount} tiles item(s) restored back into invoice #${result.order_no}.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Restore Cancelled Tiles Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to restore tiles products." },
      { status: 500 }
    );
  }
}
