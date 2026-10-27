"use client";

import { useState, useEffect } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Printer,
  FileSpreadsheet,
  Copy,
  Boxes,
  Barcode,
  Layers,
  Sparkles,
  RotateCcw,
  Eye,
  Percent,
} from "lucide-react";
import {
  POPULAR_TILE_SIZES,
  TILE_GRADES,
  SURFACE_FINISHES,
  autoCalculateSqftPerBox,
  formatBoxAndPcs,
} from "@/lib/tiles-calculator";
import { CustomSelect, Pagination, DeleteConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface ProductItem {
  id: number;
  name: string;
  product_name: string;
  primary_code: string;
  display_codes: string;
  all_codes: string[];
  cost_price: number;
  sell_price: number;
  quantity: number;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  surface_finish?: string | null;
  status: string;
  category: string;
  brand: string;
  unit: string;
  brand_id: number;
  category_id: number;
  unit_id?: number | null;
}

interface OptionItem {
  id: number;
  name?: string;
  category_name?: string;
  unit_name?: string;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [units, setUnits] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("all");
  const [selectedUnit, setSelectedUnit] = useState<string>("all");
  const [selectedTileSize, setSelectedTileSize] = useState<string>("all");
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSurfaceFinish, setSelectedSurfaceFinish] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Custom Delete Modal State
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Price Update Modal State
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkBrandId, setBulkBrandId] = useState<string>("all");
  const [bulkPercentage, setBulkPercentage] = useState<string>("");
  const [bulkTargetField, setBulkTargetField] = useState<"sell_price" | "cost_price" | "both">("sell_price");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    product_name: "",
    product_code: "",
    cost_price: "",
    sell_price: "",
    quantity: "0",
    tile_size: "",
    sqft_per_box: "",
    pcs_per_box: "",
    grade: "",
    surface_finish: "",
    brand_id: "",
    category_id: "",
    unit_id: "",
    status: "active",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, catRes, brandRes, unitRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/brands"),
        fetch("/api/units"),
      ]);

      const [prods, cats, brs, unts] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        brandRes.json(),
        unitRes.json(),
      ]);

      if (prods.status === "success") setProducts(prods.data || []);
      if (cats.status === "success") setCategories(cats.data || []);
      if (brs.status === "success") setBrands(brs.data || []);
      if (unts.status === "success") setUnits(unts.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleOpenCreate() {
    setEditingProduct(null);
    setFormData({
      product_name: "",
      product_code: "",
      cost_price: "",
      sell_price: "",
      quantity: "0",
      tile_size: "",
      sqft_per_box: "",
      pcs_per_box: "",
      grade: "",
      surface_finish: "",
      brand_id: brands[0]?.id ? String(brands[0].id) : "",
      category_id: categories[0]?.id ? String(categories[0].id) : "",
      unit_id: units[0]?.id ? String(units[0].id) : "",
      status: "active",
    });
    setError("");
    setModalOpen(true);
  }

  function handleOpenEdit(p: ProductItem) {
    setEditingProduct(p);
    setFormData({
      product_name: p.product_name,
      product_code: p.all_codes.join(", "),
      cost_price: String(p.cost_price),
      sell_price: String(p.sell_price),
      quantity: String(p.quantity),
      tile_size: p.tile_size || "",
      sqft_per_box: p.sqft_per_box ? String(p.sqft_per_box) : "",
      pcs_per_box: p.pcs_per_box ? String(p.pcs_per_box) : "",
      grade: p.grade || "",
      surface_finish: p.surface_finish || "",
      brand_id: String(p.brand_id),
      category_id: String(p.category_id),
      unit_id: p.unit_id ? String(p.unit_id) : "",
      status: p.status,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const parsedCodes = formData.product_code
        ? formData.product_code.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

      const selectedCat = categories.find((c) => String(c.id) === String(formData.category_id));
      const isTile = Boolean(
        selectedCat?.category_name &&
        (selectedCat.category_name.toLowerCase().includes("tile") ||
          selectedCat.category_name.toLowerCase().includes("টাইল"))
      );

      const payload = {
        ...formData,
        product_code: parsedCodes,
        cost_price: Number(formData.cost_price || 0),
        sell_price: Number(formData.sell_price || 0),
        quantity: Number(formData.quantity || 0),
        brand_id: Number(formData.brand_id),
        category_id: Number(formData.category_id),
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        tile_size: isTile ? (formData.tile_size || null) : null,
        sqft_per_box: isTile ? (formData.sqft_per_box || null) : null,
        pcs_per_box: isTile ? (formData.pcs_per_box || null) : null,
        grade: isTile ? (formData.grade || null) : null,
        surface_finish: isTile ? (formData.surface_finish || null) : null,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setError(data.message || "Failed to save product");
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      toast.success(
        editingProduct ? "Product updated successfully!" : "Product created successfully!"
      );
      // Post-Creation Reset Rule: Reset pagination & refresh
      setCurrentPage(1);
      loadData();
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Product deleted successfully!");
        setProductToDelete(null);
        setCurrentPage(1);
        loadData();
      } else {
        toast.error(data.message || "Failed to delete product");
        throw new Error(data.message || "Failed to delete product");
      }
    } finally {
      setDeleting(false);
    }
  }

  // Filter products for bulk price update modal
  const bulkMatchingProducts = products.filter((p) => {
    if (bulkBrandId === "all") return true;
    return String(p.brand_id) === String(bulkBrandId);
  });

  // When bulkBrandId changes, select all matching products by default
  useEffect(() => {
    if (bulkModalOpen) {
      if (bulkBrandId === "all") {
        setBulkSelectedIds(new Set(products.map((p) => p.id)));
      } else {
        setBulkSelectedIds(
          new Set(
            products.filter((p) => String(p.brand_id) === String(bulkBrandId)).map((p) => p.id)
          )
        );
      }
    }
  }, [bulkBrandId, bulkModalOpen, products]);

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct === 0) {
      toast.error("Please enter a valid non-zero percentage");
      return;
    }
    if (bulkSelectedIds.size === 0) {
      toast.error("Please select at least one product to update");
      return;
    }

    setBulkSubmitting(true);
    try {
      const res = await fetch("/api/products/bulk-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_ids: Array.from(bulkSelectedIds),
          percentage: pct,
          target_field: bulkTargetField,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(data.message || "Bulk prices updated successfully!");
        setBulkModalOpen(false);
        setBulkPercentage("");
        setBulkSelectedIds(new Set());
        loadData();
      } else {
        toast.error(data.message || "Failed to bulk update prices");
      }
    } catch (err: any) {
      toast.error(err?.message || "Communication error");
    } finally {
      setBulkSubmitting(false);
    }
  };

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
      label: c.category_name || `Category #${c.id}`,
    })),
  ];

  const brandOptions = [
    { value: "all", label: "All Brands" },
    ...brands.map((b) => ({
      value: String(b.id),
      label: b.name || `Brand #${b.id}`,
    })),
  ];

  // Tile-specific filter options: gathered from DB products + standard constants
  const dbTileSizes = new Set(
    products
      .filter((p) => Boolean(p.tile_size && p.tile_size.trim()))
      .map((p) => p.tile_size!.trim())
  );
  const sortedTileSizes = [
    ...Array.from(dbTileSizes),
    ...POPULAR_TILE_SIZES.map((s) => s.value).filter((s) => !dbTileSizes.has(s)),
  ];
  const tileSizeOptions = [
    { value: "all", label: "All Sizes" },
    ...sortedTileSizes.map((s) => ({ value: s, label: s })),
  ];

  const dbGrades = new Set(
    products
      .filter((p) => Boolean(p.grade && p.grade.trim()))
      .map((p) => p.grade!.trim())
  );
  const sortedGrades = [
    ...Array.from(dbGrades),
    ...TILE_GRADES.map((g) => g.value).filter((g) => !dbGrades.has(g)),
  ];
  const gradeOptions = [
    { value: "all", label: "All Grades" },
    ...sortedGrades.map((g) => ({ value: g, label: g })),
  ];

  const dbFinishes = new Set(
    products
      .filter((p) => Boolean(p.surface_finish && p.surface_finish.trim()))
      .map((p) => p.surface_finish!.trim())
  );
  const sortedFinishes = [
    ...Array.from(dbFinishes),
    ...SURFACE_FINISHES.filter((f) => !dbFinishes.has(f)),
  ];
  const finishOptions = [
    { value: "all", label: "All Finishes" },
    ...sortedFinishes.map((f) => ({ value: f, label: f })),
  ];

  const stockStatusOptions = [
    { value: "all", label: "All Stock Status" },
    { value: "in_stock", label: "In Stock (> 0)" },
    { value: "low_stock", label: "Low Stock (≤ 5)" },
    { value: "out_of_stock", label: "Out of Stock (0)" },
  ];

  const unitOptions = [
    { value: "all", label: "All Units" },
    ...units.map((u) => ({
      value: String(u.id),
      label: u.unit_name || `Unit #${u.id}`,
    })),
  ];

  const hasActiveFilters =
    search.trim() !== "" ||
    selectedCategory !== "all" ||
    (isTilesSelected ? (
      selectedTileSize !== "all" ||
      selectedGrade !== "all" ||
      selectedSurfaceFinish !== "all"
    ) : (
      selectedBrand !== "all"
    )) ||
    selectedStockStatus !== "all" ||
    selectedUnit !== "all";

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedBrand("all");
    setSelectedTileSize("all");
    setSelectedGrade("all");
    setSelectedSurfaceFinish("all");
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedStockStatus("all");
    setSelectedUnit("all");
    setSelectedTileSize("all");
    setSelectedGrade("all");
    setSelectedSurfaceFinish("all");
    setCurrentPage(1);
  };

  const filteredProducts = products.filter((p) => {
    // 1. Text Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchSearch =
        p.product_name.toLowerCase().includes(q) ||
        p.display_codes.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.tile_size && p.tile_size.toLowerCase().includes(q)) ||
        (p.grade && p.grade.toLowerCase().includes(q)) ||
        (p.surface_finish && p.surface_finish.toLowerCase().includes(q));
      if (!matchSearch) return false;
    }

    // 2. Category Filter
    if (selectedCategory !== "all") {
      if (String(p.category_id) !== String(selectedCategory)) {
        return false;
      }
    }

    // 3. Conditional Tile / Non-Tile Filters
    if (isTilesSelected) {
      // Tile Size
      if (selectedTileSize !== "all") {
        if (!p.tile_size || p.tile_size.toLowerCase() !== selectedTileSize.toLowerCase()) {
          return false;
        }
      }

      // Grade
      if (selectedGrade !== "all") {
        if (!p.grade || p.grade.toLowerCase() !== selectedGrade.toLowerCase()) {
          return false;
        }
      }

      // Surface Finish
      if (selectedSurfaceFinish !== "all") {
        if (!p.surface_finish || p.surface_finish.toLowerCase() !== selectedSurfaceFinish.toLowerCase()) {
          return false;
        }
      }
    } else {
      // Non-tiles: Brand Filter
      if (selectedBrand !== "all") {
        if (String(p.brand_id) !== String(selectedBrand)) {
          return false;
        }
      }
    }

    // 4. Stock Status Filter (applies to both)
    if (selectedStockStatus !== "all") {
      const qty = Number(p.quantity || 0);
      if (selectedStockStatus === "in_stock" && qty <= 0) return false;
      if (selectedStockStatus === "low_stock" && (qty <= 0 || qty > 5)) return false;
      if (selectedStockStatus === "out_of_stock" && qty > 0) return false;
    }

    // 5. Unit Filter (applies to both)
    if (selectedUnit !== "all") {
      if (String(p.unit_id) !== String(selectedUnit)) {
        return false;
      }
    }

    return true;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const displayedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Print-Only Styles and Dedicated Report Template */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10px !important;
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

      {/* Top Header & Export Controls (Rule 5.1 & 5.2) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-slate-800 shadow-xs shrink-0">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none m-0 p-0">
              Product Inventory List
            </h1>
          </div>
        </div>

        {/* Action Controls & Export Buttons (Rule 5.2) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {/* Print Button */}
          <button
            onClick={() => window.print()}
            title="Print Product List"
            className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-100/80 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            onClick={() => setBulkModalOpen(true)}
            className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-rose-300 dark:border-blue-800 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Bulk percentage price update by brand"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Bulk Price</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={handleOpenCreate}
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. Controls & Filter Bar in its own Card */}
      <div className="no-print bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs p-3 sm:p-4 flex flex-col xl:flex-row items-center justify-between gap-3">
        {/* Left Side: Search Bar + Category, Brand, Stock Status & Unit Filters */}
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
                placeholder="Search product, barcode..."
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

            {/* 1. Category Filter */}
            <div className="w-full md:w-[150px]">
              <CustomSelect
                value={selectedCategory}
                onChange={handleCategoryChange}
                options={categoryOptions}
                placeholder="All Categories"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

            {/* Conditional Filters: If Tiles category selected -> Size, Grade, Finish; Otherwise -> Brand */}
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

            {/* Stock Status Filter */}
            <div className="w-full md:w-[155px]">
              <CustomSelect
                value={selectedStockStatus}
                onChange={(val) => {
                  setSelectedStockStatus(String(val));
                  setCurrentPage(1);
                }}
                options={stockStatusOptions}
                placeholder="All Stock Status"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

            {/* Unit Filter */}
            <div className="w-full md:w-[120px]">
              <CustomSelect
                value={selectedUnit}
                onChange={(val) => {
                  setSelectedUnit(String(val));
                  setCurrentPage(1);
                }}
                options={unitOptions}
                placeholder="All Units"
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>

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

          {/* Right Side: Show Entries Selector (Rule 5.3) */}
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
                  { value: "1000", label: "Show: 1000" },
                  { value: "1500", label: "Show: 1500" },
                  { value: "2000", label: "Show: 2000" },
                ]}
                matchTriggerWidth={true}
                minPopoverWidth={125}
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>
          </div>
        </div>

      {/* 3. Main Table Card (Extracted below filter box, Rule 5.1) */}
      <div className="no-print card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {/* Desktop View Table (hidden on mobile, visible on desktop >= 768px, Rule 5.4) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                <th className="p-[10px] text-center w-[45px] rounded-tl-xl">SL</th>
                <th className="p-[10px]">Product Name</th>
                <th className="p-[10px]">Barcodes</th>
                <th className="p-[10px]">Category</th>
                <th className="p-[10px]">Brand</th>
                <th className="p-[10px] text-right">Cost Price</th>
                <th className="p-[10px] text-right">Sell Price</th>
                <th className="p-[10px] text-center">Stock</th>
                <th className="p-[10px] text-center">Status</th>
                <th className="p-[10px] text-center w-[85px] rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-rose-600" />
                    Loading products...
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                    No products found. Click "Add Product" to create your first item.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="p-[10px] text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="p-[10px]">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{p.product_name}</span>
                      </div>
                      {(p.tile_size || p.grade || p.sqft_per_box || p.surface_finish) && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {p.tile_size && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/50">
                              📐 {p.tile_size}
                            </span>
                          )}
                          {p.sqft_per_box && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              📦 {p.sqft_per_box} Sft/Box {p.pcs_per_box ? `(${p.pcs_per_box} pcs)` : ""}
                            </span>
                          )}
                          {p.grade && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                              ★ {p.grade}
                            </span>
                          )}
                          {p.surface_finish && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                              ✨ {p.surface_finish}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-[10px] font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      <div className="flex flex-wrap gap-1">
                        {p.all_codes.slice(0, 2).map((c, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                          >
                            {c}
                          </span>
                        ))}
                        {p.all_codes.length > 2 && (
                          <span className="text-slate-400 text-[10px]">+{p.all_codes.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-[10px] text-slate-700 dark:text-slate-300 font-medium">
                      {p.category}
                    </td>
                    <td className="p-[10px] text-slate-700 dark:text-slate-300">
                      {p.brand}
                    </td>
                    <td className="p-[10px] text-right font-medium text-slate-600 dark:text-slate-300">
                      {formatBdCurrency(p.cost_price)}
                    </td>
                    <td className="p-[10px] text-right font-bold text-rose-700 dark:text-rose-400">
                      {formatBdCurrency(p.sell_price)}
                    </td>
                    <td className="p-[10px] text-center font-bold">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${p.quantity <= 0
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold"
                            : p.quantity <= 5
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold"
                              : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                      >
                        {p.tile_size || p.pcs_per_box ? formatBoxAndPcs(p.quantity, p.pcs_per_box) : `${p.quantity} ${p.unit}`}
                      </span>
                    </td>
                    <td className="p-[10px] text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${p.status?.toLowerCase() === "inactive"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-400 text-white"
                          }`}
                      >
                        {p.status}
                      </span>
                    </td>

                    <td className="p-[10px] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingProduct(p)}
                          title="Quick View Details"
                          className="w-7 h-7 rounded-lg border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(p)}
                          title="Edit"
                          className="w-7 h-7 rounded-lg border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProductToDelete(p)}
                          title="Delete"
                          className="w-7 h-7 rounded-lg border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Card List (< 768px, Rule 5.5) */}
        <div className="block md:hidden p-3 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading products...</div>
          ) : displayedProducts.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No products found.</div>
          ) : (
            displayedProducts.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-3.5 bg-white dark:bg-slate-800/60 shadow-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    <span>{p.product_name}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700">
                    Stock: {p.tile_size || p.pcs_per_box ? formatBoxAndPcs(p.quantity, p.pcs_per_box) : `${p.quantity} ${p.unit}`}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 mb-1">
                  {p.category} &bull; {p.brand} &bull; Code: {p.primary_code}
                </p>

                {(p.tile_size || p.grade || p.sqft_per_box) && (
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {p.tile_size && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                        📐 {p.tile_size}
                      </span>
                    )}
                    {p.sqft_per_box && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        📦 {p.sqft_per_box} Sft/Box
                      </span>
                    )}
                    {p.grade && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        ★ {p.grade}
                      </span>
                    )}
                  </div>
                )}

                {/* 2-Column Financial Grid (Strict Rule 8.5) */}
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 dark:border-slate-700/60 pt-2.5 mt-2">
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Cost:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {formatBdCurrency(p.cost_price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80">
                    <span className="text-slate-400 text-[11px]">Sell:</span>
                    <span className="font-bold text-rose-700">
                      {formatBdCurrency(p.sell_price)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => setViewingProduct(p)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="px-3 py-1 rounded-lg border border-purple-200 text-purple-600 text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setProductToDelete(p)}
                    className="px-3 py-1 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredProducts.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500, 1000, 1500, 2000]}
        />
      </div>

      {/* Add / Edit Product Modal (Strict Rule 6.1 - 6.4) */}
      {modalOpen && (() => {
        const selectedCategory = categories.find((c) => String(c.id) === String(formData.category_id));
        const isTilesCategory = Boolean(
          selectedCategory?.category_name &&
          (selectedCategory.category_name.toLowerCase().includes("tile") ||
            selectedCategory.category_name.toLowerCase().includes("টাইল"))
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
            {/* Unified Container: border-radius: 16px, max-height 92vh, max-w-4xl for spacious view */}
            <div className="w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
              {/* Sticky Header: Cool Crimson / Ruby Red Gradient, Circular Red Close #dc2626 */}
              <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
                <h3 className="text-base font-bold text-white tracking-tight m-0">
                  {editingProduct ? "Edit Product Details" : "Add New Product Item"}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form wrapping scrollable body and fixed footer cleanly */}
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                {/* Scrollable Body: scrollbar stops cleanly above footer */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                  {error && (
                    <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-[#0B3D91] dark:text-blue-300 text-xs font-semibold">
                      {error}
                    </div>
                  )}

                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      placeholder="e.g. Fresh Ceramics 60x60 Floor Tiles"
                      className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  {/* Category & Brand Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Category *
                      </label>
                      <CustomSelect
                        options={categories.map((c) => ({ value: c.id, label: c.category_name || "" }))}
                        value={formData.category_id}
                        onChange={(val) => {
                          const newCatId = String(val);
                          const catObj = categories.find((c) => String(c.id) === newCatId);
                          const isTile = Boolean(
                            catObj?.category_name &&
                            (catObj.category_name.toLowerCase().includes("tile") ||
                              catObj.category_name.toLowerCase().includes("টাইল"))
                          );

                          let newUnitId = formData.unit_id;
                          if (isTile && !newUnitId) {
                            const boxUnit = units.find((u) => u.unit_name?.toLowerCase() === "box");
                            if (boxUnit) newUnitId = String(boxUnit.id);
                          }

                          setFormData({
                            ...formData,
                            category_id: newCatId,
                            unit_id: newUnitId,
                          });
                        }}
                        placeholder="Select Category"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Brand *
                      </label>
                      <CustomSelect
                        options={brands.map((b) => ({ value: b.id, label: b.name || "" }))}
                        value={formData.brand_id}
                        onChange={(val) => setFormData({ ...formData, brand_id: String(val) })}
                        placeholder="Select Brand"
                      />
                    </div>
                  </div>

                  {/* Prices & Stock */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cost Price (৳) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Selling Price (৳)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.sell_price}
                        onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                        placeholder="0.00"
                        className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Initial Stock Qty
                      </label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        placeholder="0"
                        className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                      />
                    </div>
                  </div>

                  {/* Unit & Barcode */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Unit of Measurement
                      </label>
                      <CustomSelect
                        options={units.map((u) => ({ value: u.id, label: u.unit_name || "" }))}
                        value={formData.unit_id}
                        onChange={(val) => setFormData({ ...formData, unit_id: String(val) })}
                        placeholder="Select Unit"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Product Code / Barcodes
                      </label>
                      <div className="relative">
                        <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          value={formData.product_code}
                          onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                          placeholder="e.g. PRD-0001, 8934521093"
                          className="w-full h-[42px] pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Separate multiple barcodes with commas. Leave blank to auto-generate.
                      </p>
                    </div>
                  </div>

                  {/* Tiles Specifications & Packaging Section - STRICTLY VISIBLE ONLY FOR TILES */}
                  {isTilesCategory && (
                    <div className="border border-rose-200 dark:border-rose-950/70 rounded-2xl p-4 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/50 dark:from-blue-950/20 dark:via-slate-900 dark:to-slate-900/60 space-y-3.5 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-blue-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">
                              Tiles Specifications & Packaging Calculator
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              For Tiles items: Size, Box to Sq.Ft conversion, Grade & Surface Finish
                            </p>
                          </div>
                        </div>
                        {formData.tile_size && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                            Tiles Mode Active
                          </span>
                        )}
                      </div>

                      {/* Popular Size Pills */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          Tile Dimensions / Size (Quick Pick)
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {POPULAR_TILE_SIZES.map((size) => (
                            <button
                              key={size.value}
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  tile_size: size.value,
                                  sqft_per_box: size.defaultSqftPerBox ? String(size.defaultSqftPerBox) : formData.sqft_per_box,
                                  pcs_per_box: size.defaultPcsPerBox ? String(size.defaultPcsPerBox) : formData.pcs_per_box,
                                });
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${formData.tile_size === size.value
                                  ? "bg-rose-600 text-white border-blue-700 shadow-xs"
                                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#334155] hover:border-rose-400"
                                }`}
                            >
                              {size.label}
                            </button>
                          ))}
                        </div>

                        <input
                          type="text"
                          value={formData.tile_size}
                          onChange={(e) => {
                            const newSize = e.target.value;
                            const pcs = parseFloat(formData.pcs_per_box || "0");
                            const autoSqft = autoCalculateSqftPerBox(newSize, pcs);
                            setFormData({
                              ...formData,
                              tile_size: newSize,
                              ...(autoSqft !== null ? { sqft_per_box: String(autoSqft) } : {}),
                            });
                          }}
                          placeholder="Or enter custom size (e.g. 8/12, 12x24, 10.5/24)"
                          className="w-full h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0] font-medium"
                        />
                      </div>

                      {/* Box Packaging & Conversion Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Sq.Ft per Box (বক্সে মোট স্কয়ার ফিট)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={formData.sqft_per_box}
                            onChange={(e) => setFormData({ ...formData, sqft_per_box: e.target.value })}
                            placeholder="e.g. 16.66 or 16.0"
                            className="w-full h-[40px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs font-bold text-rose-700 dark:text-rose-400 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Required for live POS Box ⇄ Sq.Ft billing conversion.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Pieces per Box (বক্সে মোট পিস)
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={formData.pcs_per_box}
                            onChange={(e) => {
                              const newPcs = e.target.value;
                              const pcsNum = parseFloat(newPcs || "0");
                              const autoSqft = autoCalculateSqftPerBox(formData.tile_size, pcsNum);
                              setFormData({
                                ...formData,
                                pcs_per_box: newPcs,
                                ...(autoSqft !== null ? { sqft_per_box: String(autoSqft) } : {}),
                              });
                            }}
                            placeholder="e.g. 25, 11, 10, 8, 4"
                            className="w-full h-[40px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs font-bold text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Useful for loose piece calculations.
                          </p>
                        </div>
                      </div>

                      {/* Grade & Surface Finish */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Tiles Grade / Quality
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {TILE_GRADES.map((g) => (
                              <button
                                key={g.value}
                                type="button"
                                onClick={() => setFormData({ ...formData, grade: formData.grade === g.value ? "" : g.value })}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${formData.grade === g.value
                                    ? "bg-emerald-600 text-white border-emerald-700 shadow-xs"
                                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#334155] hover:border-emerald-400"
                                  }`}
                              >
                                {g.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Surface Finish
                          </label>
                          <CustomSelect
                            options={SURFACE_FINISHES.map((f) => ({ value: f, label: f }))}
                            value={formData.surface_finish}
                            onChange={(val) => setFormData({ ...formData, surface_finish: String(val) })}
                            placeholder="Select Surface Finish (Optional)"
                          />
                        </div>
                      </div>

                      {/* Live Packaging Badge */}
                      {formData.sqft_per_box && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between">
                          <span>📦 1 Box = {formData.sqft_per_box} Sq.Ft {formData.pcs_per_box ? `(${formData.pcs_per_box} Pcs)` : ""}</span>
                          {formData.sell_price && Number(formData.sqft_per_box) > 0 && (
                            <span className="text-[11px] font-black">
                              Rate: ৳{(Number(formData.sell_price) / Number(formData.sqft_per_box)).toFixed(2)} / Sq.Ft
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer (Rule 6.4) - Fixed at bottom outside the scroll area, zero content bleed! */}
                <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 z-10 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-70 shadow-sm"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingProduct ? "Update Product" : "Save Product"}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 2. Quick View Product Details Modal */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-150">
            {/* Sticky Header: Ruby Red / Crimson Gradient */}
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white tracking-tight m-0 truncate">
                    Product Details
                  </h3>
                  <p className="text-[10px] text-rose-100/80 leading-none mt-0.5 truncate">
                    ID: #{viewingProduct.id} &bull; Code: {viewingProduct.primary_code || "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
              {/* Product Title & Badges */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight">
                      {viewingProduct.product_name || viewingProduct.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                        {viewingProduct.category || "General"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600">
                        {viewingProduct.brand || "N/A"}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-900/60">
                        Unit: {viewingProduct.unit || "Pcs"}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${viewingProduct.status?.toLowerCase() === "inactive"
                        ? "bg-rose-500 text-white"
                        : "bg-emerald-600 text-white"
                      }`}
                  >
                    {viewingProduct.status || "Active"}
                  </span>
                </div>
              </div>

              {/* Barcodes */}
              {viewingProduct.all_codes && viewingProduct.all_codes.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Barcode(s)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {viewingProduct.all_codes.map((code, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                      >
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Financial & Stock 3-Card Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Cost Price
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {formatBdCurrency(viewingProduct.cost_price)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-center">
                  <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                    Sell Price
                  </span>
                  <span className="text-xs sm:text-sm font-black text-rose-700 dark:text-rose-300 mt-0.5 block">
                    {formatBdCurrency(viewingProduct.sell_price)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Stock
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-black mt-0.5 block ${viewingProduct.quantity <= 0
                        ? "text-rose-600"
                        : viewingProduct.quantity <= 5
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                  >
                    {viewingProduct.tile_size || viewingProduct.pcs_per_box ? formatBoxAndPcs(viewingProduct.quantity, viewingProduct.pcs_per_box) : `${viewingProduct.quantity} ${viewingProduct.unit}`}
                  </span>
                </div>
              </div>

              {/* Tiles Specific Information (if applicable) */}
              {(viewingProduct.tile_size || viewingProduct.sqft_per_box || viewingProduct.grade || viewingProduct.surface_finish) && (
                <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/30 via-white to-slate-50/50 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 dark:text-rose-300 border-b border-blue-100 dark:border-slate-800 pb-1.5">
                    <Layers className="w-4 h-4 text-rose-600" />
                    <span>Tiles Packaging & Specification</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {viewingProduct.tile_size && (
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Tile Size:</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          📐 {viewingProduct.tile_size}
                        </span>
                      </div>
                    )}
                    {viewingProduct.sqft_per_box && (
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Sq.Ft / Box:</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          📦 {viewingProduct.sqft_per_box} Sft
                        </span>
                      </div>
                    )}
                    {viewingProduct.pcs_per_box && (
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Pieces / Box:</span>
                        <span className="font-bold text-slate-800 dark:text-white">
                          {viewingProduct.pcs_per_box} Pcs
                        </span>
                      </div>
                    )}
                    {viewingProduct.grade && (
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">Grade:</span>
                        <span className="font-bold text-amber-600">
                          ★ {viewingProduct.grade}
                        </span>
                      </div>
                    )}
                    {viewingProduct.surface_finish && (
                      <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800 col-span-2">
                        <span className="text-slate-400">Surface Finish:</span>
                        <span className="font-bold text-purple-600">
                          ✨ {viewingProduct.surface_finish}
                        </span>
                      </div>
                    )}
                  </div>

                  {viewingProduct.sqft_per_box && viewingProduct.sell_price && Number(viewingProduct.sqft_per_box) > 0 && (
                    <div className="pt-1 text-[11px] font-bold text-rose-700 dark:text-rose-400 flex justify-between">
                      <span>Rate per Sq.Ft:</span>
                      <span>৳{(Number(viewingProduct.sell_price) / Number(viewingProduct.sqft_per_box)).toFixed(2)} / Sft</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const toEdit = viewingProduct;
                  setViewingProduct(null);
                  handleOpenEdit(toEdit);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Product</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {/* Custom Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirm Product Deletion"
        recordIdentifier={
          productToDelete
            ? `Product: ${productToDelete.product_name || productToDelete.name} (${productToDelete.primary_code})`
            : null
        }
        warningMessage="Are you sure you want to delete this product? This action cannot be undone."
        isLoading={deleting}
      />

      {/* Bulk Percentage Price Update Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2 text-white">
                <Percent className="w-5 h-5 text-rose-200" />
                <h3 className="text-base font-bold text-white tracking-tight m-0">
                  Bulk Percentage Price Update (% বাল্ক প্রাইস পরিবর্তন)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleBulkUpdate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Brand & Target Field Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Brand (ব্র্যান্ড নির্বাচন করুন)
                    </label>
                    <CustomSelect
                      value={bulkBrandId}
                      onChange={(val) => setBulkBrandId(String(val))}
                      options={[
                        { value: "all", label: "All Brands (সকল ব্র্যান্ড)" },
                        ...brands.map((b) => ({ value: String(b.id), label: b.name || "" })),
                      ]}
                      placeholder="Select Brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Price (কোন মূল্য আপডেট করবেন)
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 h-[42px] p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => setBulkTargetField("sell_price")}
                        className={`text-xs font-bold rounded-lg transition-all ${bulkTargetField === "sell_price"
                            ? "bg-rose-700 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                          }`}
                      >
                        Sell Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTargetField("cost_price")}
                        className={`text-xs font-bold rounded-lg transition-all ${bulkTargetField === "cost_price"
                            ? "bg-rose-700 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                          }`}
                      >
                        Cost Price
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkTargetField("both")}
                        className={`text-xs font-bold rounded-lg transition-all ${bulkTargetField === "both"
                            ? "bg-rose-700 text-white shadow-xs"
                            : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                          }`}
                      >
                        Both Prices
                      </button>
                    </div>
                  </div>
                </div>

                {/* Percentage Input & Quick Buttons */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Percentage Adjustment (% হারে বৃদ্ধি বা হ্রাস)
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Ex: <code className="text-rose-600 font-bold font-mono">5</code> (+5% বাড়বে) অথবা <code className="text-rose-600 font-bold font-mono">-5</code> (-5% কমবে)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={bulkPercentage}
                        onChange={(e) => setBulkPercentage(e.target.value)}
                        placeholder="e.g. 5 or -5"
                        className="w-full h-[42px] px-3.5 pr-8 rounded-xl bg-white dark:bg-slate-800/90 text-xs font-bold text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {[5, 10, 15, -5, -10].map((quick) => (
                        <button
                          key={quick}
                          type="button"
                          onClick={() => setBulkPercentage(String(quick))}
                          className="px-2.5 h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          {quick > 0 ? `+${quick}%` : `${quick}%`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Product Selection List with Live Price Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="bulkSelectAll"
                        checked={bulkMatchingProducts.length > 0 && bulkSelectedIds.size === bulkMatchingProducts.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setBulkSelectedIds(new Set(bulkMatchingProducts.map((p) => p.id)));
                          } else {
                            setBulkSelectedIds(new Set());
                          }
                        }}
                        className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                      <label htmlFor="bulkSelectAll" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Select All Matching ({bulkSelectedIds.size} / {bulkMatchingProducts.length} Selected)
                      </label>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Showing matching products for brand
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[260px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {bulkMatchingProducts.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 text-xs font-medium">
                        No products found for this brand filter.
                      </div>
                    ) : (
                      bulkMatchingProducts.map((p) => {
                        const isChecked = bulkSelectedIds.has(p.id);
                        const pct = parseFloat(bulkPercentage) || 0;
                        const factor = 1 + pct / 100;
                        const newSell = Math.round(p.sell_price * factor * 100) / 100;
                        const newCost = Math.round(p.cost_price * factor * 100) / 100;

                        return (
                          <div
                            key={p.id}
                            onClick={() => {
                              const next = new Set(bulkSelectedIds);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              setBulkSelectedIds(next);
                            }}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${isChecked
                                ? "bg-rose-50/40 dark:bg-rose-950/20"
                                : "hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-60"
                              }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => { }} // handled by parent div
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-800 dark:text-white truncate">
                                  {p.product_name}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {p.brand} &bull; Code: {p.primary_code}
                                </div>
                              </div>
                            </div>

                            {/* Price Comparison Preview */}
                            <div className="flex items-center gap-3 shrink-0 text-right">
                              {(bulkTargetField === "sell_price" || bulkTargetField === "both") && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Sell Price</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {formatBdCurrency(p.sell_price)}
                                  </span>
                                  {pct !== 0 && (
                                    <span className="text-rose-600 font-extrabold ml-1">
                                      &rarr; {formatBdCurrency(newSell)}
                                    </span>
                                  )}
                                </div>
                              )}
                              {(bulkTargetField === "cost_price" || bulkTargetField === "both") && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Cost Price</span>
                                  <span className="font-bold text-slate-700 dark:text-slate-300">
                                    {formatBdCurrency(p.cost_price)}
                                  </span>
                                  {pct !== 0 && (
                                    <span className="text-rose-600 font-extrabold ml-1">
                                      &rarr; {formatBdCurrency(newCost)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel (বাতিল)
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting || bulkSelectedIds.size === 0 || !bulkPercentage}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {bulkSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Prices...</span>
                    </>
                  ) : (
                    <>
                      <Percent className="w-4 h-4" />
                      <span>Update {bulkSelectedIds.size} Products Price</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Dedicated Print-Only Report Template */}
      <div className="print-only p-2 text-black bg-white">
        <div className="border-b-2 border-slate-900 pb-2 mb-3">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black tracking-tight text-[#0B3D91] m-0">PROTIKKHA ELECTRIC</h1>
              <p className="text-xs text-slate-600 font-medium m-0">
                Electrical Retail &amp; Wholesale POS &amp; Inventory Management
              </p>
              <h2 className="text-sm font-bold text-slate-800 mt-1 uppercase tracking-wider">
                Product Inventory Price &amp; Stock List
              </h2>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>Printed: {new Date().toLocaleDateString("en-GB")} {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
              <p>Total Products: <strong className="text-slate-900">{filteredProducts.length}</strong></p>
            </div>
          </div>
        </div>

        <table className="print-table w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100 text-black font-bold border-b-2 border-slate-900">
              <th className="p-1.5 text-center w-8">SL</th>
              <th className="p-1.5">Product Name</th>
              <th className="p-1.5">Code / Barcode</th>
              <th className="p-1.5">Category</th>
              <th className="p-1.5">Size / Brand</th>
              <th className="p-1.5 text-center">Stock</th>
              <th className="p-1.5 text-right">Cost Price</th>
              <th className="p-1.5 text-right">Sell Price</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((p, idx) => (
              <tr key={p.id} className="border-b border-slate-300">
                <td className="p-1.5 text-center font-bold">{idx + 1}</td>
                <td className="p-1.5 font-bold">{p.product_name}</td>
                <td className="p-1.5 font-mono text-[10px]">{p.display_codes}</td>
                <td className="p-1.5">{p.category}</td>
                <td className="p-1.5">{p.tile_size || p.brand || "-"}</td>
                <td className="p-1.5 text-center font-bold">
                  {p.tile_size || p.pcs_per_box
                    ? formatBoxAndPcs(p.quantity, p.pcs_per_box, p.tile_size)
                    : `${p.quantity} pcs`}
                </td>
                <td className="p-1.5 text-right">{formatBdCurrency(p.cost_price)}</td>
                <td className="p-1.5 text-right font-bold">{formatBdCurrency(p.sell_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

