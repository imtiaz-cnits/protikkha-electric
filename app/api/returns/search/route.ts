import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/returns/search?type=sales|purchase&query=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "sales";
    const rawQuery = (
      searchParams.get("query") ||
      searchParams.get("order_no") ||
      searchParams.get("purchase_no") ||
      ""
    ).trim();

    if (!rawQuery) {
      return NextResponse.json(
        {
          status: "fail",
          message:
            type === "purchase"
              ? "Purchase memo number is required"
              : "Invoice number is required",
        },
        { status: 400 }
      );
    }

    const cleanQuery = rawQuery.replace(/^#/, "").trim();

    if (type === "purchase") {
      // Search Purchase by ID, reference no, or supplier name
      let purchase: any = null;

      const numId = parseInt(cleanQuery.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(numId) && numId > 0) {
        purchase = await prisma.purchases.findFirst({
          where: {
            OR: [
              { id: BigInt(numId) },
              { purchase_id: { contains: cleanQuery } },
              { referance_no: { contains: cleanQuery } },
            ],
          },
          include: {
            suppliers: true,
            purchase_order_details: {
              include: {
                products: {
                  include: {
                    electrical_specifications: true,
                    packaging_conversions: true,
                    units: true,
                  },
                },
              },
            },
          },
        });
      }

      if (!purchase) {
        purchase = await prisma.purchases.findFirst({
          where: {
            OR: [
              { purchase_id: { contains: cleanQuery } },
              { referance_no: { contains: cleanQuery } },
              {
                suppliers: {
                  OR: [
                    { name: { contains: cleanQuery } },
                    { company: { contains: cleanQuery } },
                  ],
                },
              },
            ],
          },
          orderBy: { id: "desc" },
          include: {
            suppliers: true,
            purchase_order_details: {
              include: {
                products: {
                  include: {
                    electrical_specifications: true,
                    packaging_conversions: true,
                    units: true,
                  },
                },
              },
            },
          },
        });
      }

      if (!purchase) {
        return NextResponse.json(
          { status: "fail", message: `No purchase record found matching '${rawQuery}'` },
          { status: 404 }
        );
      }

      // Existing purchase returns to compute remaining returnable quantity
      const existingReturns = await prisma.purchase_returns.findMany({
        where: { purchase_id: purchase.id },
      });

      const returnedQtyByProduct = new Map<string, number>();
      for (const ret of existingReturns) {
        const pKey = ret.product_id.toString();
        returnedQtyByProduct.set(pKey, (returnedQtyByProduct.get(pKey) || 0) + (ret.quantity || 0));
      }

      const items = purchase.purchase_order_details.map((detail: any) => {
        const prod = detail.products;
        const pIdStr = detail.product_id.toString();
        const purchasedQty = parseFloat(String(detail.quantity || 0));
        const alreadyReturnedQty = returnedQtyByProduct.get(pIdStr) || 0;
        const remainingQty = Math.max(0, purchasedQty - alreadyReturnedQty);

        let code = "N/A";
        if (prod?.product_code) {
          try {
            const parsed = Array.isArray(prod.product_code)
              ? prod.product_code
              : JSON.parse(String(prod.product_code));
            code = parsed[0] || "N/A";
          } catch {
            code = String(prod.product_code);
          }
        }

        const costPrice = parseFloat(String(detail.cost_price || 0));
        const spec = prod?.electrical_specifications;
        const specLabel = spec
          ? `${spec.spec_type}${spec.cable_size ? ` - ${spec.cable_size}` : ""}${spec.current_rating ? ` - ${spec.current_rating}` : ""}`
          : "General";

        return {
          detail_id: Number(detail.id),
          product_id: Number(detail.product_id),
          product_name: prod?.product_name || "Electrical Product",
          product_code: code,
          spec_type: spec?.spec_type || "GENERAL",
          spec_label: specLabel,
          unit: prod?.units?.unit_name || "Unit",
          purchased_quantity: purchasedQty,
          already_returned_quantity: alreadyReturnedQty,
          returnable_quantity: remainingQty,
          unit_price: costPrice,
          total_price: Math.round(purchasedQty * costPrice * 100) / 100,
        };
      });

      return NextResponse.json({
        status: "success",
        data: {
          id: Number(purchase.id),
          purchase_no: purchase.purchase_id
            ? `#${purchase.purchase_id}`
            : `#PurID${String(purchase.id).padStart(5, "0")}`,
          supplier_id: Number(purchase.supplier_id),
          supplier_name: purchase.suppliers?.name || purchase.suppliers?.company || "Supplier",
          supplier_mobile: purchase.suppliers?.mobile || "N/A",
          purchase_date: purchase.date
            ? new Date(purchase.date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          grand_subtotal: parseFloat(String(purchase.grand_subtotal || 0)),
          paid_amount: parseFloat(String(purchase.paid_amount || 0)),
          due_amount: parseFloat(String(purchase.due_amount || 0)),
          items,
        },
      });
    } else {
      // Search Sales Invoice
      let order: any = null;

      order = await prisma.orders.findFirst({
        where: {
          OR: [
            { order_no: rawQuery },
            { order_no: `#${cleanQuery}` },
            { order_no: cleanQuery },
            { order_no: { contains: cleanQuery } },
          ],
        },
        include: {
          customers: true,
          order_details: {
            include: {
              products: {
                include: {
                  electrical_specifications: true,
                  packaging_conversions: true,
                  units: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        const numId = parseInt(cleanQuery.replace(/[^0-9]/g, ""), 10);
        if (!isNaN(numId) && numId > 0) {
          order = await prisma.orders.findUnique({
            where: { id: BigInt(numId) },
            include: {
              customers: true,
              order_details: {
                include: {
                  products: {
                    include: {
                      electrical_specifications: true,
                      packaging_conversions: true,
                      units: true,
                    },
                  },
                },
              },
            },
          });
        }
      }

      if (!order) {
        return NextResponse.json(
          { status: "fail", message: `No invoice found matching '${rawQuery}'` },
          { status: 404 }
        );
      }

      const existingReturns = await prisma.product_returns.findMany({
        where: { order_id: order.id },
      });

      const returnedQtyByProduct = new Map<string, number>();
      const returnedAmountByProduct = new Map<string, number>();
      for (const ret of existingReturns) {
        if (ret.product_id) {
          const pKey = ret.product_id.toString();
          returnedQtyByProduct.set(
            pKey,
            (returnedQtyByProduct.get(pKey) || 0) + (ret.quantity || 0)
          );
          returnedAmountByProduct.set(
            pKey,
            (returnedAmountByProduct.get(pKey) || 0) + parseFloat(String(ret.amount || 0))
          );
        }
      }

      const items = order.order_details.map((detail: any) => {
        const prod = detail.products;
        const pIdStr = detail.product_id.toString();
        const purchasedQty = parseFloat(String(detail.quantity || 0));

        let code = "N/A";
        if (prod?.product_code) {
          try {
            const parsed = Array.isArray(prod.product_code)
              ? prod.product_code
              : JSON.parse(String(prod.product_code));
            code = parsed[0] || "N/A";
          } catch {
            code = String(prod.product_code);
          }
        }

        const sellingPrice = parseFloat(String(detail.selling_price || 0));
        const alreadyReturnedQty = returnedQtyByProduct.get(pIdStr) || 0;
        const returnableQty = Math.max(0, purchasedQty - alreadyReturnedQty);

        const totalSellingPrice = Math.round(purchasedQty * sellingPrice * 100) / 100;
        const alreadyReturnedAmt = returnedAmountByProduct.get(pIdStr) || 0;
        const remainingLineTotal = Math.max(
          0,
          Math.round((totalSellingPrice - alreadyReturnedAmt) * 100) / 100
        );

        const spec = prod?.electrical_specifications;
        const specLabel = spec
          ? `${spec.spec_type}${spec.cable_size ? ` - ${spec.cable_size}` : ""}${spec.current_rating ? ` - ${spec.current_rating}` : ""}${spec.gang_module ? ` - ${spec.gang_module}` : ""}${spec.wattage ? ` - ${spec.wattage}` : ""}`
          : "Electrical Item";

        return {
          detail_id: Number(detail.id),
          product_id: Number(detail.product_id),
          product_name: prod?.product_name || "Electrical Product",
          product_code: code,
          spec_type: spec?.spec_type || "GENERAL",
          spec_label: specLabel,
          unit: prod?.units?.unit_name || "Piece",
          purchased_quantity: purchasedQty,
          already_returned_quantity: alreadyReturnedQty,
          returnable_quantity: returnableQty,
          unit_price: sellingPrice,
          total_line_amount: totalSellingPrice,
          remaining_line_total: remainingLineTotal,
        };
      });

      return NextResponse.json({
        status: "success",
        data: {
          id: Number(order.id),
          order_no: order.order_no ? `#${order.order_no.replace(/^#/, "")}` : `#ORD-${order.id}`,
          customer_id: Number(order.customer_id),
          customer_name: order.customers?.customer_name || "Walk-in Customer",
          customer_mobile: order.customers?.mobile || "N/A",
          invoice_date: order.invoice_date
            ? new Date(order.invoice_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "N/A",
          sub_total: parseFloat(String(order.sub_total || 0)),
          discount_amount: parseFloat(String(order.discount_amount || 0)),
          delivery_charge: parseFloat(String(order.delivery_charge || 0)),
          paid_amount: parseFloat(String(order.paid_amount || 0)),
          due_amount: parseFloat(String(order.due_amount || 0)),
          items,
        },
      });
    }
  } catch (error: any) {
    console.error("Return Search API Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Search failed" },
      { status: 500 }
    );
  }
}
