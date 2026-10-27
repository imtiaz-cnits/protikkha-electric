"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Receipt,
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  ShoppingCart,
  PlusCircle,
  Truck,
  Users,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

interface RecentOrder {
  id: number;
  order_no: string;
  customer_name: string;
  sub_total: number;
  paid_amount: number;
  due_amount: number;
  invoice_date?: string | null;
  created_at: string;
}

interface DashboardStats {
  todaySales: number;
  todayInvoicesCount: number;
  todayPaid: number;
  totalCustomerDue: number;
  totalSupplierDue: number;
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalOrders: number;
  todayExpense: number;
  recentOrders: RecentOrder[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayInvoicesCount: 0,
    todayPaid: 0,
    totalCustomerDue: 0,
    totalSupplierDue: 0,
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalOrders: 0,
    todayExpense: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
      const data = await res.json();
      if (data.status === "success") {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Re-fetch when page is focused to ensure always up-to-date
    const handleFocus = () => {
      fetchStats();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  const {
    todaySales,
    todayInvoicesCount,
    todayPaid,
    totalCustomerDue,
    totalSupplierDue,
    totalProducts,
    totalCustomers,
    totalSuppliers,
    todayExpense,
    recentOrders,
  } = stats;

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none m-0">
              Overview Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Welcome back to Runa Traders POS Management
            </p>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchStats}
            title="Refresh Live Metrics"
            disabled={loading}
            className="h-[38px] w-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-600 flex items-center justify-center transition-all shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin text-rose-600" : ""}`} />
          </button>
          <Link
            href="/pos"
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Open POS Terminal</span>
          </Link>
          <Link
            href="/products"
            className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-rose-600 font-semibold text-xs flex items-center gap-2 transition-all shadow-xs"
          >
            <PlusCircle className="w-4 h-4 text-rose-600" />
            <span>Products</span>
          </Link>
        </div>
      </div>

      {/* KPI Financial Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today Sales
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatBdCurrency(todaySales)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{todayInvoicesCount} Invoices Created</span>
          </div>
        </div>

        {/* Today's Cash Collection */}
        <div className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Today Collected
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatBdCurrency(todayPaid)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-teal-600 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Cash in Hand / Bank</span>
          </div>
        </div>

        {/* Customer Dues (Receivable) */}
        <div className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Receivable Due
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatBdCurrency(totalCustomerDue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Customer Balance</span>
          </div>
        </div>

        {/* Supplier Dues (Payable) */}
        <div className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Payable Dues
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
            {formatBdCurrency(totalSupplierDue)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-[11px] text-rose-600 font-bold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Vendor Payable</span>
          </div>
        </div>
      </div>

      {/* Secondary Quick Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Products</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">{totalProducts}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Total Customers</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">{totalCustomers}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Suppliers</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">{totalSuppliers}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Today Expense</p>
            <p className="text-sm font-black text-slate-800 dark:text-white">
              {formatBdCurrency(todayExpense)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Orders Section (Strict Marss Corp Master Table Layout) */}
      <div className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-none m-0">
                Recent Invoices (Latest First)
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time transactions ordered descending by ID
              </p>
            </div>
          </div>

          <Link
            href="/invoices"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Desktop View Table (hidden on mobile, visible on desktop >= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                <th className="p-[10px] text-center w-[45px]">SL</th>
                <th className="p-[10px]">Order No</th>
                <th className="p-[10px]">Customer</th>
                <th className="p-[10px] text-right">Sub Total</th>
                <th className="p-[10px] text-right">Paid Amount</th>
                <th className="p-[10px] text-right">Due Amount</th>
                <th className="p-[10px] text-center">Status</th>
                <th className="p-[10px] text-center">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    {loading ? "Loading transactions..." : "No orders recorded yet. Launch the POS terminal to start ringing sales!"}
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, idx) => {
                  const due = Number(order.due_amount || 0);
                  const status =
                    due <= 0 ? "PAID" : order.paid_amount && Number(order.paid_amount) > 0 ? "PARTIAL" : "DUE";

                  return (
                    <tr
                      key={Number(order.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-[10px] text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-[10px] font-bold text-slate-900 dark:text-white">
                        {order.order_no || `ORD-${order.id}`}
                      </td>
                      <td className="p-[10px] font-medium">
                        {order.customer_name || "Walking Customer"}
                      </td>
                      <td className="p-[10px] text-right font-bold text-slate-800 dark:text-white">
                        {formatBdCurrency(order.sub_total)}
                      </td>
                      <td className="p-[10px] text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(order.paid_amount)}
                      </td>
                      <td className="p-[10px] text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(order.due_amount)}
                      </td>
                      <td className="p-[10px] text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            status === "PAID"
                              ? "bg-emerald-500 text-white"
                              : status === "PARTIAL"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="p-[10px] text-center text-slate-400 whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString("en-GB")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List (< 768px, matching Marss Corp 2-col financial grid) */}
        <div className="block md:hidden p-3 space-y-3">
          {recentOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">
              {loading ? "Loading transactions..." : "No orders recorded yet."}
            </div>
          ) : (
            recentOrders.map((order) => {
              const due = Number(order.due_amount || 0);
              const status =
                due <= 0 ? "PAID" : order.paid_amount && Number(order.paid_amount) > 0 ? "PARTIAL" : "DUE";

              return (
                <div
                  key={Number(order.id)}
                  className="rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-3.5 bg-white dark:bg-slate-800/60 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-white">
                      {order.order_no || `ORD-${order.id}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        status === "PAID"
                          ? "bg-emerald-500 text-white"
                          : status === "PARTIAL"
                          ? "bg-amber-500 text-white"
                          : "bg-rose-500 text-white"
                      }`}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {order.customer_name || "Walking Customer"}
                  </p>

                  {/* 2-Column Financial Grid (Strict Rule 8.5) */}
                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2.5">
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                      <span className="text-slate-400 text-[11px]">Total:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatBdCurrency(order.sub_total)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                      <span className="text-slate-400 text-[11px]">Due:</span>
                      <span className="font-bold text-rose-600">
                        {formatBdCurrency(order.due_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
