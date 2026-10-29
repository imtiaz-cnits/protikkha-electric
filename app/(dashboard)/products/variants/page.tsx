"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Tag,
  Barcode,
  Boxes,
  Package,
  Sliders,
} from "lucide-react";
import { CustomSelect, Pagination, DeleteConfirmModal } from "@/components/ui";
import { formatBdCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

interface VariantItem {
  id: number;
  product_id: number;
  product_name: string;
  category_name: string;
  brand_name: string;
  variant_name: string;
  sku: string;
  barcode: string;
  cost_price: number;
  sell_price: number;
  wholesale_price: number;
  stock_quantity: number;
  status: string;
  attributes?: any;
}

interface ProductOption {
  id: number;
  product_name: string;
}

export default function ProductVariantsPage() {
  const { toast } = useToast();
  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VariantItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<VariantItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    product_id: "",
    variant_name: "",
    sku: "",
    barcode: "",
    cost_price: "",
    sell_price: "",
    wholesale_price: "",
    stock_quantity: "",
    status: "active",
    attribute_color: "",
    attribute_rating: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const url =
        selectedProduct === "all"
          ? "/api/products/variants"
          : `/api/products/variants?product_id=${selectedProduct}`;
      const [varRes, prodRes] = await Promise.all([
        fetch(url),
        fetch("/api/products?limit=all"),
      ]);

      const varData = await varRes.json();
      const prodData = await prodRes.json();

      if (varData.status === "success") setVariants(varData.data || []);
      if (prodData.status === "success") {
        setProducts(
          (prodData.data || []).map((p: any) => ({
            id: p.id,
            product_name: p.product_name || p.name,
          }))
        );
      }
    } catch {
      toast.error("Error loading variants");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedProduct]);

  const filtered = variants.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.variant_name.toLowerCase().includes(term) ||
      v.product_name.toLowerCase().includes(term) ||
      v.sku.toLowerCase().includes(term) ||
      v.barcode.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function openCreate() {
    setEditingItem(null);
    setFormData({
      product_id: products.length > 0 ? String(products[0].id) : "",
      variant_name: "",
      sku: "",
      barcode: "",
      cost_price: "",
      sell_price: "",
      wholesale_price: "",
      stock_quantity: "0",
      status: "active",
      attribute_color: "",
      attribute_rating: "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: VariantItem) {
    setEditingItem(item);
    setFormData({
      product_id: String(item.product_id),
      variant_name: item.variant_name,
      sku: item.sku,
      barcode: item.barcode,
      cost_price: String(item.cost_price),
      sell_price: String(item.sell_price),
      wholesale_price: String(item.wholesale_price),
      stock_quantity: String(item.stock_quantity),
      status: item.status,
      attribute_color: item.attributes?.color || "",
      attribute_rating: item.attributes?.rating || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.product_id) {
      setError("Please select a base product");
      return;
    }
    if (!formData.variant_name.trim()) {
      setError("Variant name is required (e.g. Red / 16A / 100m)");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = editingItem
        ? `/api/products/variants/${editingItem.id}`
        : "/api/products/variants";
      const method = editingItem ? "PUT" : "POST";

      const payload = {
        product_id: formData.product_id,
        variant_name: formData.variant_name.trim(),
        sku: formData.sku.trim() || undefined,
        barcode: formData.barcode.trim() || undefined,
        cost_price: formData.cost_price,
        sell_price: formData.sell_price,
        wholesale_price: formData.wholesale_price || formData.sell_price,
        stock_quantity: formData.stock_quantity,
        status: formData.status,
        attributes: {
          color: formData.attribute_color || undefined,
          rating: formData.attribute_rating || undefined,
        },
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.status === "success") {
        toast.success(
          editingItem
            ? "Variant updated successfully"
            : "Variant created successfully"
        );
        setModalOpen(false);
        loadData();
      } else {
        setError(data.message || "Failed to save variant");
      }
    } catch (err: any) {
      setError(err?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/variants/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Variant deleted successfully");
        setItemToDelete(null);
        loadData();
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch {
      toast.error("Failed to delete variant");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center font-bold">
            <Sliders className="w-5 h-5 text-[#0B3D91] dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
              Product Variants / প্রোডাক্ট ভ্যারিয়েন্ট
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage sellable size, color, rating, and packaging combinations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#093276] hover:to-[#185384] text-white text-xs font-bold shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Variant
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search variant, SKU, barcode..."
              className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
            />
          </div>

          {/* Product Filter */}
          <div className="w-full sm:w-72">
            <CustomSelect
              value={selectedProduct}
              onChange={(val) => {
                setSelectedProduct(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Products (সব পণ্য)" },
                ...products.map((p) => ({
                  value: String(p.id),
                  label: p.product_name,
                })),
              ]}
              placeholder="Filter by Product"
              className="w-full h-[38px] text-xs"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Total: <strong>{filtered.length}</strong> variants
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Variant Name</th>
                <th className="py-3 px-4">Base Product</th>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4 text-right">Retail Price</th>
                <th className="py-3 px-4 text-right">Wholesale Price</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B3D91]" />
                    Loading variants...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No product variants found.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-800 dark:text-white block">
                        {item.variant_name}
                      </span>
                      {item.attributes && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.attributes.color && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded font-medium text-slate-600 dark:text-slate-400">
                              Color: {item.attributes.color}
                            </span>
                          )}
                          {item.attributes.rating && (
                            <span className="text-[10px] bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded font-bold text-amber-700 dark:text-amber-400">
                              {item.attributes.rating}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate max-w-xs">
                        {item.product_name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.brand_name} • {item.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      <span className="block text-slate-700 dark:text-slate-300">
                        {item.sku || "N/A"}
                      </span>
                      {item.barcode && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          {item.barcode}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-white">
                      {formatBdCurrency(item.sell_price)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-400">
                      {formatBdCurrency(item.wholesale_price)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs">
                        <Boxes className="w-3 h-3 text-slate-400" />
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "active"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center cursor-pointer transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="w-8 h-8 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 flex items-center justify-center cursor-pointer transition-colors"
                          title="Delete"
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

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B3D91]" />
            Loading variants...
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800">
            No variants found.
          </div>
        ) : (
          paginated.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {item.variant_name}
                  </h3>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {item.product_name}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-600">
                  {formatBdCurrency(item.sell_price)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Wholesale</span>
                  <span className="font-bold text-amber-600">
                    {formatBdCurrency(item.wholesale_price)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Stock</span>
                  <span className="font-bold">{item.stock_quantity} in stock</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => openEdit(item)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setItemToDelete(item)}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-[#cbd5e1] dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  {editingItem ? "Edit Variant" : "Create Product Variant"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Base Product <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formData.product_id}
                  onChange={(val) => setFormData({ ...formData, product_id: val })}
                  options={products.map((p) => ({
                    value: String(p.id),
                    label: p.product_name,
                  }))}
                  placeholder="Select Product"
                  className="w-full h-[42px] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Variant Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.variant_name}
                  onChange={(e) =>
                    setFormData({ ...formData, variant_name: e.target.value })
                  }
                  placeholder="e.g. Red / 2.5 RM / 16A"
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Auto-generated if empty"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Scan or auto-generate"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cost Price (৳)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    placeholder="0"
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Retail Price (৳) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formData.sell_price}
                    onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                    placeholder="0"
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold"
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
                    placeholder="0"
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-amber-600 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Color / Finish
                  </label>
                  <input
                    type="text"
                    value={formData.attribute_color}
                    onChange={(e) => setFormData({ ...formData, attribute_color: e.target.value })}
                    placeholder="e.g. Red, Black, Matte Silver"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rating / Size
                  </label>
                  <input
                    type="text"
                    value={formData.attribute_rating}
                    onChange={(e) => setFormData({ ...formData, attribute_rating: e.target.value })}
                    placeholder="e.g. 16A / 100m / 9W"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Sticky Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-[38px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#093276] hover:to-[#185384] text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? "Update Variant" : "Save Variant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setItemToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Variant"
          warningMessage={`Are you sure you want to delete variant "${itemToDelete.variant_name}"?`}
          loading={deleting}
        />
      )}
    </div>
  );
}
