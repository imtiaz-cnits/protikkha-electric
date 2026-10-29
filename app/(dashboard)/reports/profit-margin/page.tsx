"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Loader2,
  DollarSign,
  Percent,
} from "lucide-react";
import { Pagination, CustomSelect } from "@/components/ui";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";

interface ProfitItem {
  id: number;
  product_name: string;
  category: string;
  sold_qty: number;
  unit_sell_price: number;
  unit_cost_price: number;
  sales_revenue: number;
  cogs: number;
  gross_profit: number;
  profit_margin: string;
  date: string;
}

export default function ProfitMarginReportPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ProfitItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const setPreset = (preset: "today" | "yesterday" | "7days" | "month" | "all") => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      setStartDate(y.toISOString().split("T")[0]);
      setEndDate(y.toISOString().split("T")[0]);
    } else if (preset === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(todayStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (preset === "all") {
      setStartDate("");
      setEndDate("");
    }
    setCurrentPage(1);
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      let url = "/api/reports/profit-margin";
      const params = [];
      if (startDate) params.push("start_date=" + startDate);
      if (endDate) params.push("end_date=" + endDate);
      if (params.length > 0) url += "?" + params.join("&");
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setItems(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load profit margin analysis");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const totals = useMemo(() => {
    const rev = items.reduce((acc, i) => acc + i.sales_revenue, 0);
    const cogs = items.reduce((acc, i) => acc + i.cogs, 0);
    const profit = rev - cogs;
    const overallMargin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
    return { rev, cogs, profit, overallMargin };
  }, [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.product_name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [items, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (items.length === 0) return;
    const headers = ["Date", "Product", "Category", "Sold Qty", "Sell Rate", "Cost Rate", "Sales Revenue", "COGS", "Gross Profit", "Margin %"];
    const rows = items.map((i) => [
      i.date,
      `"${i.product_name}"`,
      `"${i.category}"`,
      i.sold_qty,
      i.unit_sell_price,
      i.unit_cost_price,
      i.sales_revenue,
      i.cogs,
      i.gross_profit,
      `"${i.profit_margin}%"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `gross_profit_margin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Gross Profit & Margin Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Sales revenue vs Cost of Goods Sold (COGS) and realized gross margins per line item
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Margins</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Sales Revenue</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            {formatBdCurrency(totals.rev)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Cost of Goods Sold (COGS)</span>
          <span className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
            {formatBdCurrency(totals.cogs)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Realized Gross Profit</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatBdCurrency(totals.profit)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Overall Profit Margin</span>
          <span className="text-xl font-black text-[#1E65A0] dark:text-blue-400 mt-1 block">
            {totals.overallMargin}%
          </span>
        </div>
      </div>

{/* Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search product, category..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[130px]">
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
            <div className="w-[130px]">
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

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreset("today")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              7 Days
            </button>
            <button
              onClick={() => setPreset("month")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading profit margins...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No sold item margin records found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Product</th>
                    <th className="py-3 px-3.5">Category</th>
                    <th className="py-3 px-3.5 text-center">Qty Sold</th>
                    <th className="py-3 px-3.5 text-right">Sell Rate</th>
                    <th className="py-3 px-3.5 text-right">Cost Rate</th>
                    <th className="py-3 px-3.5 text-right">Revenue</th>
                    <th className="py-3 px-3.5 text-right">COGS</th>
                    <th className="py-3 px-3.5 text-right">Gross Profit</th>
                    <th className="py-3 px-3.5 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((i) => (
                    <tr key={i.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {i.date}
                      </td>

                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                        {i.product_name}
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {i.category}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono font-bold">
                        {i.sold_qty}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_sell_price)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_cost_price)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {formatBdCurrency(i.sales_revenue)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.cogs)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatBdCurrency(i.gross_profit)}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {i.profit_margin}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((i) => (
                <div key={i.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{i.product_name}</h4>
                      <p className="text-[10px] text-slate-400">{i.sold_qty} pcs • {i.category}</p>
                    </div>
                    <span className="font-bold text-emerald-600">
                      +{formatBdCurrency(i.gross_profit)} ({i.profit_margin}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
