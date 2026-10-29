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
  FolderTree,
  Tag,
  Package,
} from "lucide-react";
import { CustomSelect, Pagination, DeleteConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface SubCategoryItem {
  id: number;
  sub_category_name: string;
  category_id: number;
  category_name: string;
  product_count: number;
  status: string;
  created_at: string;
}

interface CategoryOption {
  id: number;
  category_name: string;
}

export default function SubCategoriesPage() {
  const { toast } = useToast();
  const [subcategories, setSubcategories] = useState<SubCategoryItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SubCategoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<SubCategoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    sub_category_name: "",
    category_id: "",
    status: "active",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        fetch(`/api/sub-categories?category_id=${selectedCategory}`),
        fetch("/api/categories"),
      ]);

      const subData = await subRes.json();
      const catData = await catRes.json();

      if (subData.status === "success") setSubcategories(subData.data || []);
      if (catData.status === "success") setCategories(catData.data || []);
    } catch (err: any) {
      toast.error("Error loading subcategories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  const filtered = subcategories.filter((s) => {
    const term = search.toLowerCase();
    const matchSearch =
      s.sub_category_name.toLowerCase().includes(term) ||
      s.category_name.toLowerCase().includes(term);
    return matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  function openCreate() {
    setEditingItem(null);
    setFormData({
      sub_category_name: "",
      category_id: categories.length > 0 ? String(categories[0].id) : "",
      status: "active",
    });
    setError("");
    setModalOpen(true);
  }

  function openEdit(item: SubCategoryItem) {
    setEditingItem(item);
    setFormData({
      sub_category_name: item.sub_category_name,
      category_id: String(item.category_id),
      status: item.status,
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.sub_category_name.trim()) {
      setError("Subcategory name is required");
      return;
    }
    if (!formData.category_id) {
      setError("Please select a parent category");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const url = editingItem
        ? `/api/sub-categories/${editingItem.id}`
        : "/api/sub-categories";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.status === "success") {
        toast.success(
          editingItem
            ? "Subcategory updated successfully"
            : "Subcategory created successfully"
        );
        setModalOpen(false);
        loadData();
      } else {
        setError(data.message || "Operation failed");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sub-categories/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Subcategory deleted successfully");
        setItemToDelete(null);
        loadData();
      } else {
        toast.error(data.message || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete subcategory");
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
            <FolderTree className="w-5 h-5 text-[#0B3D91] dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
              Subcategories / সাবক্যাটাগরি
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Organize electrical items into structured sub-classifications
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#093276] hover:to-[#185384] text-white text-xs font-bold shadow-md shadow-blue-900/10 flex items-center gap-2 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Subcategory
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
              placeholder="Search subcategory..."
              className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
            />
          </div>

          {/* Parent Category Filter */}
          <div className="w-full sm:w-64">
            <CustomSelect
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "all", label: "All Categories (সব ক্যাটাগরি)" },
                ...categories.map((c) => ({
                  value: String(c.id),
                  label: c.category_name,
                })),
              ]}
              placeholder="Filter by Category"
              className="w-full h-[38px] text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Total: <strong>{filtered.length}</strong> subcategories</span>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-16">#ID</th>
                <th className="py-3 px-4">Subcategory Name</th>
                <th className="py-3 px-4">Parent Category</th>
                <th className="py-3 px-4 text-center">Products</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B3D91]" />
                    Loading subcategories...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No subcategories found.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-400">
                      #{item.id}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-white">
                      {item.sub_category_name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#0B3D91] dark:text-blue-300 font-semibold border border-blue-100 dark:border-blue-900/50">
                        <Tag className="w-3 h-3 text-amber-500" />
                        {item.category_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold">
                        <Package className="w-3 h-3 text-slate-400" />
                        {item.product_count}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === "active"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                        }`}
                      >
                        {item.status === "active" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
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
            Loading subcategories...
          </div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800">
            No subcategories found.
          </div>
        ) : (
          paginated.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block">
                    #{item.id}
                  </span>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    {item.sub_category_name}
                  </h3>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    item.status === "active"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">Parent Category</span>
                  <span className="font-semibold text-[#0B3D91] dark:text-blue-400">
                    {item.category_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Products</span>
                  <span className="font-bold">{item.product_count} items</span>
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
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#cbd5e1] dark:border-[#334155] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold tracking-wide">
                  {editingItem ? "Edit Subcategory" : "Create Subcategory"}
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
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parent Category <span className="text-rose-500">*</span>
                </label>
                <CustomSelect
                  value={formData.category_id}
                  onChange={(val) => setFormData({ ...formData, category_id: val })}
                  options={categories.map((c) => ({
                    value: String(c.id),
                    label: c.category_name,
                  }))}
                  placeholder="Select Category"
                  className="w-full h-[42px] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subcategory Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sub_category_name}
                  onChange={(e) =>
                    setFormData({ ...formData, sub_category_name: e.target.value })
                  }
                  placeholder="e.g. Flexible Twin & Multi-Core Cables"
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <CustomSelect
                  value={formData.status}
                  onChange={(val) => setFormData({ ...formData, status: val })}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  placeholder="Select Status"
                  className="w-full h-[42px] text-xs"
                />
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
                  {editingItem ? "Update Subcategory" : "Create Subcategory"}
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
          title="Delete Subcategory"
          warningMessage={`Are you sure you want to delete "${itemToDelete.sub_category_name}"?`}
          loading={deleting}
        />
      )}
    </div>
  );
}
