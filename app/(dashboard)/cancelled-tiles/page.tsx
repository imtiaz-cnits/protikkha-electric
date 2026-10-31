"use client";

import { useEffect, useState } from "react";
import {
  Ban,
  Search,
  Eye,
  Trash2,
  RotateCcw,
  Undo2,
  Calendar,
  Loader2,
  AlertCircle,
  X,
  Package,
  CheckCircle2,
  Layers,
  ArrowRight,
  User,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { formatBoxAndPcs } from "@/lib/electrical-unit-service";
import { Pagination } from "@/components/ui/pagination";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface CancelledItemDetail {
  order_detail_id?: number;
  product_id: number;
  product_name: string;
  product_code?: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  unit?: string | null;
  category?: string | null;
  quantity: number;
  cancelled_boxes?: number;
  cancelled_pcs?: number;
  price: number;
  selling_price: number;
  line_total: number;
  stock_lifecycle_state?: string;
}

interface CancelledRecord {
  id: number;
  order_id: number;
  order_no: string;
  customer_id: number | null;
  customer_name: string;
  customer_mobile: string;
  total_amount: number;
  total_items: number;
  reason: string | null;
  cancelled_at: string;
  created_at: string;
  items: CancelledItemDetail[];
}

function formatItemBoxPcs(item: CancelledItemDetail): string {
  if (
    typeof item.cancelled_boxes === "number" &&
    typeof item.cancelled_pcs === "number"
  ) {
    if (item.cancelled_boxes > 0 && item.cancelled_pcs > 0) {
      return `${item.cancelled_boxes} Box${item.cancelled_boxes > 1 ? "es" : ""} ${item.cancelled_pcs} Pcs`;
    } else if (item.cancelled_boxes > 0) {
      return `${item.cancelled_boxes} Box${item.cancelled_boxes > 1 ? "es" : ""}`;
    } else if (item.cancelled_pcs > 0) {
      return `${item.cancelled_pcs} Pcs`;
    }
    return "0 Box";
  }
  return formatBoxAndPcs(item.quantity, item.pcs_per_box || 1, item.tile_size);
}

function formatRecordCancelledSummary(r: CancelledRecord): string {
  if (!r.items || r.items.length === 0) {
    return formatBoxAndPcs(r.total_items, 1);
  }

  if (r.items.length === 1) {
    return formatItemBoxPcs(r.items[0]);
  }

  const parts = r.items.map((it) => formatItemBoxPcs(it));
  return `${r.items.length} Products (${parts.join(", ")})`;
}

export default function CancelledTilesPage() {
  const [records, setRecords] = useState<CancelledRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Quick View Modal
  const [viewRecord, setViewRecord] = useState<CancelledRecord | null>(null);

  // Delete Modal
  const [deleteRecord, setDeleteRecord] = useState<CancelledRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Restore Modal
  const [restoreRecord, setRestoreRecord] = useState<CancelledRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const loadCancelledTiles = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cancelled-tiles?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.status === "success") {
        setRecords(data.data);
      }
    } catch (err) {
      console.error("Failed to load cancelled tiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCancelledTiles();
  }, [search]);

  // Handle Delete Record
  const handleDeleteConfirm = async () => {
    if (!deleteRecord) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/cancelled-tiles/${deleteRecord.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.status === "success") {
        setDeleteRecord(null);
        loadCancelledTiles();
      } else {
        alert(data.message || "Failed to delete record.");
      }
    } catch (err) {
      alert("Error deleting record.");
    } finally {
      setDeleting(false);
    }
  };

  // Handle Restore Back to Invoice
  const handleRestoreConfirm = async () => {
    if (!restoreRecord) return;
    try {
      setRestoring(true);
      setRestoreError(null);
      const res = await fetch(`/api/cancelled-tiles/${restoreRecord.id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setRestoreRecord(null);
        setViewRecord(null);
        loadCancelledTiles();
      } else {
        setRestoreError(data.message || "Failed to restore items back to invoice.");
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Communication error during restore.");
    } finally {
      setRestoring(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredRecords = records;
  const startIndex = (currentPage - 1) * pageSize;
  const displayedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  const totalCancelledRevenue = records.reduce((sum, r) => sum + r.total_amount, 0);
  const totalCancelledCount = records.length;

  return (
    <div className="space-y-4">
      {/* 1. Header & Summary Statistics (Strict Marss Corp Rule) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Cancelled Tiles Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Track cancelled tiles items, quick view invoice details, or restore items back to invoices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Cancelled Revenue */}
          <div className="h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              Cancelled Amount:
            </span>
            <span className="text-xs font-black text-rose-800 dark:text-rose-300">
              {formatBdCurrency(totalCancelledRevenue)}
            </span>
          </div>

          {/* Records Count */}
          <div className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase">
              Total Records:
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-white">
              {totalCancelledCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Invoice #, Customer name, or mobile..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* 3. Desktop Table (Solid Brand Header #0B3D91 - #1248a3 - #1E65A0) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Invoice # / Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-center">Cancelled Items</th>
                <th className="py-3 px-3 text-right">Cancelled Amount</th>
                <th className="py-3 px-3">Reason / Note</th>
                <th className="py-3 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    <span>Loading cancelled tiles records...</span>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    No cancelled tiles records found.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                        {r.order_no}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(r.cancelled_at || r.created_at)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {r.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{r.customer_mobile || "N/A"}</div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-[11px] whitespace-nowrap border border-rose-200 dark:border-rose-900/40">
                        {formatRecordCancelledSummary(r)}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                      {formatBdCurrency(r.total_amount)}
                    </td>

                    <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300 text-[11px]">
                      {r.reason || <span className="text-slate-400 italic">No reason provided</span>}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. Quick View Button */}
                        <button
                          type="button"
                          onClick={() => setViewRecord(r)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Quick View Details"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        </button>

                        {/* 2. Back Button (Restore to Invoice) */}
                        <button
                          type="button"
                          onClick={() => {
                            setRestoreRecord(r);
                            setRestoreError(null);
                          }}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Back / Restore to Invoice"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteRecord(r)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Record"
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
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200]}
        />
      </div>

      {/* 4. Mobile Card View */}
      <div className="block md:hidden space-y-2.5">
        {displayedRecords.map((r) => (
          <div
            key={r.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {r.order_no}
                </span>
                <p className="text-[11px] font-semibold text-emerald-600">
                  {r.customer_name} ({r.customer_mobile || "Walk-in"})
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                CANCELLED
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block">Cancelled Items:</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {formatRecordCancelledSummary(r)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Cancelled Amount:</span>
                <span className="font-black text-rose-600 dark:text-rose-400">
                  {formatBdCurrency(r.total_amount)}
                </span>
              </div>
            </div>

            {r.reason && (
              <p className="text-[11px] text-slate-500 italic bg-slate-50/50 dark:bg-slate-800/40 p-1.5 rounded-lg">
                Note: {r.reason}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setViewRecord(r)}
                className="h-[30px] flex-1 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRestoreRecord(r);
                  setRestoreError(null);
                }}
                className="h-[30px] flex-1 px-3 rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={() => setDeleteRecord(r)}
                className="h-[30px] px-3 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}

        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[20, 50, 100, 200]}
          />
        </div>
      </div>

      {/* 5. QUICK VIEW MODAL */}
      {viewRecord && (
        <div className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#cbd5e1] dark:border-[#334155]/60 animate-in fade-in zoom-in-95 duration-150">
            {/* Sticky Header */}
            <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide leading-none text-white">
                    Cancelled Tiles Quick View
                  </h3>
                  <p className="text-[10px] text-rose-100/80 mt-0.5">
                    Invoice #{viewRecord.order_no} • {viewRecord.customer_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="w-7 h-7 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Invoice Reference
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 font-mono block mt-0.5">
                    {viewRecord.order_no}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {formatDate(viewRecord.cancelled_at)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">
                    Customer Info
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                    {viewRecord.customer_name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                    {viewRecord.customer_mobile || "Walk-in"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-bold">
                    Cancelled Amount
                  </span>
                  <span className="font-black text-rose-700 dark:text-rose-300 text-sm block mt-0.5">
                    {formatBdCurrency(viewRecord.total_amount)}
                  </span>
                  <span className="text-[10px] text-rose-500 block mt-0.5">
                    {viewRecord.items.length} Product(s)
                  </span>
                </div>
              </div>

              {/* Cancellation Reason */}
              {viewRecord.reason && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 text-xs">
                  <span className="font-bold text-slate-500 text-[10px] uppercase block mb-0.5">
                    Reason for Cancellation
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 m-0">
                    {viewRecord.reason}
                  </p>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider block">
                  Cancelled Products ({viewRecord.items.length})
                </span>

                <div className="rounded-xl border border-[#cbd5e1] dark:border-[#334155] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-[#0f172a]">
                  {viewRecord.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {item.product_name}
                          </span>
                          {item.product_code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {item.product_code}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          {item.tile_size && (
                            <span>Size: <strong className="text-slate-600 dark:text-slate-300">{item.tile_size}</strong></span>
                          )}
                          {item.grade && (
                            <span>• Grade: <strong className="text-slate-600 dark:text-slate-300">{item.grade}</strong></span>
                          )}
                          <span>• Qty: <strong className="text-slate-700 dark:text-slate-200">{formatItemBoxPcs(item)}</strong></span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="font-black text-rose-600 dark:text-rose-400">
                          {formatBdCurrency(item.line_total)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{formatBdCurrency(item.selling_price)} / {item.unit || "Box"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="h-[60px] px-5 bg-slate-50 dark:bg-[#0f172a] border-t border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="h-[42px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  setRestoreRecord(viewRecord);
                  setRestoreError(null);
                }}
                className="h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
              >
                <Undo2 className="w-4 h-4" />
                <span>Restore to Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RESTORE CONFIRMATION MODAL */}
      {restoreRecord && (
        <div className="fixed inset-0 z-[80] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-[#cbd5e1] dark:border-[#334155]/60 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2">
                <Undo2 className="w-4 h-4" />
                <h3 className="font-bold text-sm tracking-wide text-white m-0">
                  Restore Tiles to Invoice
                </h3>
              </div>
              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreRecord(null)}
                className="w-7 h-7 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3">
              {restoreError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{restoreError}</div>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to restore these cancelled tiles items back to invoice{" "}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {restoreRecord.order_no}
                </strong>?
              </p>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Products to re-add:</span>
                  <span className="font-bold">{restoreRecord.items.length} Product(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Amount to add back:</span>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    + {formatBdCurrency(restoreRecord.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold">{restoreRecord.customer_name}</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                This will put the items back into the invoice bill and update the invoice net amount and customer due accordingly.
              </p>
            </div>

            {/* Footer */}
            <div className="h-[60px] px-5 bg-slate-50 dark:bg-[#0f172a] border-t border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between shrink-0">
              <button
                type="button"
                disabled={restoring}
                onClick={() => setRestoreRecord(null)}
                className="h-[42px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={restoring}
                onClick={handleRestoreConfirm}
                className="h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                {restoring ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restoring to Invoice...</span>
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4" />
                    <span>Confirm Restore</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteRecord)}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Cancelled Tiles Record"
        recordIdentifier={deleteRecord ? `${deleteRecord.order_no} (${formatBdCurrency(deleteRecord.total_amount)})` : undefined}
        warningMessage="Are you sure you want to permanently delete this cancelled tiles record? This action will remove the record from the cancelled tiles registry."
        isLoading={deleting}
      />
    </div>
  );
}
