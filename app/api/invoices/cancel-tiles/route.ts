import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const { order_id, order_detail_ids, items, reason } = body;

    if (!order_id) {
      return NextResponse.json(
        { status: "fail", message: "Invoice / Order ID is required." },
        { status: 400 }
      );
    }

    const orderIdBig = BigInt(order_id);

    // Build map of item cancel box & pcs configurations
    const itemCancelMap = new Map<
      string,
      { cancel_boxes?: number; cancel_pcs?: number }
    >();

    const targetDetailIds: string[] = [];

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        if (it && it.order_detail_id) {
          const sId = String(it.order_detail_id);
          targetDetailIds.push(sId);
          itemCancelMap.set(sId, {
            cancel_boxes:
              typeof it.cancel_boxes === "number"
                ? Math.max(0, it.cancel_boxes)
                : undefined,
            cancel_pcs:
              typeof it.cancel_pcs === "number"
                ? Math.max(0, it.cancel_pcs)
                : undefined,
          });
        }
      }
    } else if (Array.isArray(order_detail_ids) && order_detail_ids.length > 0) {
      for (const id of order_detail_ids) {
        const sId = String(id);
        targetDetailIds.push(sId);
        itemCancelMap.set(sId, {});
      }
    }

    if (targetDetailIds.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Please select at least one tiles product to cancel." },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch order with details, products, challans, customers
      const order = await tx.orders.findUnique({
        where: { id: orderIdBig },
        include: {
          order_details: {
            include: {
              products: {
                include: {
                  categories: true,
                  units: true,
                },
              },
            },
          },
          customers: true,
          challans: {
            include: {
              challan_items: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("Invoice record not found.");
      }

      // Filter detail records to cancel
      const cancelIdSet = new Set(targetDetailIds);
      const itemsToCancel = order.order_details.filter((d) =>
        cancelIdSet.has(d.id.toString())
      );

      if (itemsToCancel.length === 0) {
        throw new Error("No matching items found in this invoice to cancel.");
      }

      // Verify each item is a tiles product
      for (const item of itemsToCancel) {
        const prod = item.products;
        const isTiles = Boolean(
          prod?.tile_size ||
            prod?.sqft_per_box ||
            (prod?.pcs_per_box && parseInt(prod.pcs_per_box, 10) > 0) ||
            (prod?.product_name && prod.product_name.toLowerCase().includes("tile")) ||
            (prod?.categories?.category_name &&
              prod.categories.category_name.toLowerCase().includes("tile")) ||
            item.stock_lifecycle_state === "PENDING_CHALLAN" ||
            item.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN"
        );

        if (!isTiles) {
          throw new Error(
            `Item "${prod?.product_name || "Product"}" is not a tiles product and cannot be cancelled through tiles cancellation.`
          );
        }
      }

      let totalCancelledAmount = 0;
      let totalCancelledDecimalBoxes = 0;
      const itemsDataToStore: any[] = [];

      // Process each cancelled item with exact Box & Pcs math
      for (const item of itemsToCancel) {
        let pcsPerBox = item.products?.pcs_per_box
          ? parseInt(item.products.pcs_per_box, 10)
          : 1;
        if (!pcsPerBox || pcsPerBox <= 0) pcsPerBox = 1;

        const originalQty = parseFloat(String(item.quantity || "0"));
        const totalOriginalPcs = Math.round(originalQty * pcsPerBox);

        const customSpec = itemCancelMap.get(String(item.id));
        let cancelBoxes: number;
        let cancelPcs: number;

        if (
          customSpec &&
          (customSpec.cancel_boxes !== undefined ||
            customSpec.cancel_pcs !== undefined)
        ) {
          cancelBoxes = customSpec.cancel_boxes ?? 0;
          cancelPcs = customSpec.cancel_pcs ?? 0;
        } else {
          cancelBoxes = Math.floor(totalOriginalPcs / pcsPerBox);
          cancelPcs = totalOriginalPcs % pcsPerBox;
        }

        let cancelPcsTotal = cancelBoxes * pcsPerBox + cancelPcs;
        if (cancelPcsTotal <= 0) {
          cancelPcsTotal = totalOriginalPcs;
        }
        cancelPcsTotal = Math.min(cancelPcsTotal, totalOriginalPcs);

        const finalCancelBoxes = Math.floor(cancelPcsTotal / pcsPerBox);
        const finalCancelPcs = cancelPcsTotal % pcsPerBox;
        const cancelDecimalBoxes = cancelPcsTotal / pcsPerBox;

        const sellingPrice = parseFloat(String(item.selling_price || "0"));
        const price = parseFloat(String(item.price || "0"));
        const unitPricePerPc = sellingPrice / pcsPerBox;
        const itemCancelledAmount =
          Math.round(
            (finalCancelBoxes * sellingPrice + finalCancelPcs * unitPricePerPc) *
              100
          ) / 100;

        totalCancelledAmount += itemCancelledAmount;
        totalCancelledDecimalBoxes += cancelDecimalBoxes;

        let productCode = "N/A";
        if (item.products?.product_code) {
          try {
            const parsed = Array.isArray(item.products.product_code)
              ? item.products.product_code
              : JSON.parse(String(item.products.product_code));
            productCode = parsed[0] || "N/A";
          } catch {
            productCode = String(item.products.product_code);
          }
        }

        // Return stock if it was already deducted at challan
        let wasStockReturned = false;
        if (item.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN") {
          const [currentProd]: any = await tx.$queryRawUnsafe(
            "SELECT quantity FROM products WHERE id = ?",
            BigInt(item.product_id)
          );
          const currentStock = parseFloat(currentProd?.quantity || "0");
          const returnedStock = currentStock + cancelDecimalBoxes;

          await tx.products.update({
            where: { id: BigInt(item.product_id) },
            data: { quantity: String(returnedStock) },
          });
          wasStockReturned = true;

          // If a challan exists, also reduce/remove from challan_items
          if (order.challans) {
            const chlItem = order.challans.challan_items?.find(
              (ci) => Number(ci.order_detail_id) === Number(item.id)
            );
            if (chlItem) {
              const currentChallanQty = Number(chlItem.quantity || 0);
              const remainingChallanQty = Math.max(
                0,
                currentChallanQty - cancelDecimalBoxes
              );
              if (remainingChallanQty <= 0.0001) {
                await tx.challan_items.delete({ where: { id: chlItem.id } });
              } else {
                await tx.challan_items.update({
                  where: { id: chlItem.id },
                  data: { quantity: remainingChallanQty },
                });
              }
            }
          }
        }

        // Mutate order_details: if fully cancelled, delete; if partial, reduce quantity
        const remainingPcs = totalOriginalPcs - cancelPcsTotal;
        const remainingDecimalBoxes = remainingPcs / pcsPerBox;

        if (remainingPcs <= 0 || remainingDecimalBoxes <= 0.0001) {
          await tx.order_details.delete({
            where: { id: item.id },
          });
        } else {
          await tx.order_details.update({
            where: { id: item.id },
            data: { quantity: String(remainingDecimalBoxes) },
          });
        }

        itemsDataToStore.push({
          order_detail_id: Number(item.id),
          product_id: Number(item.product_id),
          product_name: item.products?.product_name || "N/A",
          product_code: productCode,
          tile_size: item.products?.tile_size || null,
          sqft_per_box: item.products?.sqft_per_box
            ? parseFloat(item.products.sqft_per_box)
            : null,
          pcs_per_box: pcsPerBox,
          grade: item.products?.grade || null,
          unit: item.products?.units?.unit_name || "Box",
          category: item.products?.categories?.category_name || "Tiles",
          quantity: cancelDecimalBoxes,
          cancelled_boxes: finalCancelBoxes,
          cancelled_pcs: finalCancelPcs,
          price: price,
          selling_price: sellingPrice,
          line_total: itemCancelledAmount,
          stock_lifecycle_state: item.stock_lifecycle_state || "PENDING_CHALLAN",
          was_stock_returned: wasStockReturned,
        });
      }

      totalCancelledAmount = Math.round(totalCancelledAmount * 100) / 100;

      // Clean up empty challan if all challan items were deleted
      if (order.challans) {
        const remainingChallanItems = await tx.challan_items.count({
          where: { challan_id: order.challans.id },
        });
        if (remainingChallanItems === 0) {
          await tx.challans.delete({
            where: { id: order.challans.id },
          });
        }
      }

      // Record in cancelled_tiles table
      await tx.$executeRawUnsafe(
        `INSERT INTO cancelled_tiles (order_id, order_no, customer_id, customer_name, customer_mobile, items_data, total_amount, total_items, reason, cancelled_by, cancelled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        Number(order.id),
        order.order_no || `ORD-${order.id}`,
        order.customer_id ? Number(order.customer_id) : null,
        order.customers?.customer_name || "Walk-in Customer",
        order.customers?.mobile || "",
        JSON.stringify(itemsDataToStore),
        totalCancelledAmount,
        totalCancelledDecimalBoxes,
        reason || null,
        userId
      );

      // Check remaining details in the order
      const remainingDetails = await tx.order_details.findMany({
        where: { order_id: orderIdBig },
        include: {
          products: {
            include: { categories: true },
          },
        },
      });

      const remainingHasTiles = remainingDetails.some((d) => {
        const p = d.products;
        return Boolean(
          p?.tile_size ||
            p?.sqft_per_box ||
            (p?.pcs_per_box && parseInt(p.pcs_per_box, 10) > 0) ||
            (p?.product_name && p.product_name.toLowerCase().includes("tile")) ||
            (p?.categories?.category_name &&
              p.categories.category_name.toLowerCase().includes("tile")) ||
            d.stock_lifecycle_state === "PENDING_CHALLAN" ||
            d.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN"
        );
      });

      // Calculate new financial totals on the order
      const curSubTotal = Number(order.sub_total || 0);
      const newSubTotal = Math.max(
        0,
        Math.round((curSubTotal - totalCancelledAmount) * 100) / 100
      );
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
      const dueReduction = Math.max(
        0,
        Math.round((curDue - newDue) * 100) / 100
      );

      // Determine updated challan status
      let newChallanStatus = order.challan_status || "NOT_REQUIRED";
      if (remainingDetails.length === 0) {
        newChallanStatus = "CANCELLED";
      } else if (!remainingHasTiles) {
        newChallanStatus = "NOT_REQUIRED";
      }

      await tx.orders.update({
        where: { id: orderIdBig },
        data: {
          sub_total: newSubTotal,
          due_amount: newDue,
          challan_status: newChallanStatus,
        },
      });

      // Reduce customer's previous_due_amount debt by the due reduction amount
      if (order.customer_id && dueReduction > 0) {
        const customer = await tx.customers.findUnique({
          where: { id: order.customer_id },
        });

        if (customer) {
          const curCustDue = parseFloat(customer.previous_due_amount || "0");
          const newCustDue = Math.max(
            0,
            Math.round((curCustDue - dueReduction) * 100) / 100
          );
          await tx.customers.update({
            where: { id: order.customer_id },
            data: {
              previous_due_amount: String(newCustDue),
            },
          });
        }
      }

      return {
        cancelledAmount: totalCancelledAmount,
        newSubTotal,
        newDue,
        dueReduction,
        cancelledCount: itemsToCancel.length,
        remainingCount: remainingDetails.length,
      };
    });

    return NextResponse.json({
      status: "success",
      message: `${result.cancelledCount} tiles item(s) cancelled successfully. Invoice amount and customer balance updated.`,
      data: result,
    });
  } catch (error: any) {
    console.error("Cancel Tiles Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to cancel tiles products." },
      { status: 500 }
    );
  }
}
