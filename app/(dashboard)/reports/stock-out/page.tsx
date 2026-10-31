"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PackageX,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Plus,
  Loader2,
  Flame,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { Pagination, CustomSelect } from "@/components/ui";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";

interface ProductItem {
  id: number;
  product_name: string;
  product_code: string | null;
  category: string;
  brand: string;
  unit: string;
  stock: number;
  product_cost: number;
  price: number;
  status: "out_of_stock" | "low_stock" | "healthy";
}

interface FastMover {
  id: number;
  name: string;
  total_sold_qty: number;
  total_revenue: number;
  current_stock: number;
}

interface Summary {
  total_products: number;
  out_of_stock_count: number;
  low_stock_count: number;
  healthy_stock_count: number;
  estimated_restock_cost: number;
}

export default function StockOutReportPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [fastMovers, setFastMovers] = useState<FastMover[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState<"critical" | "out_of_stock" | "low_stock" | "all">("critical");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("filter", activeTab);
      if (search) params.set("search", search);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const res = await fetch(`/api/reports/stock-out?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "success") {
        setProducts(data.data);
        setFastMovers(data.fast_movers);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData();
  }, [activeTab, search, startDate, endDate]);

  const startIndex = (currentPage - 1) * pageSize;
  const displayedProducts = products.slice(startIndex, startIndex + pageSize);

  const reportPayload: PrintReportPayload = useMemo(
    () => ({
      title: "Stock-Out & Low Inventory Warning Report",
      subtitle: "Immediate restocking alerts, depleted inventory lists, and reorder valuation",
      metaItems: [
        { label: "Filter View", value: activeTab.replace(/_/g, " ").toUpperCase() },
        { label: "Out of Stock", value: `${summary?.out_of_stock_count || 0} Items` },
        { label: "Low Stock (≤ 5)", value: `${summary?.low_stock_count || 0} Items` },
        {
          label: "Est. Restock Cost",
          value: formatBdCurrency(summary?.estimated_restock_cost || 0),
        },
      ],
      columns: [
        { header: "SL", align: "center", width: "6%" },
        { header: "Product & Barcode", align: "left", width: "29%" },
        { header: "Category & Brand", align: "left", width: "19%" },
        { header: "Cost Price (৳)", align: "right", width: "12%" },
        { header: "Selling Price (৳)", align: "right", width: "12%" },
        { header: "Current Stock", align: "center", width: "11%" },
        { header: "Status", align: "center", width: "11%" },
      ],
      rows: products.map((p, idx) => [
        { text: String(idx + 1), align: "center" },
        { text: p.product_name, subText: p.product_code || undefined, bold: true },
        { text: p.category, subText: p.brand },
        { text: formatBdCurrency(p.product_cost), align: "right" },
        { text: formatBdCurrency(p.price), align: "right", bold: true },
        {
          text: `${p.stock} ${p.unit}`,
          align: "center",
          bold: true,
          color: p.stock <= 0 ? "rose" : p.stock <= 5 ? "amber" : "emerald",
        },
        {
          text:
            p.status === "out_of_stock"
              ? "Out of Stock"
              : p.status === "low_stock"
              ? "Low Stock"
              : "Healthy",
          align: "center",
          bold: true,
          color:
            p.status === "out_of_stock"
              ? "rose"
              : p.status === "low_stock"
              ? "amber"
              : "emerald",
        },
      ]),
      filename: "low-stock-warning-report",
    }),
    [products, summary, activeTab]
  );

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <PackageX className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Stock-Out & Low Inventory Warning Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Immediate restocking alerts, depleted inventory lists, and fast-moving demand
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Link
            href="/purchases"
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </Link>

          <ReportExportActions payload={reportPayload} />
        </div>
      </div>

      {/* 2. Four KPI Warning Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-xs">
            <div className="flex items-center justify-between text-rose-600 text-xs font-bold">
              <span>Out of Stock (Zero Stock)</span>
              <PackageX className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-rose-600 mt-1">
              {summary.out_of_stock_count} Items
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Completely depleted</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 text-xs font-bold">
              <span>Low Stock Warning (≤ 5)</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-amber-600 mt-1">
              {summary.low_stock_count} Items
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Reorder recommended</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Healthy Inventory</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600 mt-1">
              {summary.healthy_stock_count} Items
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sufficient stock available</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Estimated Restock Cost</span>
              <TrendingUp className="w-4 h-4 text-[#1E65A0]" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatBdCurrency(summary.estimated_restock_cost)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">To replenish critical items</div>
          </div>
        </div>
      )}

      {/* 3. Fast Movers Showcase Bar */}
      {fastMovers.length > 0 && (
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Top Fast Moving Products (Customer Demand Leaderboard)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {fastMovers.slice(0, 5).map((fm, idx) => (
              <div
                key={fm.id}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center justify-center font-black text-[10px]">
                    #{idx + 1}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      fm.current_stock <= 0
                        ? "bg-rose-100 text-rose-700"
                        : fm.current_stock <= 5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    Stock: {fm.current_stock}
                  </span>
                </div>
                <div className="font-bold text-slate-800 dark:text-slate-100 truncate" title={fm.name}>
                  {fm.name}
                </div>
                <div className="text-[11px] text-slate-400">
                  Sold: <strong className="text-slate-700 dark:text-slate-200">{fm.total_sold_qty}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Unified Dynamic Filter Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Search product name, barcode, category..."
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
        hasExtraActiveFilter={activeTab !== "critical"}
        onClear={() => {
          setSearch("");
          setStartDate("");
          setEndDate("");
          setActiveTab("critical");
        }}
        extraFilters={
          <div className="w-[180px]">
            <CustomSelect
              value={activeTab}
              onChange={(val) => {
                setActiveTab(val as any);
                setCurrentPage(1);
              }}
              options={[
                { value: "critical", label: "Critical Shortage" },
                { value: "out_of_stock", label: "Out of Stock (0)" },
                { value: "low_stock", label: "Low Stock (1-5)" },
                { value: "all", label: "All Catalog" },
              ]}
              placeholder="Stock Status"
            />
          </div>
        }
      />

      {/* 5. Compact Full-Screen Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead>
            <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
              <th className="py-2.5 px-2.5 w-[44px] text-center">SL</th>
              <th className="py-2.5 px-3 w-[28%]">Product & Barcode</th>
              <th className="py-2.5 px-2.5 w-[18%]">Category & Brand</th>
              <th className="py-2.5 px-2.5 text-right w-[13%]">Cost Price (৳)</th>
              <th className="py-2.5 px-2.5 text-right w-[13%]">Selling Price (৳)</th>
              <th className="py-2.5 px-2.5 text-center w-[12%]">Current Stock</th>
              <th className="py-2.5 px-2.5 text-center w-[110px]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E65A0]" />
                  <span>Loading inventory items...</span>
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                  No products found under this filter criteria.
                </td>
              </tr>
            ) : (
              displayedProducts.map((p, idx) => (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-2.5 text-center text-slate-400 font-mono">
                    {startIndex + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 truncate">
                    <div className="truncate" title={p.product_name}>
                      {p.product_name}
                    </div>
                    {p.product_code && (
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {p.product_code}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2.5 truncate">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate block">
                      {p.category}
                    </span>
                    <span className="text-[11px] text-slate-400 truncate block">{p.brand}</span>
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatBdCurrency(p.product_cost)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                    {formatBdCurrency(p.price)}
                  </td>
                  <td className="py-2.5 px-2.5 text-center font-black text-xs whitespace-nowrap">
                    <span
                      className={
                        p.stock <= 0
                          ? "text-rose-600"
                          : p.stock <= 5
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }
                    >
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        p.status === "out_of_stock"
                          ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800"
                          : p.status === "low_stock"
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                          : "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                      }`}
                    >
                      {p.status === "out_of_stock"
                        ? "Out of Stock"
                        : p.status === "low_stock"
                        ? "Low Stock"
                        : "Healthy"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={products.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 6. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {displayedProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">
                  {p.product_name}
                </span>
                <p className="text-[11px] text-slate-500">
                  {p.category} &bull; {p.brand}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                  p.status === "out_of_stock"
                    ? "bg-rose-100 text-rose-700"
                    : p.status === "low_stock"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {p.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500">
                Stock:{" "}
                <strong
                  className={
                    p.stock <= 0
                      ? "text-rose-600 font-black"
                      : p.stock <= 5
                      ? "text-amber-600 font-black"
                      : "text-emerald-600 font-black"
                  }
                >
                  {p.stock} {p.unit}
                </strong>
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                Price: {formatBdCurrency(p.price)}
              </span>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={products.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      <PrintTableSheet {...reportPayload} />
    </div>
  );
}
