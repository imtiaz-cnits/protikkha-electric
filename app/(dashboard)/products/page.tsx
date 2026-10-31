"use client";

import { useState, useEffect, useMemo } from "react";
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
  Boxes,
  Percent,
  ShieldCheck,
  Zap,
  Tag,
  CheckCircle,
  Eye,
  Upload,
} from "lucide-react";
import { CustomSelect, Pagination, DeleteConfirmModal, TableActionMenu } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { PrintTableSheet } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";

export const SPEC_TYPE_OPTIONS = [
  { value: "all", label: "All Spec Types" },
  { value: "CABLE", label: "Wires & Cables (Reel/Coil)" },
  { value: "BREAKER", label: "Circuit Breakers & Protection" },
  { value: "SWITCH", label: "Switches, Sockets & Dimmers" },
  { value: "LIGHTING", label: "LED Lighting & Fixtures" },
  { value: "CONDUIT", label: "Conduits, Pipes & Fittings" },
  { value: "ACCESSORY", label: "Accessories & Tools" },
  { value: "GENERAL", label: "General Electrical" },
];

export const CABLE_SIZES = [
  "1.0 RM",
  "1.3 RM",
  "1.5 RM BYA",
  "2.0 RM",
  "2.5 RM BYA",
  "3.0 RM",
  "4.0 RM BYA",
  "6.0 RM BYA",
  "10.0 RM",
  "16.0 RM",
  "7/0.029",
  "3/0.029",
];

export const BREAKER_CURRENTS = [
  "6A",
  "10A",
  "16A",
  "20A",
  "25A",
  "32A",
  "40A",
  "50A",
  "63A",
  "80A",
  "100A",
];

export const BREAKER_POLES = [
  "1P (Single Pole)",
  "2P (Double Pole)",
  "3P (Triple Pole)",
  "4P (Four Pole)",
  "1P+N",
  "3P+N",
];

export const BREAKING_CAPACITIES = ["3kA", "4.5kA", "6kA", "10kA", "15kA"];

export const SWITCH_GANGS = [
  "1-Gang Switch",
  "2-Gang Switch",
  "3-Gang Switch",
  "4-Gang Switch",
  "2-Pin Socket",
  "3-Pin Socket",
  "Combined 13A Socket",
  "Power 15A/16A Socket",
  "Fan Dimmer / Regulator",
];

export const LIGHT_WATTAGES = [
  "5W",
  "7W",
  "9W",
  "12W",
  "15W",
  "18W",
  "20W",
  "24W",
  "30W",
  "40W",
  "50W",
  "100W",
];

export const COLOR_TEMPS = [
  "Daylight (6500K)",
  "Cool White (4000K)",
  "Warm White (3000K)",
];

export const CONDUIT_SIZES = [
  '16mm (0.5")',
  '20mm (0.75")',
  '25mm (1.0")',
  '32mm (1.25")',
  '40mm (1.5")',
];

export const PACKAGING_UNITS = [
  "Reel",
  "Coil",
  "Box",
  "Bundle",
  "Packet",
  "Carton",
];

interface ElectricalSpec {
  id?: number;
  spec_type: string;
  conductor_material?: string | null;
  cable_size?: string | null;
  core_count?: number | null;
  voltage_grade?: string | null;
  current_rating?: string | null;
  pole_type?: string | null;
  breaking_capacity?: string | null;
  tripping_curve?: string | null;
  gang_module?: string | null;
  conduit_diameter?: string | null;
  wattage?: string | null;
  color_temperature?: string | null;
  warranty_months?: number | null;
}

interface PackagingConversion {
  id?: number;
  packaging_unit: string;
  base_unit: string;
  conversion_ratio: number;
  is_default?: boolean;
}

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
  status: string;
  img_url?: string | null;
  wholesale_price?: number | null;
  sub_category_id?: number | null;
  sub_category?: string | null;
  category: string;
  brand: string;
  unit: string;
  brand_id: number;
  category_id: number;
  unit_id?: number | null;
  electrical_spec?: ElectricalSpec | null;
  packaging_conversions?: PackagingConversion[];
  created_at?: string;
}

