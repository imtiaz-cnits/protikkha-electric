"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface AdjustmentItem {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  adjustment_type: string;
  quantity: number;
  stock_after: number;
  reason: string;
  reference_no: string;
  date: string;
}

export default function StockAdjustmentsPage() {
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [adjustType, setAdjustType] = useState("ADJUSTMENT");
  const [adjustQty, setAdjustQty] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [adjRes, prodRes] = await Promise.all([
        fetch("/api/inventory/adjustments"),
        fetch("/api/products?limit=100"),
      ]);
      const [adjData, prodData] = await Promise.all([adjRes.json(), prodRes.json()]);

      if (adjData.status === "success") setAdjustments(adjData.data || []);
      if (prodData.status === "success") setProducts(prodData.data || []);
    } catch (err: any) {
      toast.error("Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return adjustments;
    const q = search.toLowerCase().trim();
    return adjustments.filter(
      (a) =>
        a.product_name.toLowerCase().includes(q) ||
        a.reference_no.toLowerCase().includes(q) ||
        a.reason.toLowerCase().includes(q)
    );
  }, [adjustments, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  async function handleCreateAdjustment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || !adjustQty) {
      toast.error("Please select product and enter quantity");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProduct,
          adjustment_type: adjustType,
          quantity: parseFloat(adjustQty),
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to adjust stock");
      }

      toast.success("Stock adjustment recorded successfully");
      setModalOpen(false);
      setSelectedProduct("");
      setAdjustQty("");
      setReason("");
      await loadData();
      setCurrentPage(1);
    } catch (err: any) {
      toast.error(err?.message || "Error submitting adjustment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Stock Reconciliation & Scrap
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Record physical inventory count adjustments, damaged goods, and cable scrap
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Adjustment</span>
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by product name, adjustment code, or reason..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading adjustments...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No stock adjustment records found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Ref No</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Product</th>
                    <th className="py-3 px-3.5 text-center">Type</th>
                    <th className="py-3 px-3.5 text-right">Adjustment Qty</th>
                    <th className="py-3 px-3.5 text-right">New Stock</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Reason / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((a) => {
                    const isPositive = a.quantity > 0;
                    return (
                      <tr key={a.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {a.date}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                          {a.reference_no}
                        </td>
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{a.product_name}</p>
                          <span className="text-[10px] text-slate-400">{a.category}</span>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            a.adjustment_type === "SCRAP" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            a.adjustment_type === "DAMAGE" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                            "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}>
                            {a.adjustment_type}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold">
                          <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                            {isPositive ? `+${a.quantity}` : a.quantity} {a.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                          {a.stock_after} {a.unit}
                        </td>
                        <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                          {a.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((a) => (
                <div key={a.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{a.product_name}</h4>
                      <p className="text-[10px] text-slate-400">{a.date} • {a.reference_no}</p>
                    </div>
                    <span className="font-mono font-bold text-[11px]">
                      {a.quantity > 0 ? `+${a.quantity}` : a.quantity} {a.unit}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {a.reason}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">New Stock Adjustment</h3>
                <p className="text-[11px] text-blue-100">Adjust on-hand inventory or write off damaged/scrap material</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Product *
                </label>
                <CustomSelect
                  options={products.map((p) => ({
                    value: String(p.id),
                    label: `${p.product_name} (Current: ${p.quantity} ${p.unit || "Pcs"})`,
                  }))}
                  value={selectedProduct}
                  onChange={(val) => setSelectedProduct(String(val))}
                  placeholder="Choose Product"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Type *
                  </label>
                  <CustomSelect
                    options={[
                      { value: "ADJUSTMENT", label: "Inventory Reconciliation" },
                      { value: "DAMAGE", label: "Damaged Stock" },
                      { value: "SCRAP", label: "Cable Cut Scrap" },
                    ]}
                    value={adjustType}
                    onChange={(val) => setAdjustType(String(val))}
                    placeholder="Type"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Adjustment Qty (+ or -) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="e.g. -5 or +10"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Reason / Memo *
                </label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why stock is adjusted (e.g. physical count shortage, water damage, scrap piece)..."
                  className="w-full p-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  <span>Save Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
