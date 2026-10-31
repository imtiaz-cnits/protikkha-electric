"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Boxes,
  Loader2,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";
import { useToast } from "@/components/ui/toast";

interface ValuationItem {
  id: number;
  name: string;
  code: string;
  category: string;
  brand: string;
  unit: string;
  quantity: number;
  unit_cost: number;
  unit_retail: number;
  total_cost_value: number;
  total_retail_value: number;
  potential_profit: number;
  margin_percent: string;
}

export default function StockValuationPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<ValuationItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((catData) => {
        if (catData.status === "success") setCategories(catData.data || []);
      })
      .catch(() => {});
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("category_id", selectedCategory);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const valRes = await fetch(`/api/reports/stock-valuation?${params.toString()}`, {
        cache: "no-store",
      });
      const valData = await valRes.json();

      if (valData.status === "success") setItems(valData.data || []);
    } catch (err: any) {
      toast.error("Failed to load inventory valuation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory, startDate, endDate]);

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.brand.toLowerCase().includes(q)
    );
  }, [items, search]);

  const totals = useMemo(() => {
    const totalCost = filtered.reduce((acc, i) => acc + i.total_cost_value, 0);
    const totalRetail = filtered.reduce((acc, i) => acc + i.total_retail_value, 0);
    const profit = totalRetail - totalCost;
    return { totalCost, totalRetail, profit };
  }, [filtered]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const reportPayload: PrintReportPayload = useMemo(
    () => ({
      title: "Inventory Stock Valuation & Asset Report",
      subtitle: "Total inventory capital investment, retail replacement value, and unrealized gross margins",
      metaItems: [
        {
          label: "Period",
          value: startDate || endDate ? `${startDate || "Start"} to ${endDate || "Today"}` : "All Active Stock",
        },
        { label: "Total Cost Asset", value: formatBdCurrency(totals.totalCost) },
        { label: "Total Retail Value", value: formatBdCurrency(totals.totalRetail) },
        { label: "Unrealized Margin", value: formatBdCurrency(totals.profit) },
      ],
      columns: [
        { header: "SL", align: "center", width: "5%" },
        { header: "Product & Barcode", align: "left", width: "24%" },
        { header: "Category", align: "left", width: "13%" },
        { header: "In Stock", align: "center", width: "10%" },
        { header: "Unit Cost", align: "right", width: "11%" },
        { header: "Unit Retail", align: "right", width: "11%" },
        { header: "Cost Value", align: "right", width: "10%" },
        { header: "Retail Value", align: "right", width: "10%" },
        { header: "Margin", align: "center", width: "6%" },
      ],
      rows: filtered.map((i, idx) => [
        { text: String(idx + 1), align: "center" },
        { text: i.name, subText: `${i.code} • ${i.brand}`, bold: true },
        i.category,
        { text: `${i.quantity} ${i.unit}`, align: "center", bold: true, mono: true },
        { text: formatBdCurrency(i.unit_cost), align: "right" },
        { text: formatBdCurrency(i.unit_retail), align: "right" },
        { text: formatBdCurrency(i.total_cost_value), align: "right", bold: true },
        { text: formatBdCurrency(i.total_retail_value), align: "right", bold: true, color: "navy" },
        { text: `${i.margin_percent}%`, align: "center", color: "emerald", bold: true },
      ]),
      totalRow: [
        "",
        "TOTAL VALUATION",
        `${filtered.length} SKUs`,
        {
          text: `${filtered.reduce((a, x) => a + x.quantity, 0)} Units`,
          align: "center",
        },
        "",
        "",
        { text: formatBdCurrency(totals.totalCost), align: "right" },
        { text: formatBdCurrency(totals.totalRetail), align: "right", color: "navy" },
        "",
      ],
      filename: "inventory-stock-valuation",
    }),
    [filtered, totals, startDate, endDate]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Inventory Stock Valuation & Asset Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Total inventory capital investment, retail replacement value, and unrealized gross margins
            </p>
          </div>
        </div>

        <ReportExportActions payload={reportPayload} />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Total Cost Value (Asset)</span>
          <span className="text-xl font-black text-slate-900 dark:text-white mt-1 block">
            {formatBdCurrency(totals.totalCost)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Total Retail Sales Value</span>
          <span className="text-xl font-black text-[#1E65A0] dark:text-blue-400 mt-1 block">
            {formatBdCurrency(totals.totalRetail)}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs">
          <span className="text-xs text-slate-400 block font-medium">Unrealized Gross Margin</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            {formatBdCurrency(totals.profit)}
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
        searchPlaceholder="Search by code, product name, category..."
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setCurrentPage(1);
        }}
        hasExtraActiveFilter={selectedCategory !== "all"}
        onClear={() => {
          setSearch("");
          setStartDate("");
          setEndDate("");
          setSelectedCategory("all");
          setCurrentPage(1);
        }}
        extraFilters={
          <div className="w-[180px]">
            <CustomSelect
              options={[
                { value: "all", label: "All Categories" },
                ...categories.map((c) => ({ value: String(c.id), label: c.category_name })),
              ]}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(String(val));
                setCurrentPage(1);
              }}
              placeholder="Filter Category"
            />
          </div>
        }
      />

      {/* Compact Full-Screen Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Calculating inventory valuation...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No valuation records found.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3 w-[25%]">Product & Barcode</th>
                    <th className="py-2.5 px-2.5 w-[14%]">Category</th>
                    <th className="py-2.5 px-2 text-center w-[10%]">In Stock</th>
                    <th className="py-2.5 px-2.5 text-right w-[11%]">Unit Cost</th>
                    <th className="py-2.5 px-2.5 text-right w-[11%]">Unit Retail</th>
                    <th className="py-2.5 px-2.5 text-right w-[11%]">Cost Value</th>
                    <th className="py-2.5 px-2.5 text-right w-[11%]">Retail Value</th>
                    <th className="py-2.5 px-2 text-center w-[7%]">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((i) => (
                    <tr key={i.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 truncate">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={i.name}>
                          {i.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {i.code} • {i.brand}
                        </div>
                      </td>

                      <td className="py-2.5 px-2.5 truncate text-slate-600 dark:text-slate-400" title={i.category}>
                        {i.category}
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-mono font-bold">
                        {i.quantity} {i.unit}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_cost)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(i.unit_retail)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {formatBdCurrency(i.total_cost_value)}
                      </td>

                      <td className="py-2.5 px-2.5 text-right whitespace-nowrap font-bold text-[#0B3D91] dark:text-blue-400">
                        {formatBdCurrency(i.total_retail_value)}
                      </td>

                      <td className="py-2.5 px-2 text-center whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {i.margin_percent}%
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
                      <h4 className="font-bold text-slate-800 dark:text-white">{i.name}</h4>
                      <p className="text-[10px] text-slate-400">
                        {i.quantity} {i.unit} • {i.category}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {formatBdCurrency(i.total_cost_value)}
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