interface OptionItem {
  id: number;
  name?: string;
  category_name?: string;
  sub_category_name?: string;
  category_id?: number;
  unit_name?: string;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [subCategories, setSubCategories] = useState<OptionItem[]>([]);
  const [brands, setBrands] = useState<OptionItem[]>([]);
  const [units, setUnits] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedSpecType, setSelectedSpecType] = useState<string>("all");
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [viewingProduct, setViewingProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Delete Modal
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk Price Update Modal
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkBrandId, setBulkBrandId] = useState<string>("all");
  const [bulkPercentage, setBulkPercentage] = useState<string>("");
  const [bulkTargetField, setBulkTargetField] = useState<"sell_price" | "cost_price" | "both">("sell_price");
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // CSV Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    product_name: "",
    product_code: "",
    cost_price: "",
    sell_price: "",
    wholesale_price: "",
    quantity: "0",
    brand_id: "",
    category_id: "",
    sub_category_id: "",
    unit_id: "",
    status: "active",
    // Electrical Specs
    spec_type: "GENERAL",
    conductor_material: "Copper",
    cable_size: "",
    core_count: "1",
    voltage_grade: "450/750V",
    current_rating: "",
    pole_type: "",
    breaking_capacity: "",
    tripping_curve: "C",
    gang_module: "",
    conduit_diameter: "",
    wattage: "",
    color_temperature: "",
    warranty_months: "0",
    // Packaging Conversion
    packaging_unit: "",
    conversion_ratio: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, catRes, subCatRes, brandRes, unitRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/sub-categories"),
        fetch("/api/brands"),
        fetch("/api/units"),
      ]);

      const [prodData, catData, subCatData, brandData, unitData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        subCatRes.json(),
        brandRes.json(),
        unitRes.json(),
      ]);

      if (prodData.status === "success") setProducts(prodData.data);
      if (catData.status === "success") setCategories(catData.data);
      if (subCatData.status === "success") setSubCategories(subCatData.data);
      if (brandData.status === "success") setBrands(brandData.data);
      if (unitData.status === "success") setUnits(unitData.data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load product catalog");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const spec = p.electrical_spec;
        const specStr = spec
          ? `${spec.spec_type} ${spec.cable_size || ""} ${spec.current_rating || ""} ${spec.wattage || ""} ${spec.gang_module || ""}`.toLowerCase()
          : "";

        const matchName = p.product_name.toLowerCase().includes(q);
        const matchCode = p.display_codes.toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchCategory = p.category.toLowerCase().includes(q);
        const matchSpec = specStr.includes(q);

        if (!matchName && !matchCode && !matchBrand && !matchCategory && !matchSpec) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== "all" && String(p.category_id) !== selectedCategory) {
        return false;
      }

      // Brand filter
      if (selectedBrand !== "all" && String(p.brand_id) !== selectedBrand) {
        return false;
      }

      // Spec Type filter
      if (selectedSpecType !== "all") {
        if (!p.electrical_spec || p.electrical_spec.spec_type !== selectedSpecType) {
          return false;
        }
      }

      // Stock status filter
      if (selectedStockStatus === "in_stock" && p.quantity <= 0) return false;
      if (selectedStockStatus === "low_stock" && (p.quantity <= 0 || p.quantity > 10)) return false;
      if (selectedStockStatus === "out_of_stock" && p.quantity > 0) return false;

      return true;
    });
  }, [products, search, selectedCategory, selectedBrand, selectedSpecType, selectedStockStatus]);

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Clean Print-Only Catalog Sheet Payload
  const printCatalogPayload: PrintReportPayload = {
    title: "Electrical Products Catalog",
    subtitle: "Complete catalog of wires, cables, switches, breakers, and accessories",
    filename: `products_catalog_${new Date().toISOString().slice(0, 10)}`,
    metaItems: [
      { label: "Listed Products", value: `${filteredProducts.length} Items` },
      {
        label: "Category Filter",
        value:
          selectedCategory === "all"
            ? "All Categories"
            : categories.find((c) => String(c.id) === selectedCategory)?.category_name ||
              selectedCategory,
      },
      {
        label: "Brand Filter",
        value:
          selectedBrand === "all"
            ? "All Brands"
            : brands.find((b) => String(b.id) === selectedBrand)?.name || selectedBrand,
      },
      ...(search.trim() ? [{ label: "Search", value: search.trim() }] : []),
    ],
    columns: [
      { header: "SL", align: "center", width: "40px" },
      { header: "Product Name & Spec", align: "left", width: "28%" },
      { header: "Barcode / Code", align: "left", width: "16%" },
      { header: "Category & Brand", align: "left", width: "18%" },
      { header: "Unit", align: "center", width: "10%" },
      { header: "Cost Price", align: "right", width: "13%" },
      { header: "Sell Price", align: "right", width: "13%" },
    ],
    rows: filteredProducts.map((p, idx) => {
      const spec = p.electrical_spec;
      const specLine = spec
        ? [
            spec.cable_size,
            spec.current_rating,
            spec.wattage,
            spec.gang_module,
            spec.voltage_grade,
          ]
            .filter(Boolean)
            .join(" • ")
        : "";

      return [
        { text: String(idx + 1), align: "center", bold: true, color: "muted" },
        { text: p.product_name, subText: specLine || undefined, bold: true },
        { text: p.primary_code || p.display_codes || "—", mono: true, color: "muted" },
        { text: p.category || "—", subText: p.brand || undefined },
        { text: p.unit || "Pcs", align: "center", bold: true },
        { text: formatBdCurrency(p.cost_price), align: "right", mono: true },
        { text: formatBdCurrency(p.sell_price), align: "right", mono: true, bold: true, color: "navy" },
      ];
    }),
  };

  function handleOpenAdd() {
    setEditingProduct(null);
    setFormData({
      product_name: "",
      product_code: "",
      cost_price: "",
      sell_price: "",
      wholesale_price: "",
      quantity: "0",
      brand_id: brands[0]?.id ? String(brands[0].id) : "",
      category_id: categories[0]?.id ? String(categories[0].id) : "",
      sub_category_id: "",
      unit_id: units[0]?.id ? String(units[0].id) : "",
      status: "active",
      spec_type: "GENERAL",
      conductor_material: "Copper",
      cable_size: "",
      core_count: "1",
      voltage_grade: "450/750V",
      current_rating: "",
      pole_type: "",
      breaking_capacity: "",
      tripping_curve: "C",
      gang_module: "",
      conduit_diameter: "",
      wattage: "",
      color_temperature: "",
      warranty_months: "0",
      packaging_unit: "",
      conversion_ratio: "",
    });
    setError("");
    setModalOpen(true);
  }

  function handleOpenEdit(prod: ProductItem) {
    setEditingProduct(prod);
    const spec = prod.electrical_spec;
    const pkg = prod.packaging_conversions && prod.packaging_conversions.length > 0
      ? prod.packaging_conversions[0]
      : null;

    setFormData({
      product_name: prod.product_name,
      product_code: prod.primary_code,
      cost_price: String(prod.cost_price),
      sell_price: String(prod.sell_price),
      wholesale_price: prod.wholesale_price ? String(prod.wholesale_price) : "",
      quantity: String(prod.quantity),
      brand_id: String(prod.brand_id),
      category_id: String(prod.category_id),
      sub_category_id: prod.sub_category_id ? String(prod.sub_category_id) : "",
      unit_id: prod.unit_id ? String(prod.unit_id) : "",
      status: prod.status || "active",
      spec_type: spec?.spec_type || "GENERAL",
      conductor_material: spec?.conductor_material || "Copper",
      cable_size: spec?.cable_size || "",
      core_count: spec?.core_count ? String(spec.core_count) : "1",
      voltage_grade: spec?.voltage_grade || "450/750V",
      current_rating: spec?.current_rating || "",
      pole_type: spec?.pole_type || "",
      breaking_capacity: spec?.breaking_capacity || "",
      tripping_curve: spec?.tripping_curve || "C",
      gang_module: spec?.gang_module || "",
      conduit_diameter: spec?.conduit_diameter || "",
      wattage: spec?.wattage || "",
      color_temperature: spec?.color_temperature || "",
      warranty_months: spec?.warranty_months ? String(spec.warranty_months) : "0",
      packaging_unit: pkg?.packaging_unit || "",
      conversion_ratio: pkg?.conversion_ratio ? String(pkg.conversion_ratio) : "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const selectedUnitObj = units.find((u) => String(u.id) === formData.unit_id);
      const payload = {
        ...formData,
        unit_name: selectedUnitObj?.unit_name || "Piece",
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
        throw new Error(data.message || "Failed to save product");
      }

      toast.success(
        editingProduct
          ? "Electrical product updated successfully"
          : "Electrical product created successfully"
      );

      setModalOpen(false);
      await loadData();
      if (!editingProduct) setCurrentPage(1); // Reset to page 1 on create (Rule 7.2)
    } catch (err: any) {
      setError(err?.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!productToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete product");
      }

      toast.success(`${productToDelete.product_name} deleted successfully`);
      setProductToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Cannot delete product with transaction history");
      setProductToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkPriceSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseFloat(bulkPercentage);
    if (isNaN(pct) || pct === 0) {
      toast.error("Please enter a valid non-zero percentage");
      return;
    }

    setBulkSubmitting(true);
    try {
      const payload: any = {
        percentage: pct,
        target_field: bulkTargetField,
      };

      if (bulkSelectedIds.size > 0) {
        payload.product_ids = Array.from(bulkSelectedIds);
      } else if (bulkBrandId !== "all") {
        payload.brand_id = bulkBrandId;
      } else {
        throw new Error("Select specific products or choose a brand to update");
      }

      const res = await fetch("/api/products/bulk-price-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to update prices");
      }

      toast.success(data.message);
      setBulkModalOpen(false);
      setBulkSelectedIds(new Set());
      setBulkPercentage("");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Error updating prices");
    } finally {
      setBulkSubmitting(false);
    }
  }

  function toggleSelectProduct(id: number) {
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    const pageIds = paginatedProducts.map((p) => p.id);
    const allSelected = pageIds.every((id) => bulkSelectedIds.has(id));

    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  // Helper: Electrical Specification Badge
  function renderSpecBadge(spec?: ElectricalSpec | null) {
    if (!spec) return null;

    const items: string[] = [];
    if (spec.cable_size) items.push(spec.cable_size);
    if (spec.core_count && spec.core_count > 1) items.push(`${spec.core_count}-Core`);
    if (spec.current_rating) items.push(spec.current_rating);
    if (spec.pole_type) items.push(spec.pole_type);
    if (spec.breaking_capacity) items.push(spec.breaking_capacity);
    if (spec.gang_module) items.push(spec.gang_module);
    if (spec.wattage) items.push(spec.wattage);
    if (spec.conduit_diameter) items.push(spec.conduit_diameter);

    if (items.length === 0) return null;

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1E65A0] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 truncate">
        <Zap className="w-2.5 h-2.5 shrink-0 text-amber-500" />
        <span className="truncate">{items.join(" • ")}</span>
      </span>
    );
  }

  // Export CSV Helper
  function exportCSV() {
    const headers = [
      "ID",
      "Product Name",
      "Barcode",
      "Category",
      "Brand",
      "Spec Type",
      "Cable Size / Rating",
      "Cost Price",
      "Sell Price",
      "Stock Qty",
      "Unit",
      "Warranty (Months)",
    ];

    const rows = filteredProducts.map((p) => [
      p.id,
      `"${p.product_name.replace(/"/g, '""')}"`,
      `"${p.primary_code}"`,
      `"${p.category}"`,
      `"${p.brand}"`,
      p.electrical_spec?.spec_type || "GENERAL",
      `"${p.electrical_spec?.cable_size || p.electrical_spec?.current_rating || p.electrical_spec?.wattage || ""}"`,
      p.cost_price,
      p.sell_price,
      p.quantity,
      p.unit,
      p.electrical_spec?.warranty_months || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `protikkha_electric_products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function downloadSampleCsv() {
    const sampleHeaders = [
      "Product Name",
      "Product Codes",
      "Category",
      "Brand",
      "Unit",
      "Selling Price",
      "Cost Price",
      "Stock Quantity",
      "Spec Type",
      "Conductor Material",
      "Cable Size",
      "Core Count",
      "Current Rating",
      "Voltage Grade",
      "Wattage",
      "Is Cut Sellable",
    ];
    const sampleRow = [
      '"BBS 2.5 RM BYA Red"',
      '"BBS-2.5RM-RED"',
      '"Wires & Cables"',
      '"BBS Cables"',
      '"Reel"',
      "7800",
      "6900",
      "25",
      "CABLE",
      "Copper",
      "2.5 RM BYA",
      "1",
      "24A",
      "450/750V",
      "",
      "YES",
    ];
    const content = "\uFEFF" + [sampleHeaders.join(","), sampleRow.join(",")].join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "protikkha_product_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) {
      toast.error("Please select a CSV file to import");
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setImportResult(data);
        toast.success(data.message || "Import completed!");
        await loadData();
      } else {
        toast.error(data.message || "Import failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing import");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Products Catalog
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage electrical wires, cables, circuit breakers, switches, and lighting inventory
            </p>
          </div>
        </div>

        {/* Top Actions: Add, Bulk Update, CSV, Print */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => setBulkModalOpen(true)}
            className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <Percent className="w-3.5 h-3.5 text-amber-500" />
            <span>Bulk Price Update</span>
          </button>

          <button
            onClick={exportCSV}
            title="Export CSV"
            className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportResult(null);
              setImportModalOpen(true);
            }}
            title="Import Catalog CSV"
            className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Upload className="w-4 h-4 text-[#1E65A0]" />
          </button>

          <button
            onClick={() => window.print()}
            title="Print Catalog"
            className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          <button
            onClick={handleOpenAdd}
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search code, name, size..."
              className="w-full h-[38px] pl-9 pr-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0] focus:ring-2 focus:ring-[#1E65A0]/20 transition-all"
            />
          </div>

          {/* Category Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Categories" },
              ...categories.map((c) => ({
                value: String(c.id),
                label: c.category_name || "Category",
              })),
            ]}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(String(val));
              setCurrentPage(1);
            }}
            placeholder="Filter Category"
          />

          {/* Brand Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Brands" },
              ...brands.map((b) => ({
                value: String(b.id),
                label: b.name || "Brand",
              })),
            ]}
            value={selectedBrand}
            onChange={(val) => {
              setSelectedBrand(String(val));
              setCurrentPage(1);
            }}
            placeholder="Filter Brand"
          />

          {/* Spec Type Filter */}
          <CustomSelect
            options={SPEC_TYPE_OPTIONS}
            value={selectedSpecType}
            onChange={(val) => {
              setSelectedSpecType(String(val));
              setCurrentPage(1);
            }}
            placeholder="Spec Type"
          />

          {/* Stock Status Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Stock Levels" },
              { value: "in_stock", label: "In Stock (> 0)" },
              { value: "low_stock", label: "Low Stock (≤ 10)" },
              { value: "out_of_stock", label: "Out of Stock (0)" },
            ]}
            value={selectedStockStatus}
            onChange={(val) => {
              setSelectedStockStatus(String(val));
              setCurrentPage(1);
            }}
            placeholder="Stock Status"
          />
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-slate-800 dark:text-white">{filteredProducts.length}</strong> electrical products
            </span>
            {bulkSelectedIds.size > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-[#1E65A0] dark:text-blue-300 font-bold">
                {bulkSelectedIds.size} selected
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Products Table & Mobile List */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E65A0]" />
            <p className="text-xs text-slate-500 font-medium">Loading electrical catalog...</p>
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Boxes className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No electrical products found
            </p>
            <p className="text-xs text-slate-400">
              Try adjusting your search criteria or add a new electrical product.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View — Compact Full-Screen Layout (Zero Horizontal Scroll) */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 table-auto">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[10.5px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-2.5 px-2.5 w-8 text-center">
                      <input
                        type="checkbox"
                        checked={
                          paginatedProducts.length > 0 &&
                          paginatedProducts.every((p) => bulkSelectedIds.has(p.id))
                        }
                        onChange={toggleSelectAllOnPage}
                        className="rounded border-white/30 text-[#1E65A0] focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-2.5">Product, Barcode &amp; Spec</th>
                    <th className="py-2.5 px-2.5">Category &amp; Brand</th>
                    <th className="py-2.5 px-2.5">Unit / Pack</th>
                    <th className="py-2.5 px-2.5 text-right">Cost (৳)</th>
                    <th className="py-2.5 px-2.5 text-right">Sell (৳)</th>
                    <th className="py-2.5 px-2.5 text-center">Stock</th>
                    <th className="py-2.5 px-2 text-center w-14">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedProducts.map((p) => {
                    const isSelected = bulkSelectedIds.has(p.id);
                    const pkg = p.packaging_conversions && p.packaging_conversions.length > 0
                      ? p.packaging_conversions[0]
                      : null;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors ${isSelected ? "bg-blue-50/70 dark:bg-blue-950/40" : ""
                          }`}
                      >
                        <td className="py-2 px-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectProduct(p.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-[#1E65A0] focus:ring-0 cursor-pointer"
                          />
                        </td>

                        {/* Compact Product Name + Barcode + Spec + Warranty */}
                        <td className="py-2 px-2.5 max-w-[290px]">
                          <p className="font-bold text-slate-900 dark:text-white leading-tight truncate" title={p.product_name}>
                            {p.product_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700">
                              {p.primary_code}
                            </span>
                            {renderSpecBadge(p.electrical_spec)}
                            {(p.electrical_spec?.warranty_months ?? 0) > 0 && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-900">
                                <ShieldCheck className="w-2.5 h-2.5 text-amber-500" />
                                {p.electrical_spec?.warranty_months}M
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category & Brand */}
                        <td className="py-2 px-2.5 max-w-[155px]">
                          <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={p.category}>
                            {p.category}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold truncate">{p.brand}</p>
                        </td>

                        {/* Packaging Conversion */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {pkg ? (
                            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                              1 {pkg.packaging_unit} = {pkg.conversion_ratio} {pkg.base_unit}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">1 {p.unit}</span>
                          )}
                        </td>

                        {/* Cost Price */}
                        <td className="py-2 px-2.5 text-right font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatBdCurrency(p.cost_price)}
                        </td>

                        {/* Sell & Wholesale Price */}
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {formatBdCurrency(p.sell_price)}
                          </p>
                          {p.wholesale_price && p.wholesale_price > 0 ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold" title="Wholesale Price">
                              W: {formatBdCurrency(p.wholesale_price)}
                            </p>
                          ) : null}
                        </td>

                        {/* Stock */}
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10.5px] ${p.quantity <= 0
                                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                                : p.quantity <= 10
                                  ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                                  : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                              }`}
                          >
                            {p.quantity} {p.unit}
                          </span>
                        </td>

                        {/* Actions (>2 actions -> Custom Portal Dropdown) */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          <TableActionMenu
                            headerLabel={p.primary_code}
                            actions={[
                              {
                                label: "View Details",
                                icon: <Eye className="w-3.5 h-3.5" />,
                                onClick: () => setViewingProduct(p),
                              },
                              {
                                label: "Edit Product",
                                icon: <Edit2 className="w-3.5 h-3.5" />,
                                onClick: () => handleOpenEdit(p),
                                variant: "primary",
                              },
                              {
                                label: "Delete Product",
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                onClick: () => setProductToDelete(p),
                                variant: "danger",
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (2-Column Financial Grid per Rule 8.3) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedProducts.map((p) => {
                const pkg = p.packaging_conversions && p.packaging_conversions.length > 0
                  ? p.packaging_conversions[0]
                  : null;

                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {p.primary_code}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {p.brand}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                          {p.product_name}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${p.quantity <= 0
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                          }`}
                      >
                        {p.quantity} {p.unit}
                      </span>
                    </div>

                    {renderSpecBadge(p.electrical_spec)}

                    {/* 2-Column Financial Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Cost Price</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {formatBdCurrency(p.cost_price)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase">Sell Price</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatBdCurrency(p.sell_price)}
                        </span>
                      </div>
                      {pkg && (
                        <div className="col-span-2 pt-1 border-t border-slate-200/50 dark:border-slate-700/50 text-[11px] text-slate-500">
                          Conversion: 1 {pkg.packaging_unit} = {pkg.conversion_ratio} {pkg.base_unit}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setViewingProduct(p)}
                        className="px-2.5 py-1 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-1 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-semibold flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => setProductToDelete(p)}
                        className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Standard Pagination Component */}
        {filteredProducts.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredProducts.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ================================================================ */}
      {/* 4. Unified Add / Edit Product Modal (Rule 9)                     */}
      {/* ================================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Sticky Header: Deep Navy Blue & Electric Blue gradient per Rule 9.2 */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {editingProduct ? "Edit Electrical Product" : "Add New Electrical Product"}
                </h3>
              </div>

              {/* 28px x 28px circular red close button per Rule 3 & 9 */}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Base Product Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" />
                  1. General Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.product_name}
                      onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                      placeholder="e.g. BRB 2.5 RM BYA Cable / Schneider 16A SP MCB"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0] focus:ring-2 focus:ring-[#1E65A0]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Barcode / Product Code
                    </label>
                    <input
                      type="text"
                      value={formData.product_code}
                      onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                      placeholder="Leave blank to auto-generate (PE-00001)"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Brand *
                    </label>
                    <CustomSelect
                      options={brands.map((b) => ({
                        value: String(b.id),
                        label: b.name || "Brand",
                      }))}
                      value={formData.brand_id}
                      onChange={(val) => setFormData({ ...formData, brand_id: String(val) })}
                      placeholder="Select Brand"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Category *
                    </label>
                    <CustomSelect
                      options={categories.map((c) => ({
                        value: String(c.id),
                        label: c.category_name || "Category",
                      }))}
                      value={formData.category_id}
                      onChange={(val) => setFormData({ ...formData, category_id: String(val), sub_category_id: "" })}
                      placeholder="Select Category"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Subcategory
                    </label>
                    <CustomSelect
                      options={[
                        { value: "", label: "None / General" },
                        ...subCategories
                          .filter((sc) => !formData.category_id || String(sc.category_id) === formData.category_id)
                          .map((sc) => ({
                            value: String(sc.id),
                            label: sc.name || sc.sub_category_name || "Subcategory",
                          })),
                      ]}
                      value={formData.sub_category_id}
                      onChange={(val) => setFormData({ ...formData, sub_category_id: String(val) })}
                      placeholder="Select Subcategory"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Base Retail Unit *
                    </label>
                    <CustomSelect
                      options={units.map((u) => ({
                        value: String(u.id),
                        label: u.unit_name || "Unit",
                      }))}
                      value={formData.unit_id}
                      onChange={(val) => setFormData({ ...formData, unit_id: String(val) })}
                      placeholder="Select Unit (Meter / Pcs)"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cost Price (৳) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sell Price (৳) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.sell_price}
                      onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Wholesale Price (৳)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.wholesale_price}
                      onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                      placeholder="0.00"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="0"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Warranty Period (Months)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.warranty_months}
                      onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
                      placeholder="0 (No Warranty)"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                    />
                  </div>
                </div>
              </div>

              {/* Electrical Specifications */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    2. Electrical Specifications
                  </h4>
                  <span className="text-[10px] text-slate-400">Select product spec type</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Electrical Specification Category
                    </label>
                    <CustomSelect
                      options={SPEC_TYPE_OPTIONS.filter((o) => o.value !== "all")}
                      value={formData.spec_type}
                      onChange={(val) => setFormData({ ...formData, spec_type: String(val) })}
                      placeholder="Select Specification Category"
                    />
                  </div>

                  {/* Dynamic Fields for CABLE */}
                  {formData.spec_type === "CABLE" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cable Size (RM / Gauge)
                        </label>
                        <input
                          type="text"
                          list="cable-sizes"
                          value={formData.cable_size}
                          onChange={(e) => setFormData({ ...formData, cable_size: e.target.value })}
                          placeholder="e.g. 1.5 RM BYA, 2.5 RM"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                        <datalist id="cable-sizes">
                          {CABLE_SIZES.map((s) => (
                            <option key={s} value={s} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Conductor Material
                        </label>
                        <CustomSelect
                          value={formData.conductor_material}
                          onChange={(val) => setFormData({ ...formData, conductor_material: val })}
                          options={[
                            { value: "Copper", label: "Copper (CU)" },
                            { value: "Aluminium", label: "Aluminium (AL)" },
                          ]}
                          placeholder="Select Material"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Core Count
                        </label>
                        <CustomSelect
                          value={formData.core_count}
                          onChange={(val) => setFormData({ ...formData, core_count: val })}
                          options={[
                            { value: "1", label: "1 Core (Single Core)" },
                            { value: "2", label: "2 Core" },
                            { value: "3", label: "3 Core" },
                            { value: "4", label: "4 Core" },
                          ]}
                          placeholder="Select Cores"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Voltage Grade
                        </label>
                        <input
                          type="text"
                          value={formData.voltage_grade}
                          onChange={(e) => setFormData({ ...formData, voltage_grade: e.target.value })}
                          placeholder="e.g. 450/750V"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Dynamic Fields for BREAKER */}
                  {formData.spec_type === "BREAKER" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Current Rating (Amps)
                        </label>
                        <input
                          type="text"
                          list="breaker-currents"
                          value={formData.current_rating}
                          onChange={(e) => setFormData({ ...formData, current_rating: e.target.value })}
                          placeholder="e.g. 16A, 32A, 63A"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                        <datalist id="breaker-currents">
                          {BREAKER_CURRENTS.map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Pole Configuration
                        </label>
                        <CustomSelect
                          value={formData.pole_type}
                          onChange={(val) => setFormData({ ...formData, pole_type: val })}
                          options={[
                            { value: "", label: "Select Pole Type" },
                            ...BREAKER_POLES.map((p) => ({ value: p, label: p })),
                          ]}
                          placeholder="Select Pole Type"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Breaking Capacity (kA)
                        </label>
                        <CustomSelect
                          value={formData.breaking_capacity}
                          onChange={(val) => setFormData({ ...formData, breaking_capacity: val })}
                          options={[
                            { value: "", label: "Select kA Rating" },
                            ...BREAKING_CAPACITIES.map((k) => ({ value: k, label: k })),
                          ]}
                          placeholder="Select kA Rating"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Tripping Curve
                        </label>
                        <CustomSelect
                          value={formData.tripping_curve}
                          onChange={(val) => setFormData({ ...formData, tripping_curve: val })}
                          options={[
                            { value: "B", label: "B Curve" },
                            { value: "C", label: "C Curve (Standard)" },
                            { value: "D", label: "D Curve (Industrial/Motor)" },
                          ]}
                          placeholder="Select Tripping Curve"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Dynamic Fields for SWITCH */}
                  {formData.spec_type === "SWITCH" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Gang Module / Type
                        </label>
                        <CustomSelect
                          value={formData.gang_module}
                          onChange={(val) => setFormData({ ...formData, gang_module: val })}
                          options={[
                            { value: "", label: "Select Module Type" },
                            ...SWITCH_GANGS.map((g) => ({ value: g, label: g })),
                          ]}
                          placeholder="Select Module Type"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Current Rating
                        </label>
                        <input
                          type="text"
                          value={formData.current_rating}
                          onChange={(e) => setFormData({ ...formData, current_rating: e.target.value })}
                          placeholder="e.g. 10A, 13A, 16A"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Dynamic Fields for LIGHTING */}
                  {formData.spec_type === "LIGHTING" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Wattage (Watts)
                        </label>
                        <input
                          type="text"
                          list="light-watts"
                          value={formData.wattage}
                          onChange={(e) => setFormData({ ...formData, wattage: e.target.value })}
                          placeholder="e.g. 9W, 12W, 18W"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                        <datalist id="light-watts">
                          {LIGHT_WATTAGES.map((w) => (
                            <option key={w} value={w} />
                          ))}
                        </datalist>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Color Temperature
                        </label>
                        <CustomSelect
                          value={formData.color_temperature}
                          onChange={(val) => setFormData({ ...formData, color_temperature: val })}
                          options={[
                            { value: "", label: "Select Color Temp" },
                            ...COLOR_TEMPS.map((t) => ({ value: t, label: t })),
                          ]}
                          placeholder="Select Color Temp"
                          className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  {/* Dynamic Fields for CONDUIT */}
                  {formData.spec_type === "CONDUIT" && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Conduit Diameter (mm / inch)
                      </label>
                      <CustomSelect
                        value={formData.conduit_diameter}
                        onChange={(val) => setFormData({ ...formData, conduit_diameter: val })}
                        options={[
                          { value: "", label: "Select Diameter" },
                          ...CONDUIT_SIZES.map((d) => ({ value: d, label: d })),
                        ]}
                        placeholder="Select Diameter"
                        className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Packaging Conversion */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-500" />
                    3. Packaging Unit Conversion (Optional)
                  </h4>
                  <span className="text-[10px] text-slate-400">e.g. 1 Reel = 100 Meters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Bulk Packaging Unit
                    </label>
                    <CustomSelect
                      value={formData.packaging_unit}
                      onChange={(val) => setFormData({ ...formData, packaging_unit: val })}
                      options={[
                        { value: "", label: "None / Single Unit" },
                        ...PACKAGING_UNITS.map((p) => ({ value: p, label: p })),
                      ]}
                      placeholder="None / Single Unit"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Conversion Ratio (Units per Package)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={formData.conversion_ratio}
                      onChange={(e) => setFormData({ ...formData, conversion_ratio: e.target.value })}
                      placeholder="e.g. 100 for 100 Meters per Reel"
                      className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {formData.packaging_unit && formData.conversion_ratio && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    Rule: 1 {formData.packaging_unit} will contain {formData.conversion_ratio} base units in stock and sales receipts.
                  </p>
                )}
              </div>

              {/* Sticky Footer: Cancel (Red) & Save (Brand Gradient) per Rule 9.4 */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-70"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingProduct ? "Update Product" : "Save Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 5. View Product Details Modal                                    */}
      {/* ================================================================ */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm text-white">Electrical Product Specifications</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {viewingProduct.primary_code}
                  </span>
                  <span className="text-xs font-bold text-[#1E65A0] dark:text-blue-400">
                    {viewingProduct.brand}
                  </span>
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {viewingProduct.product_name}
                </h4>
                <p className="text-xs text-slate-500">Category: {viewingProduct.category}</p>
              </div>

              {/* Price & Stock Card */}
              <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Cost Price</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatBdCurrency(viewingProduct.cost_price)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Sell Price</span>
                  <span className="font-bold text-[#0B3D91] dark:text-blue-300">
                    {formatBdCurrency(viewingProduct.sell_price)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Stock</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {viewingProduct.quantity} {viewingProduct.unit}
                  </span>
                </div>
              </div>

              {/* Electrical Specs Details */}
              {viewingProduct.electrical_spec ? (
                <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 space-y-2 text-xs">
                  <h5 className="font-bold text-[#0B3D91] dark:text-blue-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Technical Details
                  </h5>

                  <div className="grid grid-cols-2 gap-2 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Spec Type:</span>
                      <span className="font-semibold">{viewingProduct.electrical_spec.spec_type}</span>
                    </div>
                    {viewingProduct.electrical_spec.cable_size && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cable Size:</span>
                        <span className="font-bold">{viewingProduct.electrical_spec.cable_size}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.conductor_material && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Conductor:</span>
                        <span className="font-semibold">{viewingProduct.electrical_spec.conductor_material}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.voltage_grade && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Voltage:</span>
                        <span className="font-semibold">{viewingProduct.electrical_spec.voltage_grade}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.current_rating && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Ampere:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{viewingProduct.electrical_spec.current_rating}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.pole_type && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pole:</span>
                        <span className="font-semibold">{viewingProduct.electrical_spec.pole_type}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.breaking_capacity && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Capacity:</span>
                        <span className="font-semibold">{viewingProduct.electrical_spec.breaking_capacity}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.wattage && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Wattage:</span>
                        <span className="font-bold">{viewingProduct.electrical_spec.wattage}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.gang_module && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Gang / Module:</span>
                        <span className="font-semibold">{viewingProduct.electrical_spec.gang_module}</span>
                      </div>
                    )}
                    {viewingProduct.electrical_spec.warranty_months !== undefined && (
                      <div>
                        <span className="text-[10px] text-slate-400 block">Warranty:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {(viewingProduct.electrical_spec.warranty_months ?? 0) > 0
                            ? `${viewingProduct.electrical_spec.warranty_months} Months`
                            : "No Warranty"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific electrical specs configured.</p>
              )}

              {/* Packaging Conversion */}
              {viewingProduct.packaging_conversions && viewingProduct.packaging_conversions.length > 0 && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Packaging Conversion
                  </span>
                  {viewingProduct.packaging_conversions.map((pkg) => (
                    <p key={pkg.id} className="font-bold text-slate-800 dark:text-slate-200">
                      1 {pkg.packaging_unit} = {pkg.conversion_ratio} {pkg.base_unit}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 6. Bulk Price Update Modal                                       */}
      {/* ================================================================ */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-amber-300" />
                <h3 className="font-bold text-sm text-white">Bulk Price Update (%)</h3>
              </div>
              <button
                type="button"
                onClick={() => setBulkModalOpen(false)}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleBulkPriceSubmit} className="p-5 space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Adjust prices by percentage across a whole brand or currently selected products (e.g. enter <strong className="text-slate-800 dark:text-white">5</strong> for +5% increase or <strong className="text-slate-800 dark:text-white">-3</strong> for 3% reduction).
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Scope
                </label>
                {bulkSelectedIds.size > 0 ? (
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 text-xs font-bold text-[#1E65A0] dark:text-blue-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>Applying to {bulkSelectedIds.size} individually selected products</span>
                  </div>
                ) : (
                  <CustomSelect
                    options={[
                      { value: "all", label: "Select a Brand..." },
                      ...brands.map((b) => ({
                        value: String(b.id),
                        label: b.name || "Brand",
                      })),
                    ]}
                    value={bulkBrandId}
                    onChange={(val) => setBulkBrandId(String(val))}
                    placeholder="Choose Brand"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Percentage Change (%) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={bulkPercentage}
                  onChange={(e) => setBulkPercentage(e.target.value)}
                  placeholder="e.g. 5 for +5% or -5 for -5%"
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Price to Update
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkTargetField("sell_price")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${bulkTargetField === "sell_price"
                        ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                        : "border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    Sell Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetField("cost_price")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${bulkTargetField === "cost_price"
                        ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                        : "border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    Cost Price
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkTargetField("both")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${bulkTargetField === "both"
                        ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                        : "border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-300"
                      }`}
                  >
                    Both
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setBulkModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-70"
                >
                  {bulkSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Apply Price Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 7. Product CSV Import Modal                                      */}
      {/* ================================================================ */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Import Electrical Catalog (CSV)</h2>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100">
                  <div className="text-slate-700 dark:text-slate-300">
                    <span className="font-bold block">Need standard format?</span>
                    Download the pre-configured CSV template with electrical fields.
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleCsv}
                    className="px-3 py-1.5 bg-[#0B3D91] text-white rounded-lg text-xs font-bold hover:opacity-95"
                  >
                    Template (.csv)
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Select CSV File (.csv) *
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1E65A0] file:text-white hover:file:bg-[#0B3D91] cursor-pointer"
                  />
                </div>

                {importResult && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-2 border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between">
                      <span>Import Results:</span>
                      <span className="text-emerald-600 font-bold">
                        {importResult.imported_count} Added Successfully
                      </span>
                    </div>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <div className="text-[11px] text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        <span className="font-bold block">Row warnings/errors:</span>
                        {importResult.errors.map((err: any, idx: number) => (
                          <div key={idx}>
                            Row #{err.row}: {err.error}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing || !importFile}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {importing ? "Importing..." : "Start Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 8. Delete Confirmation Modal                                     */}
      {/* ================================================================ */}
      <DeleteConfirmModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Electrical Product"
        itemName={productToDelete?.product_name || "this product"}
        warningMessage="Are you sure you want to delete this electrical product? This action cannot be undone."
        loading={deleting}
      />

      {/* Clean Print-Only Catalog Sheet (Details + Multi-Page Table) */}
      <PrintTableSheet {...printCatalogPayload} />
    </div>
  );
}
