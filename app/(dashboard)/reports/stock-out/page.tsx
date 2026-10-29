"use client";

import { useEffect, useState } from "react";
import {
  PackageX,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Search,
  Printer,
  Plus,
  Loader2,
  Flame,
  Layers,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { Pagination, CustomSelect } from "@/components/ui";
import { CustomDatePicker } from "@/components/ui/date-picker";

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
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      setStartDate(past);
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
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = `/api/reports/stock-out?filter=${activeTab}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
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
  }, [activeTab, search]);

  const startIndex = (currentPage - 1) * pageSize;
  const displayedProducts = products.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center shrink-0">
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/purchases"
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#cbd5e1] dark:border-[#334155]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
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
              <span>Low Stock Warning (≤ 5 pcs)</span>
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
              <TrendingUp className="w-4 h-4 text-emerald-600" />
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
                  Sold: <strong className="text-slate-700 dark:text-slate-200">{fm.total_sold_qty}</strong> pcs
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search product name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Custom Select Filter Dropdown */}
        <div className="w-full md:w-52">
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

      {/* 5. Desktop Critical Inventory Table (Strict Marss Corp Rule: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
              <th className="py-3 px-4 w-12 text-center">SL</th>
              <th className="py-3 px-4">Product Name</th>
              <th className="py-3 px-3">Category & Brand</th>
              <th className="py-3 px-3 text-right">Cost Price (৳)</th>
              <th className="py-3 px-3 text-right">Selling Price (৳)</th>
              <th className="py-3 px-4 text-center">Current Stock</th>
              <th className="py-3 px-4 text-center w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
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
                  <td className="py-3 px-4 text-center text-slate-400 font-mono">
                    {startIndex + idx + 1}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                    <div>{p.product_name}</div>
                    {p.product_code && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Code: {p.product_code}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {p.category}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{p.brand}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-400">
                    {formatBdCurrency(p.product_cost)}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                    {formatBdCurrency(p.price)}
                  </td>
                  <td className="py-3 px-4 text-center font-black text-sm">
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
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                        p.status === "out_of_stock"
                          ? "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-blue-800"
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
    </div>
  );
}
