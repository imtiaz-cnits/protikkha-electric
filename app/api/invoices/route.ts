import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: All Invoices (Newest First, Rule 4.1)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const customerId = searchParams.get("customer_id");
    const status = searchParams.get("status"); // 'Paid', 'Due', 'Partial'
    const limitParam = searchParams.get("limit");
    const limit = limitParam && limitParam !== "all" && !isNaN(Number(limitParam)) ? Number(limitParam) : undefined;

    const where: any = {};
    if (customerId) where.customer_id = BigInt(customerId);

    const orders = await prisma.orders.findMany({
      where,
      ...(limit ? { take: limit } : {}),
      orderBy: { id: "desc" },
      include: {
        customers: {
          select: {
            id: true,
            customer_id: true,
            customer_name: true,
            mobile: true,
            address_details: true,
            previous_due_amount: true,
          },
        },
        order_details: {
          include: {
            products: {
              select: {
                id: true,
                product_code: true,
                product_name: true,
                tile_size: true,
                sqft_per_box: true,
                pcs_per_box: true,
                grade: true,
                surface_finish: true,
                units: true,
                categories: true,
              },
            },
          },
        },
        order_payment_details: true,
        challans: {
          select: {
            id: true,
            challan_no: true,
            challan_date: true,
            status: true,
          },
        },
        users: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    let formatted = orders.map((o) => {
      const subTotal = Number(o.sub_total || 0);
      const delivery = Number(o.delivery_charge || 0);
      const discount = Number(o.discount_amount || 0);
      const returnAdj = Number(o.return_adjustment_amount || 0);
      const netPayable = Math.max(0, subTotal + delivery - (discount + returnAdj));
      const paid = Number(o.paid_amount || 0);
      const due = Number(o.due_amount || 0);

      const paymentMethod =
        o.order_payment_details.length > 0
          ? o.order_payment_details[0].payment_method || "Cash"
          : "Cash";

      let paymentStatus = "Due";
      if (due <= 0) {
        paymentStatus = "Paid";
      } else if (paid > 0) {
        paymentStatus = "Partial Paid";
      }

      const totalItems = o.order_details.reduce(
        (sum, item) => sum + parseFloat(item.quantity || "0"),
        0
      );

      const hasPendingTiles = o.order_details.some(
        (d) => d.stock_lifecycle_state === "PENDING_CHALLAN"
      );

      const hasTiles =
        o.challan_status !== "NOT_REQUIRED" ||
        hasPendingTiles ||
        !!o.challans ||
        o.order_details.some(
          (d) =>
            d.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN" ||
            Boolean(d.products?.tile_size) ||
            Boolean(d.products?.sqft_per_box) ||
            (d.products?.product_name && d.products.product_name.toLowerCase().includes("tile")) ||
            (d.products?.categories?.category_name &&
              d.products.categories.category_name.toLowerCase().includes("tile"))
        );

      return {
        id: Number(o.id),
        order_no: o.order_no || `ORD-${o.id}`,
        invoice_date: o.invoice_date ? o.invoice_date.toISOString().split("T")[0] : null,
        created_at: o.created_at,
        customer_id: Number(o.customer_id),
        customer_name: o.customers?.customer_name || "Walk-in Customer",
        customer_mobile: o.customers?.mobile || "",
        customer_address: o.customers?.address_details || "",
        customer_prev_due: parseFloat(o.customers?.previous_due_amount || "0"),
        cashier: o.users?.name || "Admin",
        sub_total: subTotal,
        delivery_charge: delivery,
        discount_amount: discount,
        return_adjustment_amount: returnAdj,
        net_payable: netPayable,
        paid_amount: paid,
        due_amount: due,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        total_items: totalItems,
        order_note: o.order_note,
        challan_status: o.challan_status || "NOT_REQUIRED",
        has_pending_tiles: hasPendingTiles,
        has_tiles: hasTiles,
        has_challan: !!o.challans,
        challan_id: o.challans?.id ? Number(o.challans.id) : null,
        challan_no: o.challans?.challan_no || null,
        details: o.order_details.map((d) => {
          let code = "N/A";
          if (d.products?.product_code) {
            try {
              const parsed = Array.isArray(d.products.product_code)
                ? d.products.product_code
                : JSON.parse(String(d.products.product_code));
              code = parsed[0] || "N/A";
            } catch {
              code = String(d.products.product_code);
            }
          }
          const isTile = Boolean(
            d.products?.tile_size ||
            d.products?.sqft_per_box ||
            (d.products?.pcs_per_box && parseInt(d.products.pcs_per_box, 10) > 0) ||
            (d.products?.product_name && d.products.product_name.toLowerCase().includes("tile")) ||
            (d.products?.categories?.category_name && d.products.categories.category_name.toLowerCase().includes("tile")) ||
            d.stock_lifecycle_state === "PENDING_CHALLAN" ||
            d.stock_lifecycle_state === "DEDUCTED_AT_CHALLAN"
          );
          return {
            id: Number(d.id),
            product_id: Number(d.product_id),
            product_name: d.products?.product_name || "N/A",
            product_code: code,
            tile_size: d.products?.tile_size || null,
            sqft_per_box: d.products?.sqft_per_box ? parseFloat(d.products.sqft_per_box) : null,
            pcs_per_box: d.products?.pcs_per_box ? parseInt(d.products.pcs_per_box, 10) : null,
            grade: d.products?.grade || null,
            surface_finish: d.products?.surface_finish || null,
            is_tiles: isTile,
            quantity: parseFloat(d.quantity || "0"),
            price: parseFloat(d.price || "0"),
            selling_price: parseFloat(d.selling_price || "0"),
            unit: d.products?.units?.unit_name || "Pcs",
            stock_lifecycle_state: d.stock_lifecycle_state || "DEDUCTED_AT_INVOICE",
            line_total: Math.round(parseFloat(d.selling_price || "0") * parseFloat(d.quantity || "0") * 100) / 100,
          };
        }),
        payments: o.order_payment_details.map((p) => ({
          id: Number(p.id),
          paid_amount: Number(p.paid_amount || 0),
          payment_method: p.payment_method || "Cash",
          payment_status: p.payment_status || "Paid",
          transaction_id: p.transaction_id,
          date: p.due_collection_date,
        })),
      };
    });

    if (status) {
      formatted = formatted.filter((o) =>
        o.payment_status.toLowerCase().includes(status.toLowerCase())
      );
    }

    if (search) {
      formatted = formatted.filter(
        (o) =>
          o.order_no.toLowerCase().includes(search) ||
          o.customer_name.toLowerCase().includes(search) ||
          o.customer_mobile.includes(search)
      );
    }

    return NextResponse.json({
      status: "success",
      data: formatted,
    });
  } catch (error: any) {
    console.error("Invoices GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load invoices" },
      { status: 500 }
    );
  }
}
