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
import { Pagination } from "@/components/ui/pagination";
import { DeleteConfirmModal } from "@/components/ui/delete-confirm-modal";

interface CancelledItemDetail {
  order_detail_id?: number;
  product_id: number;
  product_name: string;
  product_code?: string;
  unit?: string | null;
  category?: string | null;
  quantity: number;
  price: number;
  selling_price: number;
  line_total: number;
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

export default function OrderCancellationsPage() {
  const [records, setRecords] = useState<CancelledRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Quick View Modal
  const [viewRecord, setViewRecord] = useState<CancelledRecord | null>(null);

  // Restore Modal
  const [restoreRecord, setRestoreRecord] = useState<CancelledRecord | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const loadCancelledRecords = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/order-cancellations?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.status === "success") {
        setRecords(data.data);
      }
    } catch (err) {
      console.error("Failed to load cancelled orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCancelledRecords();
  }, [search]);

  // Handle Restore Back to Invoice
  const handleRestoreConfirm = async () => {
    if (!restoreRecord) return;
    try {
      setRestoring(true);
      setRestoreError(null);
      const res = await fetch(`/api/order-cancellations/${restoreRecord.id}/restore`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.status === "success") {
        setRestoreRecord(null);
        setViewRecord(null);
        loadCancelledRecords();
      } else {
        setRestoreError(data.message || "Failed to restore items back to invoice.");
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Communication error during restore.");
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString("en-GB");
  };

  const paginated = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-100 dark:border-slate-800 flex items-center justify-center">
            <Ban className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Sales Cancellations & Restock Log
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                বাতিলকৃত বিক্রয় ও রিস্টক লগ
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              বিক্রয় ইনভয়েস বাতিলকরণ, স্টক পুনঃসংযোজন ও অডিট হিস্টোরি
            </p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order no, customer..."
            className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>
      </div>

      {/* 2. Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading cancellation records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Ban className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোন বাতিলকৃত ইনভয়েস রেকর্ড নেই</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Order No</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Cancelled Items</th>
                  <th className="px-4 py-3 font-semibold text-right">Refund Total</th>
                  <th className="px-4 py-3 font-semibold">Reason</th>
                  <th className="px-4 py-3 font-semibold">Cancelled Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#1E65A0] dark:text-blue-400">
                      {r.order_no}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800 dark:text-white">{r.customer_name}</div>
                      <div className="text-[11px] text-slate-400">{r.customer_mobile || "Walk-in"}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-300">
                      {r.items?.length || 0} Products ({r.total_items} items)
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">
                      {formatBdCurrency(r.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 italic max-w-xs truncate">
                      {r.reason || "Customer cancellation"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {formatDate(r.cancelled_at || r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewRecord(r)}
                          className="p-1.5 rounded-lg border border-[#cbd5e1] text-slate-600 hover:text-[#1E65A0] hover:bg-slate-100 cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setRestoreRecord(r)}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> রিস্টোর
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {records.length > pageSize && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Pagination
              currentPage={currentPage}
              totalItems={records.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {viewRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Cancellation Details: {viewRecord.order_no}</h2>
              </div>
              <button
                onClick={() => setViewRecord(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Customer:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{viewRecord.customer_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Cancelled Total:</span>
                  <span className="font-mono font-bold text-red-600">
                    {formatBdCurrency(viewRecord.total_amount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Date:</span>
                  <span className="font-mono">{formatDate(viewRecord.cancelled_at)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Reason:</span>
                  <span className="italic">{viewRecord.reason || "None"}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">Restocked Items:</h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Product Name</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Unit Price</th>
                        <th className="px-3 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {viewRecord.items?.map((it, idx) => (
                        <tr key={idx}>
                          <td className="px-3 py-2 font-medium">{it.product_name}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatBdCurrency(it.selling_price || it.price)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-red-600">
                            {formatBdCurrency(it.line_total || it.quantity * (it.selling_price || it.price))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Undo2 className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Confirm Order Restore</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to restore cancelled items for invoice{" "}
              <strong className="text-slate-900 dark:text-white">{restoreRecord.order_no}</strong>? This will deduct
              current shop inventory and re-activate the items on the customer&apos;s invoice.
            </p>
            {restoreError && (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {restoreError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRestoreRecord(null);
                  setRestoreError(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                disabled={restoring}
                className="px-4 py-2 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white rounded-xl text-xs font-bold"
              >
                {restoring ? "Restoring..." : "Yes, Restore Items"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
