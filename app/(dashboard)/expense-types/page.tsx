"use client";

import { useEffect, useState } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  Layers,
  CheckCircle2,
  XCircle,
  TrendingDown,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { Pagination, DeleteConfirmModal } from "@/components/ui";

interface ExpenseType {
  id: number;
  type_name: string;
  status: string;
  total_records: number;
  total_amount: number;
  created_at: string;
}

export default function ExpenseTypesPage() {
  const { toast } = useToast();
  const [types, setTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ExpenseType | null>(null);
  const [typeName, setTypeName] = useState("");
  const [status, setStatus] = useState("Active");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [typeToDelete, setTypeToDelete] = useState<ExpenseType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadExpenseTypes = async () => {
    try {
      setLoading(true);
      const url = search
        ? `/api/expense-types?search=${encodeURIComponent(search)}`
        : "/api/expense-types";
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setTypes(data.data);
      }
    } catch (err) {
      console.error("Failed to load expense types", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenseTypes();
  }, [search]);

  const handleOpenAdd = () => {
    setSelectedType(null);
    setTypeName("");
    setStatus("Active");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: ExpenseType) => {
    setSelectedType(item);
    setTypeName(item.type_name);
    setStatus(item.status || "Active");
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      setErrorMsg("Please enter an expense category name!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const url = selectedType
        ? `/api/expense-types/${selectedType.id}`
        : "/api/expense-types";
      const method = selectedType ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_name: typeName.trim(),
          status,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsModalOpen(false);
        toast.success(
          selectedType
            ? "Expense category updated successfully!"
            : "Expense category created successfully!"
        );
        setCurrentPage(1);
        loadExpenseTypes();
      } else {
        setErrorMsg(data.message || "Operation failed");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ExpenseType) => {
    if (item.total_records > 0) {
      toast.error(
        `Cannot delete "${item.type_name}" because it already has ${item.total_records} expense records.`
      );
      return;
    }
    setDeleteError(null);
    setTypeToDelete(item);
  };

  const confirmDeleteType = async () => {
    if (!typeToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/expense-types/${typeToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Expense category deleted successfully!");
        setTypeToDelete(null);
        setCurrentPage(1);
        loadExpenseTypes();
      } else {
        setDeleteError(data.message || "Failed to delete expense type");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Communication error deleting expense category");
    } finally {
      setIsDeleting(false);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedTypes = types.slice(startIndex, startIndex + pageSize);

  // KPI Calculations
  const totalTypes = types.length;
  const activeTypes = types.filter((t) => t.status === "Active").length;
  const grandTotalSpent = types.reduce((acc, t) => acc + (t.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Expense Categories & Heads
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Manage cost classification heads for showroom expenses and utilities
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/expenses"
            className="h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Expenses</span>
          </Link>
          <button
            onClick={handleOpenAdd}
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Categories</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {totalTypes}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Classified overhead heads
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Active Heads</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {activeTypes}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Available for daily vouchers
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Cumulative Spent</span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatBdCurrency(grandTotalSpent)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Recorded lifetime spending
          </div>
        </div>
      </div>

      {/* 3. Search & Control Bar */}
      <div className="bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search expense category name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong className="text-slate-800 dark:text-white">{types.length}</strong> categories
        </div>
      </div>

      {/* 4. Desktop Table (Rule 5.3 & 5.4: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-4 w-12 text-center">SL</th>
                <th className="py-3 px-4">Expense Category Name</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Total Vouchers</th>
                <th className="py-3 px-4 text-right">Total Spent (৳)</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading expense categories...</span>
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    No expense categories found.
                  </td>
                </tr>
              ) : (
                displayedTypes.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-600" />
                        <span>{item.type_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          item.status === "Active"
                            ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700"
                        }`}
                      >
                        {item.status === "Active" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-400" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {item.total_records}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-xs">
                      {formatBdCurrency(item.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={item.total_records > 0}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                            item.total_records > 0
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
                              : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                          }`}
                          title={
                            item.total_records > 0
                              ? "Cannot delete (records attached)"
                              : "Delete Category"
                          }
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

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={types.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {displayedTypes.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 dark:text-white">
                  {item.type_name}
                </h3>
                <span className="text-[10px] text-slate-400">
                  {item.total_records} vouchers recorded
                </span>
              </div>
              <span className="font-black text-xs text-rose-600">
                {formatBdCurrency(item.total_amount)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  item.status === "Active"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {item.status}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(item)}
                  className="h-[30px] px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={item.total_records > 0}
                  className={`h-[30px] px-2 rounded-lg text-xs font-bold ${
                    item.total_records > 0
                      ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                      : "bg-rose-50 text-rose-600"
                  }`}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={types.length}
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

      {/* 6. ADD / EDIT EXPENSE TYPE MODAL (Strict Rule 6.1 - 6.4) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            {/* Sticky Header: Solid Emerald #15803d, Circular Red Close #dc2626 */}
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  {selectedType ? "Edit Expense Category" : "Add Expense Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill, Shop Rent, Staff Conveyance"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  placeholder="Select Status"
                />
              </div>

              {/* Sticky Footer: Cancel Red #dc2626, Save Emerald #15803d */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!typeToDelete}
        onClose={() => {
          if (!isDeleting) {
            setTypeToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDeleteType}
        title="Delete Expense Category"
        itemName={typeToDelete ? typeToDelete.type_name : ""}
        description="Are you sure you want to delete this expense category? Categories with active expense entries cannot be removed."
        loading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
