"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Tag,
  Search,
  Edit2,
  Percent,
  CheckCircle,
  X,
  Loader2,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface PriceItem {
  id: number;
  name: string;
  code: string;
  category: string;
  brand: string;
  unit: string;
  spec: string;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  retail_margin: string;
  wholesale_margin: string;
  status: string;
}

export default function PriceListsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<PriceItem[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Edit Modal
  const [editingItem, setEditingItem] = useState<PriceItem | null>(null);
  const [editRetail, setEditRetail] = useState("");
  const [editWholesale, setEditWholesale] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [listRes, catRes] = await Promise.all([
        fetch(`/api/products/price-lists?category_id=${selectedCategory}`),
        fetch("/api/categories"),
      ]);

      const [listData, catData] = await Promise.all([listRes.json(), catRes.json()]);

      if (listData.status === "success") {
        setItems(listData.data || []);
      }
      if (catData.status === "success") {
        setCategories(
          (catData.data || []).map((c: any) => ({
            id: Number(c.id),
            name: c.category_name,
          }))
        );
      }
    } catch (err: any) {
      toast.error("Failed to load price lists");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const filteredItems = useMemo(() => {
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

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  function handleOpenEdit(item: PriceItem) {
    setEditingItem(item);
    setEditRetail(String(item.retail_price));
    setEditWholesale(String(item.wholesale_price));
  }

  async function handleSavePrice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/products/price-lists", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem.id,
          retail_price: parseFloat(editRetail),
          wholesale_price: parseFloat(editWholesale),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to update prices");
      }

      toast.success(`Price updated for ${editingItem.name}`);
      setEditingItem(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to save prices");
    } finally {
      setSubmitting(false);
    }
  }

  function exportCSV() {
    if (items.length === 0) return;
    const headers = [
      "Code",
      "Product Name",
      "Category",
      "Brand",
      "Unit",
      "Cost Price",
      "Retail Price",
      "Wholesale Price",
      "Retail Margin %",
      "Wholesale Margin %",
    ];
    const rows = items.map((i) => [
      `"${i.code}"`,
      `"${i.name}"`,
      `"${i.category}"`,
      `"${i.brand}"`,
      `"${i.unit}"`,
      i.cost_price,
      i.retail_price,
      i.wholesale_price,
      `"${i.retail_margin}%"`,
      `"${i.wholesale_margin}%"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `price_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Retail & Wholesale Price Lists
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage electrical retail rates, contractor wholesale prices, and margin spreads
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Price Sheet</span>
        </button>
      </div>

      {/* 2. Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by code, product name, brand, or category..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="w-full md:w-64">
          <CustomSelect
            options={[
              { value: "all", label: "All Electrical Categories" },
              ...categories.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
            value={selectedCategory}
            onChange={(val) => {
              setSelectedCategory(String(val));
              setCurrentPage(1);
            }}
            placeholder="Filter Category"
          />
        </div>
      </div>

      {/* 3. Table / Mobile Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading price catalog...</span>
          </div>
        ) : paginatedItems.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No price records found matching your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table (Compact Full-Screen Fit) */}
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-2.5 w-[28%]">Product, Barcode &amp; Spec</th>
                    <th className="py-2.5 px-2.5 w-[16%]">Category &amp; Brand</th>
                    <th className="py-2.5 px-2 text-center w-[64px]">Unit</th>
                    <th className="py-2.5 px-2.5 text-right w-[105px]">Cost</th>
                    <th className="py-2.5 px-2.5 text-right w-[105px]">Retail</th>
                    <th className="py-2.5 px-2.5 text-right w-[110px]">Wholesale</th>
                    <th className="py-2.5 px-2 text-center w-[115px]">Margins</th>
                    <th className="py-2.5 px-2 text-center w-[56px]">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedItems.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2.5 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate" title={item.name}>
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-slate-200 dark:border-slate-700 truncate max-w-[130px]">
                            {item.code}
                          </span>
                          {item.spec && (
                            <span className="text-[10px] text-slate-400 font-semibold truncate">{item.spec}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-2.5 min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{item.category}</p>
                        <p className="text-[10px] text-slate-400 font-semibold truncate">{item.brand}</p>
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {item.unit}
                      </td>

                      <td className="py-2 px-2.5 text-right font-medium text-slate-500 whitespace-nowrap">
                        {formatBdCurrency(item.cost_price)}
                      </td>

                      <td className="py-2 px-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatBdCurrency(item.retail_price)}
                      </td>

                      <td className="py-2 px-2.5 text-right whitespace-nowrap">
                        <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                          {formatBdCurrency(item.wholesale_price)}
                        </span>
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1 text-[10px]">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Retail Margin">
                            R:{item.retail_margin}%
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="text-blue-600 dark:text-blue-400 font-bold" title="Wholesale Margin">
                            W:{item.wholesale_margin}%
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="w-7 h-7 mx-auto rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#1E65A0] text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginatedItems.map((item) => (
                <div key={item.id} className="pt-3 first:pt-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {item.code}
                      </span>
                      <h4 className="font-bold text-xs text-slate-800 dark:text-white mt-1">{item.name}</h4>
                      <p className="text-[10px] text-slate-400">{item.category} • {item.brand}</p>
                    </div>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Retail Price</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {formatBdCurrency(item.retail_price)} / {item.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Wholesale Rate</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatBdCurrency(item.wholesale_price)} / {item.unit}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={filteredItems.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Edit Price Settings</h3>
                <p className="text-[11px] text-blue-100 font-mono">{editingItem.code} - {editingItem.name}</p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePrice} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between">
                <div>
                  <span className="text-slate-400 block">Current Cost Price</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{formatBdCurrency(editingItem.cost_price)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Unit</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">{editingItem.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Retail Price (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editRetail}
                  onChange={(e) => setEditRetail(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Wholesale Price (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={editWholesale}
                  onChange={(e) => setEditWholesale(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="h-[38px] px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
