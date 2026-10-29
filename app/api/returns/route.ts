import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET: All Returns (Sales Return or Purchase Return)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "sales";
    const search = searchParams.get("search")?.trim().toLowerCase();

    if (type === "purchase") {
      // Purchase Returns
      const returns = await prisma.purchase_returns.findMany({
        orderBy: { id: "desc" },
        include: {
          suppliers: {
            select: {
              id: true,
              name: true,
              company: true,
              mobile: true,
            },
          },
          purchases: {
            select: {
              id: true,
              purchase_id: true,
              referance_no: true,
            },
          },
          products: {
            select: {
              id: true,
              product_name: true,
              product_code: true,
              unit_id: true,
              electrical_specifications: true,
            },
          },
        },
      });

      let formatted = returns.map((r) => {
        let code = "N/A";
        if (r.products?.product_code) {
          try {
            const parsed = Array.isArray(r.products.product_code)
              ? r.products.product_code
              : JSON.parse(String(r.products.product_code));
            code = parsed[0] || "N/A";
          } catch {
            code = String(r.products.product_code);
          }
        }

        const pNo = r.purchases?.purchase_id
          ? (String(r.purchases.purchase_id).startsWith("#")
              ? r.purchases.purchase_id
              : `#${r.purchases.purchase_id}`)
          : `#PurID${String(r.purchase_id).padStart(5, "0")}`;

        const spec = r.products?.electrical_specifications;

        return {
          id: Number(r.id),
          type: "purchase",
          record_no: pNo,
          purchase_id: Number(r.purchase_id),
          supplier_id: r.supplier_id ? Number(r.supplier_id) : (r.suppliers?.id ? Number(r.suppliers.id) : null),
          party_name: r.suppliers?.name || r.suppliers?.company || "Supplier",
          party_mobile: r.suppliers?.mobile || "",
          product_id: Number(r.product_id),
          product_name: r.products?.product_name || "Product",
          product_code: code,
          spec_type: spec?.spec_type || "GENERAL",
          spec_label: spec?.cable_size || spec?.current_rating || "Electrical Item",
          quantity: r.quantity || 1,
          amount: parseFloat(String(r.amount || 0)),
          discount_amount: parseFloat(String(r.discount_amount || 0)),
          due_amount: parseFloat(String(r.due_amount || 0)),
          date: r.date ? new Date(r.date).toISOString().split("T")[0] : "",
          created_at: r.created_at || null,
        };
      });

      if (search) {
        formatted = formatted.filter(
          (r) =>
            r.record_no.toLowerCase().includes(search) ||
            r.party_name.toLowerCase().includes(search) ||
            r.party_mobile.includes(search) ||
            r.product_name.toLowerCase().includes(search) ||
            r.product_code.toLowerCase().includes(search)
        );
      }

      const totalReturnAmount = formatted.reduce((sum, r) => sum + r.amount, 0);
      const totalQtyReturned = formatted.reduce((sum, r) => sum + r.quantity, 0);

      return NextResponse.json({
        status: "success",
        type: "purchase",
        summary: {
          total_records: formatted.length,
          total_amount: totalReturnAmount,
          total_quantity: totalQtyReturned,
        },
        data: formatted,
      });
    } else {
      // Sales Returns
      const returns = await prisma.product_returns.findMany({
        orderBy: { id: "desc" },
        include: {
          customers: {
            select: {
              id: true,
              customer_name: true,
              mobile: true,
            },
          },
          orders: {
            select: {
              id: true,
              order_no: true,
            },
          },
        },
      });

      const productIds = Array.from(
        new Set(returns.map((r) => r.product_id).filter((id): id is bigint => id !== null))
      );
      const productsMap = new Map<string, any>();
      if (productIds.length > 0) {
        const prods = await prisma.products.findMany({
          where: { id: { in: productIds } },
          include: {
            units: true,
            electrical_specifications: true,
          },
        });
        for (const p of prods) {
          productsMap.set(p.id.toString(), p);
        }
      }

      let formatted = returns.map((r) => {
        const prod = r.product_id ? productsMap.get(r.product_id.toString()) : null;
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

        const oNo = r.orders?.order_no
          ? (String(r.orders.order_no).startsWith("#")
              ? r.orders.order_no
              : `#${r.orders.order_no}`)
          : `#ORD-${r.order_id}`;

        const spec = prod?.electrical_specifications;

        return {
          id: Number(r.id),
          type: "sales",
          record_no: oNo,
          order_id: Number(r.order_id),
          customer_id: r.customer_id ? Number(r.customer_id) : (r.customers?.id ? Number(r.customers.id) : null),
          party_name: r.customers?.customer_name || "Customer",
          party_mobile: r.customers?.mobile || "",
          product_id: r.product_id ? Number(r.product_id) : null,
          product_name: prod?.product_name || "Returned Product",
          product_code: code,
          spec_type: spec?.spec_type || "GENERAL",
          spec_label: spec?.cable_size || spec?.current_rating || "Electrical Goods",
          unit: prod?.units?.unit_name || "Piece",
          quantity: r.quantity || 1,
          amount: parseFloat(String(r.amount || 0)),
          discount_amount: parseFloat(String(r.discount_amount || 0)),
          due_amount: parseFloat(String(r.due_amount || 0)),
          date: r.date,
          created_at: r.created_at,
        };
      });

      if (search) {
        formatted = formatted.filter(
          (r) =>
            r.record_no.toLowerCase().includes(search) ||
            r.party_name.toLowerCase().includes(search) ||
            r.party_mobile.includes(search) ||
            r.product_name.toLowerCase().includes(search) ||
            r.product_code.toLowerCase().includes(search)
        );
      }

      const totalReturnAmount = formatted.reduce((sum, r) => sum + r.amount, 0);
      const totalQtyReturned = formatted.reduce((sum, r) => sum + r.quantity, 0);

      return NextResponse.json({
        status: "success",
        type: "sales",
        summary: {
          total_records: formatted.length,
          total_amount: totalReturnAmount,
          total_quantity: totalQtyReturned,
        },
        data: formatted,
      });
    }
  } catch (error: any) {
    console.error("Returns GET Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to load returns" },
      { status: 500 }
    );
  }
}

