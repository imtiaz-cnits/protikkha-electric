import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface NotificationItem {
  id: string;
  type: "stock" | "sale" | "due";
  title: string;
  description: string;
  badge: string;
  badgeColor: "rose" | "amber" | "emerald" | "blue";
  link: string;
  timestamp: string;
}

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const [allProducts, recentDueOrders, recentSales] = await Promise.all([
      // Products with low or zero stock
      prisma.products.findMany({
        take: 100,
        orderBy: { id: "desc" },
        select: {
          id: true,
          product_name: true,
          quantity: true,
          updated_at: true,
        },
      }),

      // Unpaid or partial orders with due amount
      prisma.orders.findMany({
        where: {
          due_amount: { gt: 0 },
        },
        take: 10,
        orderBy: { id: "desc" },
        include: {
          customers: {
            select: { customer_name: true },
          },
        },
      }),

      // Latest completed or paid orders
      prisma.orders.findMany({
        take: 5,
        orderBy: { id: "desc" },
        include: {
          customers: {
            select: { customer_name: true },
          },
        },
      }),
    ]);

    const notifications: NotificationItem[] = [];

    // Filter low stock and out-of-stock products
    for (const p of allProducts) {
      const qty = parseFloat(p.quantity || "0");
      if (qty <= 0) {
        notifications.push({
          id: `out-stock-${p.id}`,
          type: "stock",
          title: "Out of Stock Alert",
          description: `"${p.product_name}" is currently sold out! Please restock.`,
          badge: "0 Qty",
          badgeColor: "rose",
          link: "/inventory?filter=out",
          timestamp: p.updated_at ? p.updated_at.toISOString() : new Date().toISOString(),
        });
      } else if (qty <= 5) {
        notifications.push({
          id: `low-stock-${p.id}`,
          type: "stock",
          title: "Low Stock Warning",
          description: `"${p.product_name}" has only ${qty} units remaining.`,
          badge: `${qty} left`,
          badgeColor: "amber",
          link: "/inventory?filter=low",
          timestamp: p.updated_at ? p.updated_at.toISOString() : new Date().toISOString(),
        });
      }
      if (notifications.filter((n) => n.type === "stock").length >= 10) break;
    }

    // Add recent due notifications
    for (const ord of recentDueOrders) {
      const dueVal = parseFloat(String(ord.due_amount || 0));
      if (dueVal > 0) {
        notifications.push({
          id: `due-${ord.id}`,
          type: "due",
          title: `Pending Due: ${ord.order_no}`,
          description: `${ord.customers?.customer_name || "Customer"} owes ৳ ${dueVal.toLocaleString("en-BD", { minimumFractionDigits: 2 })}`,
          badge: `৳ ${dueVal.toFixed(0)} Due`,
          badgeColor: "rose",
          link: `/invoices`,
          timestamp: ord.created_at ? ord.created_at.toISOString() : new Date().toISOString(),
        });
      }
    }

    // Add recent sales notifications
    for (const s of recentSales) {
      notifications.push({
        id: `sale-${s.id}`,
        type: "sale",
        title: `Recent Sale: ${s.order_no}`,
        description: `Order completed for ${s.customers?.customer_name || "Customer"}${Number(s.due_amount || 0) > 0 ? " (Due Pending)" : " (Paid)"}`,
        badge: `৳ ${parseFloat(String(s.sub_total || 0)).toFixed(0)}`,
        badgeColor: "emerald",
        link: `/invoices`,
        timestamp: s.created_at ? s.created_at.toISOString() : new Date().toISOString(),
      });
    }

    const lowStockCount = notifications.filter((n) => n.type === "stock").length;
    const dueCount = notifications.filter((n) => n.type === "due").length;
    const salesCount = notifications.filter((n) => n.type === "sale").length;

    return NextResponse.json({
      status: "success",
      data: {
        totalCount: notifications.length,
        lowStockCount,
        dueCount,
        salesCount,
        items: notifications,
      },
    });
  } catch (err: any) {
    console.error("Notifications API error:", err);
    return NextResponse.json(
      { status: "error", message: err?.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
