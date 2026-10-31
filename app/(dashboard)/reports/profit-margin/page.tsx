"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Loader2,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/reports/profit-margin${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
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

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.product_name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.date.includes(q)
    );
  }, [items, search]);

  const totals = useMemo(() => {
    const rev = filtered.reduce((acc, i) => acc + i.sales_revenue, 0);
    const cogs = filtered.reduce((acc, i) => acc + i.cogs, 0);
    const profit = rev - cogs;
    const overallMargin = rev > 0 ? ((profit / rev) * 100).toFixed(1) : "0.0";
    return { rev, cogs, profit, overallMargin };
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const reportPayload: PrintReportPayload = useMemo(
    () => ({
      title: "Gross Profit & Margin Report",
      subtitle: "Sales revenue vs Cost of Goods Sold (COGS) and realized gross margins per line item",
      metaItems: [
        {
          label: "Period",
          value: startDate || endDate ? `${startDate || "Start"} to ${endDate || "Today"}` : "All Dates",
        },
        { label: "Sales Revenue", value: formatBdCurrency(totals.rev) },
        { label: "COGS", value: formatBdCurrency(totals.cogs) },
        { label: "Gross Profit", value: formatBdCurrency(totals.profit) },
        { label: "Margin", value: `${totals.overallMargin}%` },
      ],
      columns: [
        { header: "SL", align: "center", width: "5%" },
        { header: "Date", align: "left", width: "10%" },
        { header: "Product & Category", align: "left", width: "24%" },
        { header: "Qty", align: "center", width: "7%" },
        { header: "Sell Rate", align: "right", width: "10%" },
        { header: "Cost Rate", align: "right", width: "10%" },
        { header: "Revenue", align: "right", width: "11%" },
        { header: "COGS", align: "right", width: "10%" },
        { header: "Profit", align: "right", width: "8%" },
        { header: "%", align: "center", width: "5%" },
      ],
      rows: filtered.map((i, idx) => [
        { text: String(idx + 1), align: "center" },
        { text: i.date, mono: true },
        { text: i.product_name, subText: i.category, bold: true },
        { text: String(i.sold_qty), align: "center", bold: true, mono: true },
        { text: formatBdCurrency(i.unit_sell_price), align: "right" },
        { text: formatBdCurrency(i.unit_cost_price), align: "right" },
        { text: formatBdCurrency(i.sales_revenue), align: "right", bold: true },
        { text: formatBdCurrency(i.cogs), align: "right" },
        { text: `+${formatBdCurrency(i.gross_profit)}`, align: "right", bold: true, color: "emerald" },
        { text: `${i.profit_margin}%`, align: "center", bold: true, color: "emerald" },
      ]),
      totalRow: [
        "",
        "",
        "TOTAL GROSS MARGIN",
        {
          text: String(filtered.reduce((s, x) => s + x.sold_qty, 0)),
          align: "center",
        },
        "",
        "",
        { text: formatBdCurrency(totals.rev), align: "right" },
        { text: formatBdCurrency(totals.cogs), align: "right" },
        { text: `+${formatBdCurrency(totals.profit)}`, align: "right", color: "emerald" },
        { text: `${totals.overallMargin}%`, align: "center", color: "emerald" },
      ],
      filename: "gross-profit-margin-report",
    }),
    [filtered, totals, startDate, endDate]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Gross Profit & Margin Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Sales revenue vs Cost of Goods Sold (COGS) and realized gross margins per line item
            </p>
          </div>
        </div>

        <ReportExportActions payload={reportPayload} />
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

      {/* Unified Dynamic Filter Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search product, category..."
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setCurrentPage(1);
        }}
        onClear={() => {
          setSearch("");
          setStartDate("");
          setEndDate("");
          setCurrentPage(1);
        }}
      />

      {/* Compact Full-Screen Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading profit margins...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No sold item margin records found for the selected period.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-2.5 w-[10%]">Date</th>
                    <th className="py-2.5 px-3 w-[26%]">Product & Category</th>
                    <th className="py-2.5 px-2 text-center w-[8%]">Qty</th>
                    <th className="py-2.5 px-2.5 text-right w-[10%]">Sell Rate</th>
                    <th className="py-2.5 px-2.5 text-right w-[10%]">Cost Rate</th>
                    <th className="py-2.5 px-2.5 text-right w-[11%]">Revenue</th>
                    <th className="py-2.5 px-2.5 text-right w-[10%]">COGS</th>
                    <th className="py-2.5 px-2.5 text-right w-[9%]">Profit</th>
                    <th className="py-2.5 px-2 text-center w-[6%]">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((i) => (
                    <tr key={i.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {i.date}
                      </td>

                      <td className="py-2.5 px-3 truncate">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={i.product_name}>
                          {i.product_name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {i.category}
                        </div>
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-mono font-bold">
                        {i.sold_qty}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_sell_price)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_cost_price)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {formatBdCurrency(i.sales_revenue)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.cogs)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatBdCurrency(i.gross_profit)}
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
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
                      <p className="text-[10px] text-slate-400">
                        {i.sold_qty} • {i.category}
                      </p>
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

      <PrintTableSheet {...reportPayload} />
    </div>
  );
}