// POST: Record New Return (Sales Return or Purchase Return)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const fallbackUser = await prisma.users.findFirst({ select: { id: true } });
    const userId = user?.id || (fallbackUser ? Number(fallbackUser.id) : 1);

    const body = await req.json();
    const { type = "sales", date, products } = body;

    const returnDate = date || new Date().toISOString().split("T")[0];

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { status: "fail", message: "Please select at least one product with return quantity > 0." },
        { status: 400 }
      );
    }

    if (type === "purchase") {
      // Process Purchase Return
      const { purchase_id, supplier_id } = body;
      if (!purchase_id) {
        return NextResponse.json(
          { status: "fail", message: "Purchase record is required!" },
          { status: 400 }
        );
      }

      const purchase = await prisma.purchases.findUnique({
        where: { id: BigInt(purchase_id) },
        include: { purchase_order_details: true, suppliers: true },
      });

      if (!purchase) {
        return NextResponse.json(
          { status: "fail", message: "Purchase record not found!" },
          { status: 404 }
        );
      }

      const existingReturns = await prisma.purchase_returns.findMany({
        where: { purchase_id: BigInt(purchase_id) },
      });
      const returnedQtyByProduct = new Map<string, number>();
      for (const ret of existingReturns) {
        const pKey = ret.product_id.toString();
        returnedQtyByProduct.set(pKey, (returnedQtyByProduct.get(pKey) || 0) + (ret.quantity || 0));
      }

      const result = await prisma.$transaction(async (tx) => {
        let totalReturnAmount = 0;

        for (const item of products) {
          const detailId = BigInt(item.purchase_order_detail_id || item.detail_id);
          const productId = BigInt(item.product_id);
          const returnQty = parseFloat(String(item.quantity || 0));

          if (returnQty <= 0) continue;

          const detail = purchase.purchase_order_details.find(
            (d) => d.id === detailId && d.product_id === productId
          );

          if (!detail) {
            throw new Error(`Product detail record not found in original purchase.`);
          }

          const purchasedQty = parseFloat(String(detail.quantity || 0));
          const alreadyReturned = returnedQtyByProduct.get(productId.toString()) || 0;
          const eligibleQty = Math.max(0, purchasedQty - alreadyReturned);

          if (returnQty > eligibleQty) {
            throw new Error(
              `Return quantity (${returnQty}) exceeds remaining returnable quantity (${eligibleQty}).`
            );
          }

          const costPrice = parseFloat(String(detail.cost_price || 0));
          const returnAmount = Math.round(returnQty * costPrice * 100) / 100;

          // 1. Create purchase_returns record
          await tx.purchase_returns.create({
            data: {
              purchase_id: BigInt(purchase_id),
              supplier_id: BigInt(supplier_id || purchase.supplier_id),
              product_id: productId,
              user_id: BigInt(userId),
              quantity: Math.round(returnQty),
              amount: returnAmount,
              due_amount: returnAmount,
              date: new Date(returnDate),
            },
          });

          // 2. Decrement product stock from inventory
          const [prod]: any = await tx.$queryRawUnsafe(
            "SELECT id, quantity FROM products WHERE id = ? FOR UPDATE",
            productId
          );
          if (prod) {
            const currentStock = parseFloat(String(prod.quantity || 0));
            const newStock = Math.max(0, currentStock - returnQty);
            await tx.products.update({
              where: { id: productId },
              data: { quantity: String(newStock) },
            });
          }

          totalReturnAmount += returnAmount;
          returnedQtyByProduct.set(productId.toString(), alreadyReturned + returnQty);
        }

        // 3. Update purchases record
        const curReturnAdj = parseFloat(String(purchase.return_adjustment_amount || 0));
        const curDue = parseFloat(String(purchase.due_amount || 0));
        const newDue = Math.max(0, curDue - totalReturnAmount);

        await tx.purchases.update({
          where: { id: BigInt(purchase_id) },
          data: {
            return_adjustment_amount: curReturnAdj + totalReturnAmount,
            due_amount: String(newDue),
          },
        });

        // 4. Update supplier payable amount and record party ledger entry
        if (purchase.supplier_id) {
          const supplier = await tx.suppliers.findUnique({
            where: { id: purchase.supplier_id },
          });
          if (supplier) {
            const curPayable = parseFloat(String(supplier.purchase_payable_amount || 0));
            const newPayable = Math.max(0, curPayable - totalReturnAmount);
            await tx.suppliers.update({
              where: { id: purchase.supplier_id },
              data: { purchase_payable_amount: String(newPayable) },
            });

            // Supplier Party Ledger Entry
            await tx.party_ledger_entries.create({
              data: {
                party_type: "SUPPLIER",
                supplier_id: purchase.supplier_id,
                transaction_type: "PURCHASE_RETURN",
                reference_type: "PURCHASE_RETURN",
                reference_id: BigInt(purchase_id),
                reference_no: purchase.purchase_id,
                debit: new Prisma.Decimal(totalReturnAmount.toFixed(2)),
                credit: new Prisma.Decimal(0),
                balance: new Prisma.Decimal(newPayable.toFixed(2)),
                date: new Date(returnDate),
                note: `Purchase Return for Memo ${purchase.purchase_id}`,
                user_id: BigInt(userId),
              },
            });
          }
        }

        return { totalReturnAmount };
      });

      return NextResponse.json({
        status: "success",
        message: "Purchase return processed and stock deducted successfully!",
        data: result,
      });
    } else {
      // Process Sales Return
      const { order_id, customer_id } = body;
      if (!order_id) {
        return NextResponse.json(
          { status: "fail", message: "Invoice / Order record is required!" },
          { status: 400 }
        );
      }

      const order = await prisma.orders.findUnique({
        where: { id: BigInt(order_id) },
        include: { order_details: true, customers: true },
      });

      if (!order) {
        return NextResponse.json(
          { status: "fail", message: "Order not found!" },
          { status: 404 }
        );
      }

      const existingReturns = await prisma.product_returns.findMany({
        where: { order_id: BigInt(order_id) },
      });
      const returnedQtyByProduct = new Map<string, number>();
      const returnedAmountByProduct = new Map<string, number>();
      for (const ret of existingReturns) {
        if (ret.product_id) {
          const pKey = ret.product_id.toString();
          returnedQtyByProduct.set(pKey, (returnedQtyByProduct.get(pKey) || 0) + (ret.quantity || 0));
          returnedAmountByProduct.set(
            pKey,
            (returnedAmountByProduct.get(pKey) || 0) + parseFloat(String(ret.amount || 0))
          );
        }
      }

      const totalOrderDiscount = parseFloat(String(order.discount_amount || 0));

      const result = await prisma.$transaction(async (tx) => {
        let totalReturnAmount = 0;
        let totalDiscountToReduce = 0;
        let totalDueToReduce = 0;

        for (const item of products) {
          const detailId = BigInt(item.order_detail_id || item.detail_id);
          const productId = BigInt(item.product_id);
          const returnQty = parseFloat(String(item.quantity || 0));

          if (returnQty <= 0) continue;

          const detail = order.order_details.find(
            (d) => d.id === detailId && d.product_id === productId
          );

          if (!detail) {
            throw new Error(`Order detail line item not found for product.`);
          }

          const purchasedQty = parseFloat(String(detail.quantity || 0));
          const alreadyReturned = returnedQtyByProduct.get(productId.toString()) || 0;
          const eligibleQty = Math.max(0, purchasedQty - alreadyReturned);

          if (returnQty > eligibleQty) {
            throw new Error(
              `Return quantity (${returnQty}) exceeds remaining returnable quantity (${eligibleQty}).`
            );
          }

          const sellingPrice = parseFloat(String(detail.selling_price || 0));
          const lineSellingPrice = Math.round(purchasedQty * sellingPrice * 100) / 100;
          const alreadyReturnedAmt = returnedAmountByProduct.get(productId.toString()) || 0;
          const remainingLineTotal = Math.max(0, Math.round((lineSellingPrice - alreadyReturnedAmt) * 100) / 100);

          let returnAmount: number;
          if (returnQty >= eligibleQty) {
            returnAmount = remainingLineTotal;
          } else {
            returnAmount = Math.min(
              remainingLineTotal,
              Math.round(returnQty * sellingPrice * 100) / 100
            );
          }

          const curOrderDue = parseFloat(String(order.due_amount || 0));
          const remainingDueInOrder = Math.max(0, curOrderDue - totalDueToReduce);
          const dueToReduce = Math.min(remainingDueInOrder, returnAmount);

          const orderSubTotal = parseFloat(String(order.sub_total || 0));
          const returnRatio = orderSubTotal > 0 ? Math.min(1, returnAmount / orderSubTotal) : 0;
          const discountToReduce = Math.round(returnRatio * totalOrderDiscount * 100) / 100;

          // 1. Create product_returns record
          await tx.product_returns.create({
            data: {
              order_id: BigInt(order_id),
              customer_id: BigInt(customer_id || order.customer_id || 1),
              product_id: productId,
              quantity: Math.round(returnQty),
              amount: String(returnAmount.toFixed(2)),
              discount_amount: String(discountToReduce.toFixed(2)),
              due_amount: String(dueToReduce.toFixed(2)),
              date: returnDate,
              user_id: BigInt(userId),
            },
          });

          // 2. Restore product stock in physical inventory
          const [prod]: any = await tx.$queryRawUnsafe(
            "SELECT id, quantity FROM products WHERE id = ? FOR UPDATE",
            productId
          );
          if (prod) {
            const currentStock = parseFloat(String(prod.quantity || 0));
            const newStock = Math.round((currentStock + returnQty) * 1000) / 1000;
            await tx.products.update({
              where: { id: productId },
              data: { quantity: String(newStock) },
            });
          }

          totalReturnAmount += returnAmount;
          totalDiscountToReduce += discountToReduce;
          totalDueToReduce += dueToReduce;
          returnedQtyByProduct.set(productId.toString(), alreadyReturned + returnQty);
          returnedAmountByProduct.set(productId.toString(), alreadyReturnedAmt + returnAmount);
        }

        // 3. Update orders return adjustment and remaining due
        const curReturnAdj = parseFloat(String(order.return_adjustment_amount || 0));
        const curDue = parseFloat(String(order.due_amount || 0));
        const newDue = Math.max(0, Math.round((curDue - totalDueToReduce) * 100) / 100);

        await tx.orders.update({
          where: { id: BigInt(order_id) },
          data: {
            return_adjustment_amount: curReturnAdj + totalReturnAmount,
            due_amount: newDue,
          },
        });

        // 4. Update customer previous_due_amount and record party ledger entry
        if (order.customer_id) {
          const customer = await tx.customers.findUnique({
            where: { id: order.customer_id },
          });
          if (customer) {
            const curPrevDue = parseFloat(customer.previous_due_amount || "0");
            const newPrevDue = Math.max(0, Math.round((curPrevDue - totalDueToReduce) * 100) / 100);
            await tx.customers.update({
              where: { id: order.customer_id },
              data: { previous_due_amount: String(newPrevDue) },
            });

            // Customer Party Ledger Entry
            if (totalDueToReduce > 0) {
              await tx.party_ledger_entries.create({
                data: {
                  party_type: "CUSTOMER",
                  customer_id: order.customer_id,
                  transaction_type: "RETURN",
                  reference_type: "SALE_RETURN",
                  reference_id: BigInt(order_id),
                  reference_no: order.order_no,
                  debit: new Prisma.Decimal(0),
                  credit: new Prisma.Decimal(totalDueToReduce.toFixed(2)),
                  balance: new Prisma.Decimal(newPrevDue.toFixed(2)),
                  date: new Date(returnDate),
                  note: `Sales Return Credit for Invoice ${order.order_no}`,
                  user_id: BigInt(userId),
                },
              });
            }
          }
        }

        return { totalReturnAmount, totalDueToReduce };
      });

      return NextResponse.json({
        status: "success",
        message: "Sales return successfully processed and inventory restored!",
        data: result,
      });
    }
  } catch (error: any) {
    console.error("Return Create Error:", error);
    return NextResponse.json(
      { status: "fail", message: error?.message || "Failed to process return" },
      { status: 500 }
    );
  }
}
