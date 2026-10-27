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
  Layers,
  Sparkles,
  Printer,
  RotateCcw,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { Pagination } from "@/components/ui";
import {
  POPULAR_TILE_SIZES,
  TILE_GRADES,
  SURFACE_FINISHES,
  formatBoxAndPcs,
} from "@/lib/tiles-calculator";

interface InventoryItem {
  id: number;
  name: string;
  primary_code: string;
  category: string;
  brand: string;
  unit: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  surface_finish?: string | null;
  quantity: number;
  cost_price: number;
  sell_price: number;
  total_cost_value: number;
  total_retail_value: number;
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
  const [selectedTileSize, setSelectedTileSize] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSurfaceFinish, setSelectedSurfaceFinish] = useState<string>("all");

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
      const [invRes, catRes, brandRes] = await Promise.all([
        fetch("/api/inventory"),
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
  }, []);

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

  // Check if selected category is Tiles
  const selectedCatObj = categories.find((c) => String(c.id) === String(selectedCategory));
  const isTilesSelected = Boolean(
    selectedCatObj?.category_name &&
    (selectedCatObj.category_name.toLowerCase().includes("tile") ||
      selectedCatObj.category_name.toLowerCase().includes("টাইল"))
  );

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

  const tileSizeOptions = [
    { value: "all", label: "All Sizes" },
    ...POPULAR_TILE_SIZES.map((s) => ({ value: s.value, label: s.label })),
  ];

  const gradeOptions = [
    { value: "all", label: "All Grades" },
    ...TILE_GRADES.map((g) => ({ value: g.value, label: g.label })),
  ];

  const finishOptions = [
    { value: "all", label: "All Finishes" },
    ...SURFACE_FINISHES.map((f) => ({ value: f, label: f })),
  ];

  const handleCategoryChange = (val: string | number) => {
    setSelectedCategory(String(val));
    setSelectedTileSize("all");
    setSelectedGrade("all");
    setSelectedSurfaceFinish("all");
    setSelectedBrand("all");
    setCurrentPage(1);
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    // Status filter
    if (statusFilter === "low" && !(item.quantity > 0 && item.quantity <= 5)) return false;
    if (statusFilter === "out" && item.quantity > 0) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const match =
        item.name.toLowerCase().includes(q) ||
        (item.primary_code && item.primary_code.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.brand && item.brand.toLowerCase().includes(q));
      if (!match) return false;
    }

    // Category filter
    if (selectedCategory !== "all") {
      const cat = categories.find((c) => String(c.id) === String(selectedCategory));
      if (cat && item.category.toLowerCase() !== (cat.category_name || "").toLowerCase()) {
        return false;
      }
    }

    // Tiles specific sub-filters OR Brand filter
    if (isTilesSelected) {
      if (selectedTileSize !== "all" && item.tile_size !== selectedTileSize) return false;
      if (selectedGrade !== "all" && item.grade !== selectedGrade) return false;
      if (selectedSurfaceFinish !== "all" && item.surface_finish !== selectedSurfaceFinish) return false;
    } else {
      if (selectedBrand !== "all") {
        const br = brands.find((b) => String(b.id) === String(selectedBrand));
        if (br && item.brand.toLowerCase() !== (br.name || "").toLowerCase()) {
          return false;
        }
      }
    }

    return true;
  });

  const hasActiveFilters =
    search !== "" ||
    statusFilter !== "all" ||
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    selectedTileSize !== "all" ||
    selectedGrade !== "all" ||
    selectedSurfaceFinish !== "all";

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedTileSize("all");
    setSelectedGrade("all");
    setSelectedSurfaceFinish("all");
    setCurrentPage(1);
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Print-Only Styles and Dedicated Report Template */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          aside,
          header,
          nav,
          footer,
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 10px !important;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #94a3b8 !important;
            padding: 4px 6px !important;
          }
          .print-table tr {
            page-break-inside: avoid !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. Header & Actions (Screen View) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Stock & Inventory Engine
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Live stock levels, inventory valuation, margin potential, and adjustments
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
                className={`h-[36px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${statusFilter === "low"
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
                className={`h-[36px] px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${statusFilter === "out"
                    ? "bg-rose-600 text-white border-rose-700 shadow-xs"
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
            <Printer className="w-4 h-4 text-rose-600" />
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
              {summary.total_stock_units} <span className="text-xs font-normal">Pcs/Box</span>
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
                ? (
                  (summary.potential_profit / summary.total_cost_valuation) *
                  100
                ).toFixed(1)
                : 0}
              % Markup
            </div>
          </div>
        </div>
      )}

      {/* 3. Controls & Dynamic Filter Bar (Screen View) */}
      <div className="no-print bg-white dark:bg-[#0f172a] p-3 sm:p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] space-y-3">
        <div className="flex flex-col xl:flex-row items-center justify-between gap-3">
          {/* Filters Grid: 2 per row on mobile (grid-cols-2), flex on desktop */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap items-center gap-2 md:gap-2.5 w-full xl:w-auto flex-1">
            {/* Search Bar - 2 cols on mobile */}
            <div className="col-span-2 md:w-64 h-[38px] flex items-center px-3 bg-white dark:bg-slate-800/90 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-600/20 transition-all shadow-xs">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search stock, barcode..."
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

            {/* Conditional Filters: If Tiles category -> Size, Grade, Finish; Otherwise -> Brand */}
            {isTilesSelected ? (
              <>
                {/* Tile Size Filter */}
                <div className="w-full md:w-[135px]">
                  <CustomSelect
                    value={selectedTileSize}
                    onChange={(val) => {
                      setSelectedTileSize(String(val));
                      setCurrentPage(1);
                    }}
                    options={tileSizeOptions}
                    placeholder="All Sizes"
                    className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
                  />
                </div>

                {/* Tile Grade Filter */}
                <div className="w-full md:w-[130px]">
                  <CustomSelect
                    value={selectedGrade}
                    onChange={(val) => {
                      setSelectedGrade(String(val));
                      setCurrentPage(1);
                    }}
                    options={gradeOptions}
                    placeholder="All Grades"
                    className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
                  />
                </div>

                {/* Tile Surface Finish Filter */}
                <div className="w-full md:w-[140px]">
                  <CustomSelect
                    value={selectedSurfaceFinish}
                    onChange={(val) => {
                      setSelectedSurfaceFinish(String(val));
                      setCurrentPage(1);
                    }}
                    options={finishOptions}
                    placeholder="All Finishes"
                    className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
                  />
                </div>
              </>
            ) : (
              /* Brand Filter (shown when NOT Tiles category) */
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
            )}

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                title="Reset All Filters"
                className="h-[38px] px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs col-span-2 md:col-span-1"
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
                minPopoverWidth={125}
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Desktop Table (Screen View) */}
      <div className="no-print hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Product Name / Variant</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Category & Brand</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-3 text-right">Cost (৳)</th>
                <th className="py-3 px-3 text-right">Sell (৳)</th>
                <th className="py-3 px-3 text-right">Total Cost Value</th>
                <th className="py-3 px-4 text-center w-24">Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    <span>Loading inventory status...</span>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                    No items matching filter.
                  </td>
                </tr>
              ) : (
                displayedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        {item.name}
                      </div>
                      {(item.tile_size || item.sqft_per_box || item.grade || item.surface_finish) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          {item.tile_size && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                              📐 {item.tile_size}
                            </span>
                          )}
                          {item.sqft_per_box && (
                            <span className="text-[9px] font-medium text-slate-500">
                              📦 {item.sqft_per_box} Sft/Box {item.pcs_per_box ? `(${item.pcs_per_box} pcs)` : ""}
                            </span>
                          )}
                          {item.grade && (
                            <span className="text-[9px] font-bold text-emerald-600">
                              ★ {item.grade}
                            </span>
                          )}
                          {item.surface_finish && (
                            <span className="text-[9px] font-bold text-purple-600">
                              ✨ {item.surface_finish}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {item.primary_code || "—"}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.category}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.brand}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${item.quantity <= 0
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            : item.quantity <= 5
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                          }`}
                      >
                        {item.tile_size || item.pcs_per_box
                          ? formatBoxAndPcs(item.quantity, item.pcs_per_box)
                          : `${item.quantity} ${item.unit}`}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600 dark:text-slate-300">
                      {item.cost_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                      {item.sell_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-sky-700 dark:text-sky-400">
                      {formatBdCurrency(item.total_cost_value)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenAdjust(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1 mx-auto transition-colors cursor-pointer"
                        title="Adjust Stock Quantity"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-emerald-600" />
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
                  className={`px-2 py-0.5 rounded text-[10px] font-black ${item.quantity <= 0
                      ? "bg-rose-100 text-rose-700"
                      : item.quantity <= 5
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                >
                  {item.tile_size || item.pcs_per_box
                    ? formatBoxAndPcs(item.quantity, item.pcs_per_box)
                    : `${item.quantity} ${item.unit}`}
                </span>
              </div>

              {(item.tile_size || item.grade || item.surface_finish) && (
                <div className="flex flex-wrap items-center gap-1">
                  {item.tile_size && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">
                      📐 {item.tile_size}
                    </span>
                  )}
                  {item.grade && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                      ★ {item.grade}
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
                className="w-full h-[32px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer"
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
            <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Adjust Stock Quantity
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
                <div className="flex justify-between text-slate-500">
                  <span>Current Registered Stock:</span>
                  <strong className="font-bold text-emerald-600">
                    {selectedItem.tile_size || selectedItem.pcs_per_box
                      ? formatBoxAndPcs(selectedItem.quantity, selectedItem.pcs_per_box)
                      : `${selectedItem.quantity} ${selectedItem.unit}`}
                  </strong>
                </div>
              </div>

              {/* New Quantity */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  New Physical Stock Quantity <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-emerald-600 text-base focus:outline-none focus:ring-2 focus:ring-rose-600"
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
                    { value: "Damaged / Broken", label: "Damaged / Broken Goods" },
                    { value: "Customer Return", label: "Customer Return / Cancellation" },
                    { value: "Supplier Replacement", label: "Supplier Replacement" },
                    { value: "Showroom Display / Sample", label: "Showroom Display / Sample" },
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
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {adjusting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Stock Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DEDICATED PRINT-ONLY REPORT TEMPLATE */}
      <div className="print-only p-2 text-black bg-white">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 pb-2 mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 m-0">RUNA TRADERS</h1>
              <p className="text-[11px] text-slate-600 font-medium m-0">
                Tiles, Sanitary & Bath Fitting Wholesale & Retail
              </p>
              <h2 className="text-xs font-bold text-slate-800 mt-1 uppercase tracking-wider">
                Stock Inventory & Valuation Report
              </h2>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <p>Printed: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
              <p>Filter Status: <strong className="text-slate-900">{statusFilter === "all" ? "All Items" : statusFilter === "low" ? "Low Stock" : "Out of Stock"}</strong></p>
              <p>SKUs Listed: <strong className="text-slate-900">{filteredItems.length}</strong></p>
            </div>
          </div>

          {/* Quick Valuation Summary Bar */}
          <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-300 text-[10px]">
            <div className="p-1 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-500 block">Total SKUs</span>
              <strong className="text-slate-900 text-[11px]">{filteredItems.length}</strong>
            </div>
            <div className="p-1 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-500 block">Total Stock Cost Value</span>
              <strong className="text-slate-900 text-[11px]">
                {formatBdCurrency(filteredItems.reduce((acc, i) => acc + i.total_cost_value, 0))}
              </strong>
            </div>
            <div className="p-1 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-500 block">Total Retail Value</span>
              <strong className="text-slate-900 text-[11px]">
                {formatBdCurrency(filteredItems.reduce((acc, i) => acc + i.total_retail_value, 0))}
              </strong>
            </div>
            <div className="p-1 bg-slate-100 rounded border border-slate-300">
              <span className="text-slate-500 block">Potential Margin</span>
              <strong className="text-slate-900 text-[11px]">
                {formatBdCurrency(
                  Math.max(
                    0,
                    filteredItems.reduce((acc, i) => acc + i.total_retail_value, 0) -
                    filteredItems.reduce((acc, i) => acc + i.total_cost_value, 0)
                  )
                )}
              </strong>
            </div>
          </div>
        </div>

        {/* Printable Table */}
        <table className="print-table">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold text-left">
              <th className="text-center w-8">SL</th>
              <th>Product Name & Specification</th>
              <th>Barcode</th>
              <th>Category</th>
              <th>Brand</th>
              <th className="text-center">Stock Level</th>
              <th className="text-right">Cost (৳)</th>
              <th className="text-right">Sell (৳)</th>
              <th className="text-right">Cost Value (৳)</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item, idx) => (
              <tr key={item.id} className="text-slate-800">
                <td className="text-center font-bold">{idx + 1}</td>
                <td>
                  <div className="font-bold">{item.name}</div>
                  {(item.tile_size || item.grade || item.surface_finish) && (
                    <div className="text-[9px] text-slate-500">
                      {[
                        item.tile_size ? `Size: ${item.tile_size}` : null,
                        item.grade ? `Grade: ${item.grade}` : null,
                        item.surface_finish ? `Finish: ${item.surface_finish}` : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}
                </td>
                <td className="font-mono text-[9px]">{item.primary_code || "—"}</td>
                <td>{item.category}</td>
                <td>{item.brand}</td>
                <td className="text-center font-bold">
                  {item.tile_size || item.pcs_per_box
                    ? formatBoxAndPcs(item.quantity, item.pcs_per_box)
                    : `${item.quantity} ${item.unit}`}
                </td>
                <td className="text-right">{item.cost_price.toFixed(2)}</td>
                <td className="text-right">{item.sell_price.toFixed(2)}</td>
                <td className="text-right font-bold">{formatBdCurrency(item.total_cost_value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
              <td colSpan={5} className="text-right py-1.5 px-2">Total Inventory Valuation:</td>
              <td className="text-center py-1.5 px-2">
                {filteredItems.reduce((acc, i) => acc + i.quantity, 0)} Units
              </td>
              <td></td>
              <td></td>
              <td className="text-right py-1.5 px-2 font-black">
                {formatBdCurrency(filteredItems.reduce((acc, i) => acc + i.total_cost_value, 0))}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Signatures */}
        <div className="flex justify-between items-end mt-12 pt-8 text-[11px] text-slate-600">
          <div className="text-center">
            <div className="w-40 border-t border-slate-400 mb-1"></div>
            <span>Prepared By</span>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-slate-400 mb-1"></div>
            <span>Store Manager</span>
          </div>
          <div className="text-center">
            <div className="w-40 border-t border-slate-400 mb-1"></div>
            <span>Authorized Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}
