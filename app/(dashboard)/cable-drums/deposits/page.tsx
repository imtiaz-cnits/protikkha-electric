"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Boxes,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  RotateCcw,
  Loader2,
  DollarSign,
  X,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface DrumDepositItem {
  id: number;
  drum_code: string;
  drum_type: string;
  customer_name: string;
  order_no: string;
  deposit_amount: number;
  refund_amount: number;
  balance_deposit: number;
  status: string;
  issue_date: string;
  return_date: string | null;
  note: string;
}

export default function DrumDepositsPage() {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<DrumDepositItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Refund Modal
  const [refundingDrum, setRefundingDrum] = useState<DrumDepositItem | null>(null);
  const [refundAmt, setRefundAmt] = useState("");
  const [refundNote, setRefundNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/cable-drums/deposits");
      const data = await res.json();
      if (data.status === "success") {
        setDeposits(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load drum deposits");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalHeldDeposit = useMemo(() => {
    return deposits.reduce((acc, d) => acc + d.balance_deposit, 0);
  }, [deposits]);

  const filtered = useMemo(() => {
    return deposits.filter((d) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          d.drum_code.toLowerCase().includes(q) ||
          d.customer_name.toLowerCase().includes(q) ||
          d.order_no.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
  }, [deposits, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function handleOpenRefund(item: DrumDepositItem) {
    setRefundingDrum(item);
    setRefundAmt(String(item.balance_deposit));
    setRefundNote("Drum returned undamaged; full deposit refunded");
  }

  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!refundingDrum) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/cable-drums/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: refundingDrum.id,
          refund_amount: parseFloat(refundAmt),
          status: "REFUNDED",
          note: refundNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to process refund");
      }

      toast.success(`Refund recorded for ${refundingDrum.drum_code}`);
      setRefundingDrum(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Refund failed");
    } finally {
      setSubmitting(false);
    }
  }

  function exportCSV() {
    if (deposits.length === 0) return;
    const headers = ["Drum Code", "Type", "Customer", "Order No", "Issue Date", "Deposit (৳)", "Refunded (৳)", "Held Balance (৳)", "Status", "Note"];
    const rows = deposits.map((d) => [
      `"${d.drum_code}"`,
      `"${d.drum_type}"`,
      `"${d.customer_name}"`,
      `"${d.order_no}"`,
      d.issue_date,
      d.deposit_amount,
      d.refund_amount,
      d.balance_deposit,
      d.status,
      `"${d.note}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cable_drum_deposits_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              Cable Drum & Deposit Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage refundable wooden/steel drum deposits, contractor returns, and forfeit adjustments
            </p>
          </div>
        </div>

        {/* Deposit Balance Badge */}
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
          <div>
            <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">Total Held Customer Deposits</span>
            <span className="text-lg font-black">{formatBdCurrency(totalHeldDeposit)}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by drum code, customer, order no..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex gap-2">
          {["all", "ISSUED", "REFUNDED", "DAMAGED_LOST"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold border transition ${
                statusFilter === st
                  ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
              }`}
            >
              {st === "all" ? "All Drums" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading drum deposits...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No drum deposit records found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Drum Code</th>
                    <th className="py-3 px-3.5 min-w-[180px]">Drum Type</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Customer / Contractor</th>
                    <th className="py-3 px-3.5">Order No</th>
                    <th className="py-3 px-3.5 text-center">Issue Date</th>
                    <th className="py-3 px-3.5 text-right">Deposit (৳)</th>
                    <th className="py-3 px-3.5 text-right">Refunded (৳)</th>
                    <th className="py-3 px-3.5 text-right">Balance Held</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((d) => (
                    <tr key={d.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {d.drum_code}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {d.drum_type}
                      </td>

                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{d.customer_name}</p>
                        <span className="text-[10px] text-slate-400">{d.note}</span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                        {d.order_no}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {d.issue_date}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {formatBdCurrency(d.deposit_amount)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400 font-mono">
                        {formatBdCurrency(d.refund_amount)}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-amber-600 dark:text-amber-400 font-mono">
                        {formatBdCurrency(d.balance_deposit)}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            d.status === "REFUNDED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : d.status === "ISSUED"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {d.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {d.status === "ISSUED" ? (
                          <button
                            onClick={() => handleOpenRefund(d)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition cursor-pointer shadow-2xs"
                          >
                            Return Refund
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((d) => (
                <div key={d.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {d.drum_code}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{d.customer_name}</h4>
                      <p className="text-[10px] text-slate-400">{d.drum_type} • {d.order_no}</p>
                    </div>
                    <span className="font-bold text-amber-600">
                      Deposit: {formatBdCurrency(d.balance_deposit)}
                    </span>
                  </div>
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

      {/* Refund Modal */}
      {refundingDrum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Process Drum Deposit Refund</h3>
                <p className="text-[11px] text-blue-100">{refundingDrum.drum_code} - {refundingDrum.drum_type}</p>
              </div>
              <button
                onClick={() => setRefundingDrum(null)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmRefund} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Contractor:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{refundingDrum.customer_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Initial Deposit:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{formatBdCurrency(refundingDrum.deposit_amount)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                  <span className="text-slate-500">Eligible Refund:</span>
                  <span className="font-bold text-base text-emerald-600">{formatBdCurrency(refundingDrum.balance_deposit)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Refund Amount to Pay (৳) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={refundAmt}
                  onChange={(e) => setRefundAmt(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Return Condition / Note
                </label>
                <input
                  type="text"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRefundingDrum(null)}
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
                  <span>Confirm Refund</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
