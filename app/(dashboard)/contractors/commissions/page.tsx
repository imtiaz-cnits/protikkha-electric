"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Zap,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  X,
  CreditCard,
  UserCheck,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface CommissionItem {
  id: number;
  commission_no: string;
  contractor_id: number;
  contractor_name: string;
  mobile: string;
  invoice_no: string;
  commission_basis: string;
  sale_amount: number;
  commission_percent: number;
  commission_amount: number;
  status: string;
  paid_amount: number;
  payment_method: string;
  payment_date: string | null;
  note: string;
  created_at: string;
}

export default function ContractorCommissionsPage() {
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<CommissionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Payout Modal
  const [payingCommission, setPayingCommission] = useState<CommissionItem | null>(null);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/contractors/commissions?status=${statusFilter}`);
      const data = await res.json();
      if (data.status === "success") {
        setCommissions(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load commissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return commissions;
    const q = search.toLowerCase().trim();
    return commissions.filter(
      (c) =>
        c.contractor_name.toLowerCase().includes(q) ||
        c.commission_no.toLowerCase().includes(q) ||
        c.invoice_no.toLowerCase().includes(q) ||
        c.mobile.includes(q)
    );
  }, [commissions, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  async function handleConfirmPayout(e: React.FormEvent) {
    e.preventDefault();
    if (!payingCommission) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/contractors/commissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payingCommission.id,
          status: "PAID",
          payment_method: payMethod,
          note: payNote,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to process payout");
      }

      toast.success(`Commission paid to ${payingCommission.contractor_name}`);
      setPayingCommission(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Payout failed");
    } finally {
      setSubmitting(false);
    }
  }

  function exportCSV() {
    if (commissions.length === 0) return;
    const headers = ["Commission No", "Contractor", "Mobile", "Invoice", "Sale Amount", "Rate %", "Commission", "Status", "Payment Method", "Date"];
    const rows = commissions.map((c) => [
      `"${c.commission_no}"`,
      `"${c.contractor_name}"`,
      `"${c.mobile}"`,
      `"${c.invoice_no}"`,
      c.sale_amount,
      c.commission_percent,
      c.commission_amount,
      c.status,
      `"${c.payment_method}"`,
      c.created_at,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `contractor_commissions_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Contractor Commission Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track electrician referral percentages, project commissions, approvals, and payouts
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Commissions</span>
        </button>
      </div>

      {/* Filter */}
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
            placeholder="Search by contractor name, mobile, invoice no..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex gap-2">
          {["all", "PENDING", "APPROVED", "PAID"].map((st) => (
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
              {st === "all" ? "All Commissions" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading commissions...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No contractor commissions found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Code</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Contractor / Electrician</th>
                    <th className="py-3 px-3.5">Invoice</th>
                    <th className="py-3 px-3.5 text-right">Sale Amount</th>
                    <th className="py-3 px-3.5 text-center">Rate</th>
                    <th className="py-3 px-3.5 text-right">Commission</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {c.commission_no}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{c.contractor_name}</p>
                        <span className="text-[10px] text-slate-400">{c.mobile}</span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-blue-600 dark:text-blue-400 font-bold">
                        {c.invoice_no}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(c.sale_amount)}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                        {c.commission_percent}%
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(c.commission_amount)}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            c.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.status === "APPROVED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {c.status !== "PAID" ? (
                          <button
                            onClick={() => setPayingCommission(c)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold transition cursor-pointer shadow-2xs"
                          >
                            Pay Commission
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold">{c.payment_method}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((c) => (
                <div key={c.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {c.commission_no}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{c.contractor_name}</h4>
                      <p className="text-[10px] text-slate-400">{c.invoice_no} • {c.mobile}</p>
                    </div>
                    <span className="font-bold text-emerald-600">
                      {formatBdCurrency(c.commission_amount)}
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

      {/* Payout Modal */}
      {payingCommission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Disburse Commission Payout</h3>
                <p className="text-[11px] text-blue-100">{payingCommission.commission_no}</p>
              </div>
              <button
                onClick={() => setPayingCommission(null)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="p-5 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Contractor:</span>
                  <span className="font-bold text-slate-800 dark:text-white">{payingCommission.contractor_name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold text-blue-600">{payingCommission.invoice_no}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-200 dark:border-slate-700 pt-1 mt-1">
                  <span className="text-slate-500">Payout Amount:</span>
                  <span className="font-bold text-base text-emerald-600">{formatBdCurrency(payingCommission.commission_amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Method *
                </label>
                <CustomSelect
                  options={[
                    { value: "CASH", label: "Cash Payout from Drawer" },
                    { value: "BKASH", label: "bKash / Nagad Wallet" },
                    { value: "BANK", label: "Bank Transfer" },
                  ]}
                  value={payMethod}
                  onChange={(val) => setPayMethod(String(val))}
                  placeholder="Select Method"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Payout Note / Reference
                </label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  placeholder="e.g. bKash TrxID or Cash voucher no..."
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayingCommission(null)}
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
                  <span>Confirm Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
