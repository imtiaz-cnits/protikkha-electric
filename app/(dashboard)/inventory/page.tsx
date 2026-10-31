"use client";

import { useEffect, useState } from "react";
import {
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Boxes,
  SlidersHorizontal,
  Edit2,
  X,
  Loader2,
  Printer,
  RotateCcw,
  Zap,
  Tag,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { Pagination } from "@/components/ui";
import { formatElectricalQty } from "@/lib/electrical-unit-service";
import { PrintTableSheet } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";

interface InventoryItem {
  id: number;
  name: string;
  primary_code: string;
  category: string;
  brand: string;
  unit: string;
  quantity: number;
  reserved_quantity?: number;
  available_quantity?: number;
  cost_price: number;
  sell_price: number;
  total_cost_value: number;
  total_retail_value: number;
  spec_type?: string | null;
  cable_size?: string | null;
  current_rating?: string | null;
  voltage_grade?: string | null;
  wattage?: string | null;
  gang_module?: string | null;
  packaging_unit?: string | null;
  conversion_ratio?: number | null;
  packaging_summary?: string | null;
  stock_status: "In Stock" | "Low Stock" | "Out of Stock";
}

interface Summary {
  total_products: number;
  total_stock_units: number;
  total_cost_valuation: number;
  total_retail_valuation: number;
  potential_profit: number;
  low_stock_count: number;
  out_of_stock_count: number;
}

interface OptionItem {
  id: number;
  name?: string;
  category_name?: string;
}

const SPEC_TYPE_OPTIONS = [
  { value: "all", label: "All Spec Types" },
  { value: "CABLE", label: "⚡ Wires & Cables" },
  { value: "BREAKER", label: "⚡ Circuit Breakers" },
  { value: "SWITCH", label: "🔌 Switches & Sockets" },
  { value: "LIGHTING", label: "💡 LED & Lighting" },
  { value: "CONDUIT", label: "📐 Conduits & Pipes" },
  { value: "GENERAL", label: "📦 General Accessories" },
];

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "low" | "out">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedSpecType, setSelectedSpecType] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Stock Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newQty, setNewQty] = useState("");
  const [adjustReason, setAdjustReason] = useState("Physical Recount");
  const [adjusting, setAdjusting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSpecType !== "all") params.set("spec_type", selectedSpecType);

      const [invRes, catRes, brandRes] = await Promise.all([
        fetch(`/api/inventory?${params.toString()}`),
        fetch("/api/categories"),
        fetch("/api/brands"),
      ]);
      const [invData, catData, brandData] = await Promise.all([
        invRes.json(),
        catRes.json(),
        brandRes.json(),
      ]);

      if (invData.status === "success") {
        setItems(invData.data || []);
        setSummary(invData.summary || null);
      }
      if (catData.status === "success") setCategories(catData.data || []);
      if (brandData.status === "success") setBrands(brandData.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSpecType]);

  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewQty(String(item.quantity));
    setAdjustReason("Physical Recount");
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || newQty === "") return;

    try {
      setAdjusting(true);
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedItem.id,
          new_quantity: parseFloat(newQty),
          reason: adjustReason,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsAdjustModalOpen(false);
        setSelectedItem(null);
        setCurrentPage(1);
        loadData();
      } else {
        alert(data.message || "Failed to adjust stock");
      }
    } catch {
      alert("Communication error");
    } finally {
      setAdjusting(false);
    }
  };

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    ...categories.map((c) => ({
      value: String(c.id),
      label: c.category_name || "",
    })),
  ];

  const brandOptions = [
    { value: "all", label: "All Brands" },
    ...brands.map((b) => ({
      value: String(b.id),
      label: b.name || "",
    })),
  ];

  const handleCategoryChange = (val: string | number) => {
    setSelectedCategory(String(val));
    setSelectedBrand("all");
    setCurrentPage(1);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    // Status filter
    if (statusFilter === "low" && !(item.quantity > 0 && item.quantity <= 10)) return false;
    if (statusFilter === "out" && item.quantity > 0) return false;

    // Spec type filter
    if (selectedSpecType !== "all") {
      if ((item.spec_type || "GENERAL").toUpperCase() !== selectedSpecType.toUpperCase()) {
        return false;
      }
    }

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        (item.primary_code && item.primary_code.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.cable_size && item.cable_size.toLowerCase().includes(q)) ||
        (item.current_rating && item.current_rating.toLowerCase().includes(q)) ||
        (item.wattage && item.wattage.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Category filter
    if (selectedCategory !== "all") {
      const cat = categories.find((c) => String(c.id) === String(selectedCategory));
      if (cat && item.category.toLowerCase() !== (cat.category_name || "").toLowerCase()) {
        return false;
      }
    }

    // Brand filter
    if (selectedBrand !== "all") {
      const br = brands.find((b) => String(b.id) === String(selectedBrand));
      if (br && item.brand.toLowerCase() !== (br.name || "").toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    selectedSpecType !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedSpecType("all");
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  const totalFilteredCostValue = filteredItems.reduce((acc, i) => acc + i.total_cost_value, 0);
  const totalFilteredRetailValue = filteredItems.reduce((acc, i) => acc + i.total_retail_value, 0);

  const printPayload: PrintReportPayload = {
    title: "Stock Inventory & Valuation Report",
    subtitle: "Live stock levels, electrical packaging units, and inventory valuation",
    filename: `stock_inventory_${new Date().toISOString().slice(0, 10)}`,
    metaItems: [
      {
        label: "Stock Filter",
        value:
          statusFilter === "all"
            ? "All Stock"
            : statusFilter === "low"
              ? "Low Stock"
              : "Out of Stock",
      },
      { label: "SKUs Listed", value: String(filteredItems.length) },
      { label: "Total Cost Value", value: formatBdCurrency(totalFilteredCostValue) },
      { label: "Total Retail Value", value: formatBdCurrency(totalFilteredRetailValue) },
    ],
    columns: [
      { header: "SL", align: "center", width: "36px" },
      { header: "Product Name & Spec", align: "left", width: "26%" },
      { header: "Barcode", align: "left", width: "13%" },
      { header: "Category & Brand", align: "left", width: "16%" },
      { header: "Stock Level", align: "center", width: "12%" },
      { header: "Cost (৳)", align: "right", width: "10%" },
      { header: "Sell (৳)", align: "right", width: "10%" },
      { header: "Cost Value (৳)", align: "right", width: "13%" },
    ],
    rows: filteredItems.map((item, idx) => {
      const specLine = [
        item.cable_size ? `Size: ${item.cable_size}` : null,
        item.current_rating ? `Rating: ${item.current_rating}` : null,
        item.wattage ? `Wattage: ${item.wattage}` : null,
        item.gang_module ? `Module: ${item.gang_module}` : null,
        item.voltage_grade ? `Voltage: ${item.voltage_grade}` : null,
      ]
        .filter(Boolean)
        .join(" • ");

      return [
        { text: String(idx + 1), align: "center", bold: true, color: "muted" },
        {
          text: item.name,
          subText: specLine || undefined,
          bold: true,
        },
        { text: item.primary_code || "—", mono: true, color: "muted" },
        { text: item.category || "—", subText: item.brand || undefined },
        {
          text: item.packaging_summary || formatElectricalQty(item.quantity, { unit: item.unit }),
          align: "center",
          bold: true,
          color: item.quantity <= 0 ? "rose" : item.quantity <= 10 ? "amber" : "navy",
        },
        { text: formatBdCurrency(item.cost_price), align: "right", mono: true },
        { text: formatBdCurrency(item.sell_price), align: "right", mono: true, bold: true },
        { text: formatBdCurrency(item.total_cost_value), align: "right", mono: true, bold: true, color: "navy" },
      ];
    }),
    totalRow: [
      "",
      { text: "Total Inventory Valuation", bold: true },
      "",
      "",
      { text: `${filteredItems.length} SKUs`, align: "center", bold: true },
      "",
      "",
      { text: formatBdCurrency(totalFilteredCostValue), align: "right", mono: true, bold: true, color: "navy" },
    ],
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions (Screen View) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Stock &amp; Inventory Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Live stock levels, electrical packaging units, inventory valuation, and adjustments
            </p>
          </div>
        </div>

        {/* Header Right Actions: Status Pills & Print Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {summary && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter(statusFilter === "low" ? "all" : "low");
                  setCurrentPage(1);
                }}
                className={`h-[36px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "low"
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/40 hover:bg-amber-100"
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Low Stock:</span>
                <span className="font-black">{summary.low_stock_count}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusFilter(statusFilter === "out" ? "all" : "out");
                  setCurrentPage(1);
                }}
                className={`h-[36px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === "out"
                    ? "bg-rose-600 text-white border-red-700 shadow-xs"
                    : "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900/40 hover:bg-rose-100"
                }`}
              >
                <span>Out of Stock:</span>
                <span className="font-black">{summary.out_of_stock_count}</span>
              </button>
            </>
          )}

          {/* Print Button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="h-[36px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Print Stock Overview"
          >
            <Printer className="w-4 h-4 text-[#1E65A0]" />
            <span>Print Overview</span>
          </button>
        </div>
      </div>

      {/* 2. Valuation KPI Cards (Screen View) */}
      {summary && (
        <div className="no-print grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Stock Units */}
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Total Units in Stock</span>
              <Boxes className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {summary.total_stock_units.toLocaleString()}{" "}
              <span className="text-xs font-normal">Base Units</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Across {summary.total_products} unique SKUs
            </div>
          </div>

          {/* Cost Valuation */}
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Stock Cost Value</span>
              <DollarSign className="w-4 h-4 text-sky-600" />
            </div>
            <div className="text-xl font-black text-sky-700 dark:text-sky-400 mt-1">
              {formatBdCurrency(summary.total_cost_valuation)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total capital invested</div>
          </div>

          {/* Retail Valuation */}
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Retail Selling Value</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {formatBdCurrency(summary.total_retail_valuation)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Expected sales revenue</div>
          </div>

          {/* Potential Gross Profit */}
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Potential Margin</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-1">
              {formatBdCurrency(summary.potential_profit)}
            </div>
            <div className="text-[11px] text-emerald-600 font-bold mt-0.5">
              +
              {summary.total_cost_valuation > 0
                ? ((summary.potential_profit / summary.total_cost_valuation) * 100).toFixed(1)
                : 0}
              % Markup
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Dynamic Filter Bar (Screen View) */}
      <div className="no-print bg-white dark:bg-[#0f172a] p-3 sm:p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] space-y-3">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Filters Grid */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-2.5 w-full xl:w-auto flex-1">
            {/* Search Bar */}
            <div className="col-span-2 md:w-64 h-[38px] flex items-center px-3 bg-white dark:bg-slate-800/90 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus-within:border-[#1E65A0] focus-within:ring-2 focus-within:ring-blue-600/20 transition-all shadow-xs">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search stock, spec, barcode..."
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Spec Type Filter */}
            <div className="w-full md:w-[170px]">
              <CustomSelect
                value={selectedSpecType}
                onChange={(val) => {
                  setSelectedSpecType(String(val));
                  setCurrentPage(1);
                }}
                options={SPEC_TYPE_OPTIONS}
                placeholder="All Spec Types"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

            {/* Category Filter */}
            <div className="w-full md:w-[150px]">
              <CustomSelect
                value={selectedCategory}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="All Categories"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

            {/* Brand Filter */}
            <div className="w-full md:w-[150px]">
              <CustomSelect
                value={selectedBrand}
                onChange={(val) => {
                  setSelectedBrand(String(val));
                  setCurrentPage(1);
                }}
                options={brandOptions}
                placeholder="All Brands"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset All Filters"
                className="h-[38px] px-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/40 text-[#1E65A0] dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs col-span-2 md:col-span-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right Side: Show Entries Selector */}
          <div className="flex items-center gap-2.5 self-start xl:self-auto shrink-0 w-full md:w-auto">
            <div className="w-[125px]">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: "20", label: "Show: 20" },
                  { value: "50", label: "Show: 50" },
                  { value: "100", label: "Show: 100" },
                  { value: "200", label: "Show: 200" },
                  { value: "500", label: "Show: 500" },
                ]}
                matchTriggerWidth={true}
                searchThreshold={99}
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Desktop Table (Compact Full-Screen View — Zero Horizontal Scrollbar) */}
      <div className="no-print hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div>
          <table className="w-full text-left text-xs border-collapse table-auto">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white text-[10.5px] uppercase tracking-wider font-bold whitespace-nowrap">
                <th className="py-2.5 px-2 text-center w-10">SL</th>
                <th className="py-2.5 px-2.5">Product, Barcode &amp; Specs</th>
                <th className="py-2.5 px-2.5">Category &amp; Brand</th>
                <th className="py-2.5 px-2.5 text-center">Stock</th>
                <th className="py-2.5 px-2.5 text-right">Cost (৳)</th>
                <th className="py-2.5 px-2.5 text-right">Sell (৳)</th>
                <th className="py-2.5 px-2.5 text-right">Stock Value</th>
                <th className="py-2.5 px-2.5 text-center w-20">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E65A0]" />
                    <span>Loading inventory status...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                    No items matching filter.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-2 px-2 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-2 px-2.5 max-w-[300px]">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="flex flex-wrap items-center gap-1 mt-0.5">
                        {item.primary_code && (
                          <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.primary_code}
                          </span>
                        )}
                        {item.cable_size && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            ⚡ {item.cable_size}
                          </span>
                        )}
                        {item.current_rating && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                            ⚡ {item.current_rating}
                          </span>
                        )}
                        {item.wattage && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            💡 {item.wattage}
                          </span>
                        )}
                        {item.gang_module && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                            🔌 {item.gang_module}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 max-w-[155px]">
                      <div className="font-semibold text-slate-700 dark:text-slate-200 truncate" title={item.category}>
                        {item.category}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.brand}</div>
                    </td>
                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                          item.quantity <= 0
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : item.quantity <= 10
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        }`}
                      >
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {item.cost_price.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {item.sell_price.toFixed(2)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-black text-[#0B3D91] dark:text-sky-400 whitespace-nowrap">
                      {formatBdCurrency(item.total_cost_value)}
                    </td>
                    <td className="py-2 px-2.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(item)}
                        className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0B3D91] dark:text-blue-300 border border-blue-200 dark:border-slate-700 font-bold text-[11px] inline-flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        title="Adjust Stock Quantity"
                      >
                        <Edit2 className="w-3 h-3 text-[#1E65A0]" />
                        <span>Adjust</span>
                      </button>
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
          totalItems={filteredItems.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Card View (Screen View) */}
      <div className="no-print block md:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading inventory status...</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No items matching filter.</div>
        ) : (
          displayedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">{item.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    {item.category} &bull; {item.brand} &bull; Code: {item.primary_code || "N/A"}
                  </p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    item.quantity <= 0
                      ? "bg-rose-100 text-rose-700"
                      : item.quantity <= 10
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {item.packaging_summary || `${item.quantity} ${item.unit}`}
                </span>
              </div>

              {(item.cable_size || item.current_rating || item.wattage || item.gang_module) && (
                <div className="flex flex-wrap items-center gap-1">
                  {item.cable_size && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800">
                      ⚡ {item.cable_size}
                    </span>
                  )}
                  {item.current_rating && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                      ⚡ {item.current_rating}
                    </span>
                  )}
                  {item.wattage && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      💡 {item.wattage}
                    </span>
                  )}
                  {item.gang_module && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">
                      🔌 {item.gang_module}
                    </span>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Cost / Sell:</span>
                  <span className="font-bold">
                    ৳{item.cost_price} / ৳{item.sell_price}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Value:</span>
                  <span className="font-black text-sky-700 dark:text-sky-400">
                    {formatBdCurrency(item.total_cost_value)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAdjust(item)}
                className="w-full h-[32px] rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Adjust Stock Qty</span>
              </button>
            </div>
          ))
        )}

        {/* Mobile Pagination */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
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

      {/* 6. STOCK ADJUSTMENT MODAL (Screen View) */}
      {isAdjustModalOpen && selectedItem && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Adjust Electrical Stock Quantity
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {/* Product Info */}
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] space-y-1 text-xs">
                <div className="font-bold text-slate-800 dark:text-white text-xs">
                  {selectedItem.name}
                </div>
                {(selectedItem.cable_size || selectedItem.current_rating || selectedItem.wattage) && (
                  <div className="text-[11px] text-slate-500">
                    Spec: {selectedItem.cable_size || selectedItem.current_rating || selectedItem.wattage}
                  </div>
                )}
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Current Registered Stock:</span>
                  <strong className="font-bold text-emerald-600">
                    {selectedItem.packaging_summary || `${selectedItem.quantity} ${selectedItem.unit}`}
                  </strong>
                </div>
              </div>

              {/* New Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Physical Base Quantity ({selectedItem.unit}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-emerald-600 text-base focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Reason */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Adjustment Reason
                </label>
                <CustomSelect
                  value={adjustReason}
                  onChange={(val) => setAdjustReason(String(val))}
                  options={[
                    { value: "Physical Recount", label: "Physical Inventory Recount" },
                    { value: "Scrap / Offcut Loss (Cable Cut-Loss)", label: "Scrap / Offcut Loss (Cable Cut-Loss)" },
                    { value: "Damaged / Broken Goods", label: "Damaged / Broken / Defective Goods" },
                    { value: "Customer Return", label: "Customer Return / Restock" },
                    { value: "Supplier Replacement", label: "Supplier Replacement / Exchange" },
                    { value: "Showroom Display / Sample", label: "Showroom Display / Demonstration Board" },
                  ]}
                  placeholder="Select Reason"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  disabled={adjusting}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {adjusting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Stock Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Clean Print-Only Sheet (Details + Multi-Page Table) */}
      <PrintTableSheet {...printPayload} />
    </div>
  );
}
