"use client";

import { useEffect, useState, useCallback } from "react";
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
  Search,
  RotateCcw,
  Percent,
  Calendar,
  Building2,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";

interface BannerStats {
  income: number;
  cashCollection: number;
  expense: number;
  profit: number;
  receivableDue: number;
  payableDue: number;
  returns: number;
  discount: number;
  totalProduct: number;
  totalCustomer: number;
  totalSupplier: number;
}

interface TableOrder {
  id: number;
  order_no: string;
  customer_name: string;
  sub_total: number;
  paid_amount: number;
  due_amount: number;
  invoice_date?: string | null;
  created_at: string;
}

interface DashboardApiResponse {
  banner: BannerStats;
  trendData: { date: string; sales: number; profit: number }[];
  financialDistribution: {
    monthlyCollection: number;
    customerDues: number;
    monthlyExpenses: number;
    netProfit: number;
    totalVolume: number;
  };
  table: {
    orders: TableOrder[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export default function DashboardPage() {
  // Period filter state: today | last_week | last_month | date_wise
  const [period, setPeriod] = useState<string>("today");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Table filter & pagination state
  const [tableSearch, setTableSearch] = useState<string>("");
  const [tablePage, setTablePage] = useState<number>(1);
  const [tablePageSize, setTablePageSize] = useState<number>(10); // 1st time 10 ta select thakbe

  // Dashboard Data
  const [data, setData] = useState<DashboardApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      let url = `/api/dashboard/stats?period=${period}&page=${tablePage}&pageSize=${tablePageSize}&search=${encodeURIComponent(
        tableSearch
      )}`;

      if (period === "date_wise" && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (json.status === "success") {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, tablePage, tablePageSize, tableSearch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const banner = data?.banner || {
    income: 0,
    cashCollection: 0,
    expense: 0,
    profit: 0,
    receivableDue: 0,
    payableDue: 0,
    returns: 0,
    discount: 0,
    totalProduct: 0,
    totalCustomer: 0,
    totalSupplier: 0,
  };

  const trendData = data?.trendData || [];
  const financialDistribution = data?.financialDistribution || {
    monthlyCollection: 0,
    customerDues: 0,
    monthlyExpenses: 0,
    netProfit: 0,
    totalVolume: 0,
  };

  const tableOrders = data?.table.orders || [];
  const totalCount = data?.table.totalCount || 0;
  const totalPages = data?.table.totalPages || 1;

  return (
    <div className="space-y-5">
      {/* 1. Top Header & Period Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-[#0f172a] p-4 sm:p-5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/60 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center shadow-xs shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none m-0">
              Overview Dashboard
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0">
              Real-time sales, collections, expenses, dues &amp; business metrics
            </p>
          </div>
        </div>

        {/* Filter & Quick Launch Area */}
        <div className="flex flex-wrap items-center gap-2.5 justify-center md:justify-end">
          {/* Custom Period Filter Dropdown */}
          <div className="w-[160px]">
            <CustomSelect
              value={period}
              onChange={(val) => {
                setPeriod(String(val));
                setTablePage(1);
              }}
              options={[
                { value: "today", label: "Today" },
                { value: "last_week", label: "Last Week" },
                { value: "last_month", label: "Last Month" },
                { value: "date_wise", label: "Date Wise" },
              ]}
              placeholder="Select Period"
            />
          </div>

          {/* If Date Wise is selected: Date Range Picker */}
          {period === "date_wise" && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="w-[130px]">
                <CustomDatePicker
                  value={startDate}
                  onChange={(d) => {
                    setStartDate(d);
                    setTablePage(1);
                  }}
                  placeholder="From Date"
                />
              </div>
              <span className="text-xs text-slate-400 font-bold">to</span>
              <div className="w-[130px]">
                <CustomDatePicker
                  value={endDate}
                  onChange={(d) => {
                    setEndDate(d);
                    setTablePage(1);
                  }}
                  placeholder="To Date"
                />
              </div>
            </div>
          )}

          {/* Quick Buttons */}
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Refresh Live Metrics"
            disabled={loading}
            className="h-[38px] w-[38px] rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] flex items-center justify-center transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin text-[#1E65A0]" : ""
                }`}
            />
          </button>

          <Link
            href="/pos"
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 shadow-xs hover:shadow-sm transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Terminal</span>
          </Link>

          <Link
            href="/products"
            className="h-[38px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] font-semibold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <PlusCircle className="w-4 h-4 text-[#1E65A0]" />
            <span>Products</span>
          </Link>
        </div>
      </div>

      {/* 2. Banner Cards in 3 Rows (Strictly following requirement 1) */}
      <div className="space-y-3.5">
        {/* ROW 1: Income, Cash Collection, Expense, Profit */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Income (Total Sales) */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Income
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.income)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-emerald-600 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Total Sales Revenue</span>
            </div>
          </div>

          {/* Card 2: Cash Collection */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cash Collection
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.cashCollection)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-teal-600 font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Paid at Counter &amp; Dues</span>
            </div>
          </div>

          {/* Card 3: Expense */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Expense
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.expense)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Operating Expenses</span>
            </div>
          </div>

          {/* Card 4: Profit */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Profit
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1E65A0] dark:text-blue-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.profit)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#1E65A0] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Net Business Profit</span>
            </div>
          </div>
        </div>

        {/* ROW 2: Receivable Due, Payable Due, Return, Discount */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 5: Receivable Due */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Receivable Due
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.receivableDue)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-600 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Customer Balance</span>
            </div>
          </div>

          {/* Card 6: Payable Due */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Payable Due
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#1E65A0] dark:text-blue-400 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.payableDue)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-blue-600 font-bold">
              <Truck className="w-3.5 h-3.5" />
              <span>Vendor Payable</span>
            </div>
          </div>

          {/* Card 7: Return */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Return
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.returns)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-rose-600 font-bold">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Sales Adjustments</span>
            </div>
          </div>

          {/* Card 8: Discount */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Discount
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white">
              {formatBdCurrency(banner.discount)}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-indigo-600 font-bold">
              <Percent className="w-3.5 h-3.5" />
              <span>Total Discounts</span>
            </div>
          </div>
        </div>

        {/* ROW 3: Total Product, Total Customer, Total Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Card 9: Total Product */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 m-0">
                Total Products
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-white m-0 leading-tight">
                {banner.totalProduct}
              </p>
            </div>
          </div>

          {/* Card 10: Total Customer */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 m-0">
                Total Customers
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-white m-0 leading-tight">
                {banner.totalCustomer}
              </p>
            </div>
          </div>

          {/* Card 11: Total Supplier */}
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 m-0">
                Total Suppliers
              </p>
              <p className="text-xl font-black text-slate-800 dark:text-white m-0 leading-tight">
                {banner.totalSupplier}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Recent Invoices Master Table with Search & Show Entries */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#1E65A0] dark:text-blue-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white leading-none m-0">
                Recent Invoices (Latest First)
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 m-0">
                Real-time transactions ordered descending by ID
              </p>
            </div>
          </div>

          {/* Search bar & Show entries */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-full sm:w-[240px]">
              <input
                type="text"
                placeholder="Search invoice, customer..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setTablePage(1);
                }}
                className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="w-[120px]">
              <CustomSelect
                value={String(tablePageSize)}
                onChange={(val) => {
                  setTablePageSize(Number(val));
                  setTablePage(1);
                }}
                options={[
                  { value: "10", label: "Show 10" },
                  { value: "25", label: "Show 25" },
                  { value: "50", label: "Show 50" },
                  { value: "100", label: "Show 100" },
                ]}
                placeholder="Show entries"
              />
            </div>

            <Link
              href="/invoices"
              className="text-xs font-bold text-[#1E65A0] hover:text-[#0B3D91] dark:text-blue-400 flex items-center gap-1 ml-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
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
              {tableOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    {loading
                      ? "Loading transactions..."
                      : "No orders found matching the filter."}
                  </td>
                </tr>
              ) : (
                tableOrders.map((order, idx) => {
                  const due = Number(order.due_amount || 0);
                  const status =
                    due <= 0
                      ? "PAID"
                      : order.paid_amount && Number(order.paid_amount) > 0
                        ? "PARTIAL"
                        : "DUE";

                  const slNumber = (tablePage - 1) * tablePageSize + idx + 1;

                  return (
                    <tr
                      key={Number(order.id)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-[10px] text-center font-bold text-slate-500">
                        {slNumber}
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
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${status === "PAID"
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

        {/* Mobile View Card List */}
        <div className="block md:hidden p-3 space-y-3">
          {tableOrders.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs font-medium">
              {loading ? "Loading transactions..." : "No orders recorded yet."}
            </div>
          ) : (
            tableOrders.map((order) => {
              const due = Number(order.due_amount || 0);
              const status =
                due <= 0
                  ? "PAID"
                  : order.paid_amount && Number(order.paid_amount) > 0
                    ? "PARTIAL"
                    : "DUE";

              return (
                <div
                  key={Number(order.id)}
                  className="rounded-xl border border-[#cbd5e1] dark:border-[#334155] p-3.5 bg-white dark:bg-slate-800/60 shadow-xs"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-white">
                      {order.order_no || `ORD-${order.id}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${status === "PAID"
                          ? "bg-emerald-500 text-white"
                          : status === "PARTIAL"
                            ? "bg-amber-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                    >
                      {status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 m-0">
                    {order.customer_name || "Walking Customer"}
                  </p>

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

        {/* Table Footer with Pagination */}
        <div className="p-3.5 sm:p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800 dark:text-white">
              {totalCount === 0 ? 0 : (tablePage - 1) * tablePageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-bold text-slate-800 dark:text-white">
              {Math.min(tablePage * tablePageSize, totalCount)}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800 dark:text-white">
              {totalCount}
            </span>{" "}
            entries
          </div>

          <div className="flex items-center gap-1 self-center sm:self-auto">
            <button
              type="button"
              disabled={tablePage <= 1}
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              className="h-[34px] px-3 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            <span className="h-[34px] px-3.5 rounded-lg bg-[#0B3D91] text-white font-bold flex items-center justify-center text-xs shadow-2xs">
              {tablePage}
            </span>

            <button
              type="button"
              disabled={tablePage >= totalPages}
              onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
              className="h-[34px] px-3 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Charts Added Under Table (Matching Image 1) */}
      <DashboardCharts
        trendData={trendData}
        financialDistribution={financialDistribution}
      />
    </div>
  );
}
