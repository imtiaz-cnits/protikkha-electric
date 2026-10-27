"use client";

import { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Pagination, CustomSelect, DeleteConfirmModal } from "@/components/ui";

interface UnitItem {
  id: number;
  unit_name: string;
  status: string;
}

export default function UnitsPage() {
  const { toast } = useToast();
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<UnitItem | null>(null);
  const [unitToDelete, setUnitToDelete] = useState<UnitItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/units");
      const data = await res.json();
      if (data.status === "success") setUnits(data.data || []);
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
    setEditingItem(null);
    setUnitName("");
    setStatus("active");
    setError("");
    setModalOpen(true);
  }

  function handleOpenEdit(u: UnitItem) {
    setEditingItem(u);
    setUnitName(u.unit_name);
    setStatus(u.status || "active");
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const url = editingItem ? `/api/units/${editingItem.id}` : "/api/units";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unit_name: unitName.trim(), status }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setError(data.message || "Failed to save unit");
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      setUnitName("");
      toast.success(editingItem ? "Unit updated successfully!" : "Unit created successfully!");
      setCurrentPage(1);
      loadData();
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(u: UnitItem) {
    setUnitToDelete(u);
  }

  async function confirmDelete() {
    if (!unitToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/units/${unitToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Unit deleted successfully!");
        setUnitToDelete(null);
        setCurrentPage(1);
        loadData();
      } else {
        toast.error(data.message || "Failed to delete unit");
        throw new Error(data.message || "Failed to delete unit");
      }
    } finally {
      setDeleting(false);
    }
  }

  const filtered = units.filter((u) =>
    u.unit_name.toLowerCase().includes(search.toLowerCase())
  );
  const startIndex = (currentPage - 1) * pageSize;
  const displayedUnits = filtered.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-slate-800 shadow-xs shrink-0">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none m-0 p-0">
              Units of Measurement
            </h1>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-4 h-[38px] bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Unit</span>
        </button>
      </div>

      {/* Search Header Box */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search units..."
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total: {filtered.length} Unit(s)
        </span>
      </div>

      {/* Main Table Card (Extracted below header box) */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                <th className="p-[10px] text-center w-[50px] rounded-tl-xl">SL</th>
                <th className="p-[10px]">Unit Name</th>
                <th className="p-[10px] text-center w-[140px]">Status</th>
                <th className="p-[10px] text-center w-[120px] rounded-tr-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-rose-600" />
                    Loading units...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400 font-medium">
                    No units found.
                  </td>
                </tr>
              ) : (
                displayedUnits.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="p-[10px] text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="p-[10px] font-bold text-slate-900 dark:text-white">
                      {u.unit_name}
                    </td>
                    <td className="p-[10px] text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          u.status?.toLowerCase() === "inactive"
                            ? "bg-rose-500 text-white"
                            : "bg-slate-400 text-white"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="p-[10px] text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit Unit"
                          className="w-7 h-7 rounded-lg border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-purple-600 hover:bg-purple-50 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete Unit"
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

        {/* Mobile View Card List */}
        <div className="block md:hidden p-3 space-y-3">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading units...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No units found.</div>
          ) : (
            displayedUnits.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-3.5 bg-white dark:bg-slate-800/60 shadow-xs flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">
                    {u.unit_name}
                  </h4>
                  <span
                    className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[9px] font-bold uppercase ${
                      u.status?.toLowerCase() === "inactive"
                        ? "bg-rose-500 text-white"
                        : "bg-slate-400 text-white"
                    }`}
                  >
                    {u.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="w-7 h-7 rounded-lg border border-purple-200 text-purple-600 flex items-center justify-center cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    className="w-7 h-7 rounded-lg border border-rose-200 text-rose-600 flex items-center justify-center cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* Add / Edit Unit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="sticky top-0 z-20 modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white tracking-tight m-0">
                {editingItem ? "Edit Unit" : "Add Unit"}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unit Name *
                </label>
                <input
                  type="text"
                  required
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="e.g. Pcs, Box, Kg, Pair, Set"
                  className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <CustomSelect
                  value={status}
                  onChange={(val) => setStatus(val)}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                  ]}
                  placeholder="Select Status"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-lg bg-[#dc2626] text-white font-semibold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(unitToDelete)}
        onClose={() => setUnitToDelete(null)}
        onConfirm={confirmDelete}
        title="Confirm Unit Deletion"
        recordIdentifier={unitToDelete ? `Unit: ${unitToDelete.unit_name}` : null}
        warningMessage="Are you sure you want to delete this unit? This action cannot be undone."
        isLoading={deleting}
      />
    </div>
  );
}
