import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import {
  getBangladeshDate,
  generateChallanNumber,
  lockProductsAscending,
} from "@/lib/challan-service";

export const dynamic = "force-dynamic";

// GET: List and filter saved Challans
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const date = searchParams.get("date");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (date) {
      where.challan_date = new Date(date);
    }

    if (search) {
      where.OR = [
        { challan_no: { contains: search } },
        { orders: { order_no: { contains: search } } },
        { customers: { customer_name: { contains: search } } },
        { customers: { mobile: { contains: search } } },
        { driver_name: { contains: search } },
        { vehicle_no: { contains: search } },
      ];
    }

    const [total, challans] = await Promise.all([
      prisma.challans.count({ where }),
      prisma.challans.findMany({
        where,
        orderBy: { id: "desc" },
        skip,
        take: limit,
        include: {
          orders: {
            select: {
              id: true,
              order_no: true,
              sub_total: true,
              invoice_date: true,
            },
          },
          customers: {
            select: {
              id: true,
              customer_name: true,
              customer_id: true,
              mobile: true,
              address_details: true,
            },
          },
          users: {
            select: {
              id: true,
              name: true,
            },
          },
          challan_items: {
            include: {
              products: {
                select: {
                  tile_size: true,
                  sqft_per_box: true,
                  pcs_per_box: true,
                  grade: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const formatted = challans.map((c) => ({
      id: Number(c.id),
      challan_no: c.challan_no,
      order_id: Number(c.order_id),
      order_no: c.orders?.order_no || `ORD-${c.order_id}`,
      invoice_date: c.orders?.invoice_date || null,
      challan_date: c.challan_date,
      customer_id: Number(c.customer_id),
      customer_name: c.customers?.customer_name || "N/A",
      customer_mobile: c.customers?.mobile || "",
      customer_address: c.customers?.address_details || "",
      delivery_address: c.delivery_address || c.customers?.address_details || "",
      driver_name: c.driver_name || "",
      driver_phone: c.driver_phone || "",
      vehicle_no: c.vehicle_no || "",
      status: c.status,
      note: c.note,
      created_by: c.users?.name || "System",
      created_at: c.created_at,
      total_items: c.challan_items.length,
      total_quantity: c.challan_items.reduce((acc, it) => acc + Number(it.quantity || 0), 0),
      items: c.challan_items.map((it) => ({
        id: Number(it.id),
        order_detail_id: it.order_detail_id ? Number(it.order_detail_id) : null,
        product_id: Number(it.product_id),
        product_name: it.product_name,
        product_code: it.product_code || "",
        quantity: Number(it.quantity),
        unit: it.unit || "Box",
        tile_size: it.products?.tile_size || null,
        sqft_per_box: it.products?.sqft_per_box ? Number(it.products.sqft_per_box) : null,
        pcs_per_box: it.products?.pcs_per_box || null,
        grade: it.products?.grade || null,
      })),
    }));

    return NextResponse.json({
      status: "success",
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      data: formatted,
    });
  } catch (error: any) {
    console.error("Challans GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load challans" },
      { status: 500 }
    );
  }
}

// POST: Atomically Generate Delivery Challan for Tiles lines & Deduct Stock
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 7);

    const body = await req.json();
    const {
      order_id,
      challan_date,
      delivery_address,
      driver_name,
      driver_phone,
      vehicle_no,
      note,
    } = body;

    if (!order_id) {
      return NextResponse.json(
        { status: "fail", message: "Order ID is required to generate a Challan!" },
        { status: 400 }
      );
    }

    const orderIdBigInt = BigInt(order_id);
    const bstDate = challan_date ? new Date(challan_date) : getBangladeshDate();

    // Atomic transaction: Row locking, validation, Challan creation & physical stock deduction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lock the order row to prevent concurrent duplicate Challan generations
      const [order]: any = await tx.$queryRawUnsafe(
        "SELECT id, order_no, customer_id, challan_status FROM orders WHERE id = ? FOR UPDATE",
        orderIdBigInt
      );

      if (!order) {
        throw new Error(`Order #${order_id} does not exist!`);
      }

      // Check if Challan already exists or order already delivered
      const existingChallan = await tx.challans.findFirst({
        where: { order_id: orderIdBigInt },
        select: { id: true, challan_no: true },
      });

      if (existingChallan || order.challan_status === "DELIVERED") {
        const chlNo = existingChallan?.challan_no || "Already Issued";
        const err: any = new Error(
          `Delivery Challan (${chlNo}) has already been generated for this invoice!`
        );
        err.statusCode = 409;
        throw err;
      }

      // 2. Fetch order lines with stock_lifecycle_state = 'PENDING_CHALLAN'
      const pendingLines = await tx.order_details.findMany({
        where: {
          order_id: orderIdBigInt,
          stock_lifecycle_state: "PENDING_CHALLAN",
        },
        include: {
          products: {
            include: {
              units: true,
            },
          },
        },
      });

      if (pendingLines.length === 0) {
        const err: any = new Error(
          "This invoice has no pending Tiles items awaiting delivery Challan!"
        );
        err.statusCode = 400;
        throw err;
      }

      // 3. Lock all affected product rows in ascending ID order
      const productIds = pendingLines.map((line: any) => Number(line.product_id));
      await lockProductsAscending(productIds, tx);

      // 4. Pre-validate physical warehouse stock for each line
      const customItems = Array.isArray(body.items) ? body.items : null;
      for (const line of pendingLines) {
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT id, product_name, quantity FROM products WHERE id = ?",
          BigInt(line.product_id)
        );

        const physicalStock = parseFloat(currentProd?.quantity || "0");
        const lineCustom = customItems?.find(
          (ci: any) => Number(ci.order_detail_id) === Number(line.id)
        );
        const requiredQty =
          lineCustom && !isNaN(Number(lineCustom.quantity)) && Number(lineCustom.quantity) > 0
            ? Number(lineCustom.quantity)
            : parseFloat(String(line.quantity || "0"));

        if (physicalStock < requiredQty) {
          const prodName = currentProd?.product_name || `Product #${line.product_id}`;
          const err: any = new Error(
            `Insufficient physical warehouse stock to dispatch "${prodName}". Current In-Stock: ${physicalStock}, Required for Delivery: ${requiredQty}`
          );
          err.statusCode = 400;
          throw err;
        }
      }

      // 5. Generate unique Challan number and create challans record
      const challanNumber = generateChallanNumber();

      const newChallan = await tx.challans.create({
        data: {
          challan_no: challanNumber,
          order_id: orderIdBigInt,
          customer_id: BigInt(order.customer_id),
          challan_date: bstDate,
          delivery_address: delivery_address ? String(delivery_address).trim() : null,
          driver_name: driver_name ? String(driver_name).trim() : null,
          driver_phone: driver_phone ? String(driver_phone).trim() : null,
          vehicle_no: vehicle_no ? String(vehicle_no).trim() : null,
          status: "DELIVERED",
          note: note ? String(note).trim() : null,
          user_id: BigInt(userId),
        },
      });

      // 6. Snapshot items into challan_items, decrement physical stock, and update lifecycle state
      for (const line of pendingLines) {
        const prod = line.products;
        const lineCustom = customItems?.find(
          (ci: any) => Number(ci.order_detail_id) === Number(line.id)
        );
        const requiredQty =
          lineCustom && !isNaN(Number(lineCustom.quantity)) && Number(lineCustom.quantity) > 0
            ? Number(lineCustom.quantity)
            : parseFloat(String(line.quantity || "0"));

        let primaryCode = "";
        if (prod.product_code) {
          try {
            const parsed = Array.isArray(prod.product_code)
              ? prod.product_code
              : JSON.parse(String(prod.product_code));
            primaryCode = Array.isArray(parsed) ? parsed[0] || "" : String(parsed);
          } catch {
            primaryCode = String(prod.product_code);
          }
        }

        // Create snapshot item
        await tx.challan_items.create({
          data: {
            challan_id: newChallan.id,
            order_detail_id: line.id,
            product_id: line.product_id,
            product_name: prod.product_name,
            product_code: primaryCode || null,
            quantity: requiredQty,
            unit: prod.units?.unit_name || "Box",
          },
        });

        // Deduct physical stock from products exactly once
        const [currentProd]: any = await tx.$queryRawUnsafe(
          "SELECT quantity FROM products WHERE id = ?",
          BigInt(line.product_id)
        );
        const currentQty = parseFloat(currentProd?.quantity || "0");
        const newStock = Math.max(0, currentQty - requiredQty);

        await tx.products.update({
          where: { id: BigInt(line.product_id) },
          data: { quantity: String(newStock) },
        });

        // Mark line as DEDUCTED_AT_CHALLAN
        await tx.order_details.update({
          where: { id: line.id },
          data: { stock_lifecycle_state: "DEDUCTED_AT_CHALLAN" },
        });
      }

      // 7. Update parent invoice challan_status to DELIVERED
      await tx.orders.update({
        where: { id: orderIdBigInt },
        data: { challan_status: "DELIVERED" },
      });

      return newChallan;
    });

    return NextResponse.json({
      status: "success",
      message: "Delivery Challan generated successfully and stock deducted",
      challan_id: Number(result.id),
      challan_no: result.challan_no,
    });
  } catch (error: any) {
    console.error("Challan Generation Error:", error);
    const statusCode = error?.statusCode || 500;
    return NextResponse.json(
      { status: "fail", message: error?.message || "Challan generation failed" },
      { status: statusCode }
    );
  }
}
