"use client";

import { useEffect, useState } from "react";
import {
  FileSpreadsheet,
  Search,
  Calendar,
  Printer,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Loader2,
  DollarSign,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui";

interface SalesOrder {
  id: number;
  order_no: string;
  customer_id: number | null;
  customer_name: string;
  customer_mobile: string;
  items_count: number;
  sub_total: number;
  discount_amount: number;
  delivery_charge: number;
  net_amount: number;
  cost_amount: number;
  profit_amount: number;
  paid_amount: number;
  due_amount: number;
  return_amount: number;
  date: string;
}

interface Summary {
  total_orders: number;
  total_sales_amount: number;
  total_cost_amount: number;
  total_gross_profit: number;
  total_paid_amount: number;
  total_due_amount: number;
  total_discount_amount: number;
  total_return_amount: number;
}

export default function SalesReportPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      let url = `/api/reports/sales?search=${encodeURIComponent(search)}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setOrders(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, startDate, endDate]);

  const setPreset = (preset: "today" | "yesterday" | "7days" | "month" | "all") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedOrders = orders.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Sales & Gross Profit Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Detailed breakdown of revenue, COGS, profit margin, cash collected, and dues
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto border border-[#cbd5e1] dark:border-[#334155]"
        >
          <Printer className="w-4 h-4" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* 2. Four Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBdCurrency(summary?.total_sales_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary?.total_orders || 0} invoices generated
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Cash Collected</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBdCurrency(summary?.total_paid_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Paid at counter / POS
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Customer Due (Receivable)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatBdCurrency(summary?.total_due_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pending customer dues
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Estimated Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {formatBdCurrency(summary?.total_gross_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Sales less buying cost & returns
          </div>
        </div>
      </div>

      {/* 3. Date Filters & Presets */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search invoice or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[135px]">
              <CustomDatePicker
                value={startDate}
                onChange={(d) => {
                  setStartDate(d);
                  setCurrentPage(1);
                }}
                placeholder="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[135px]">
              <CustomDatePicker
                value={endDate}
                onChange={(d) => {
                  setEndDate(d);
                  setCurrentPage(1);
                }}
                placeholder="To Date"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreset("today")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              7 Days
            </button>
            <button
              onClick={() => setPreset("month")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              This Month
            </button>
            {(startDate || endDate) && (
              <button
                onClick={() => setPreset("all")}
                className="h-[38px] px-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Desktop Table (Rule 5.3 & 5.4: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-3 text-center">Items</th>
                <th className="py-3 px-3 text-right">Cost Price (৳)</th>
                <th className="py-3 px-3 text-right">Selling Total (৳)</th>
                <th className="py-3 px-3 text-right">Paid (৳)</th>
                <th className="py-3 px-3 text-right">Due (৳)</th>
                <th className="py-3 px-4 text-right">Profit (৳)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading sales report...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                    No sales invoices found for the specified period.
                  </td>
                </tr>
              ) : (
                displayedOrders.map((o, idx) => (
                  <tr
                    key={o.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {o.order_no}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {o.date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {o.customer_name}
                      </div>
                      {o.customer_mobile && (
                        <div className="text-[10px] text-slate-400">
                          {o.customer_mobile}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-700 dark:text-slate-300">
                      {o.items_count}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                      {formatBdCurrency(o.cost_amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatBdCurrency(o.net_amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBdCurrency(o.paid_amount)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatBdCurrency(o.due_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 dark:text-emerald-300">
                      {formatBdCurrency(o.profit_amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={orders.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {displayedOrders.map((o) => (
          <div
            key={o.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">
                  {o.order_no}
                </span>
                <p className="text-[11px] text-slate-500">{o.customer_name}</p>
              </div>
              <span className="font-black text-xs text-slate-900 dark:text-white">
                {formatBdCurrency(o.net_amount)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs py-1.5 border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div>
                <div className="text-[10px] text-slate-400">Paid</div>
                <div className="font-bold text-emerald-600">{formatBdCurrency(o.paid_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Due</div>
                <div className="font-bold text-rose-600">{formatBdCurrency(o.due_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Profit</div>
                <div className="font-bold text-emerald-700">{formatBdCurrency(o.profit_amount)}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-right">
              Date: {o.date} &bull; {o.items_count} items
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={orders.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[20, 50, 100, 200, 500]}
          />
        </div>
      </div>
    </div>
  );
}
