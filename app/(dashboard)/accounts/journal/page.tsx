"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Scale,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface JournalEntry {
  id: number;
  voucher_no: string;
  date: string;
  account_name: string;
  account_type: string;
  reference_no: string;
  particulars: string;
  debit: number;
  credit: number;
  balance_after: number;
}

export default function JournalEntriesPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/journal");
      const data = await res.json();
      if (data.status === "success") {
        setEntries(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load journal entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase().trim();
    return entries.filter(
      (e) =>
        e.voucher_no.toLowerCase().includes(q) ||
        e.account_name.toLowerCase().includes(q) ||
        e.particulars.toLowerCase().includes(q) ||
        e.reference_no.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (entries.length === 0) return;
    const headers = ["Voucher No", "Date", "Account", "Type", "Reference", "Particulars", "Debit (৳)", "Credit (৳)", "Balance (৳)"];
    const rows = entries.map((e) => [
      `"${e.voucher_no}"`,
      e.date,
      `"${e.account_name}"`,
      e.account_type,
      `"${e.reference_no}"`,
      `"${e.particulars}"`,
      e.debit,
      e.credit,
      e.balance_after,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `journal_voucher_entries_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              General Journal Entries (Double-Entry)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Journal voucher audit trail, debit/credit ledger postings, and account reconciliation
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Vouchers</span>
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
            placeholder="Search by voucher no, account name, particulars, or reference..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading journal vouchers...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No journal entries found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Voucher No</th>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Account Head</th>
                    <th className="py-3 px-3.5">Reference</th>
                    <th className="py-3 px-3.5 min-w-[240px]">Particulars</th>
                    <th className="py-3 px-3.5 text-right">Debit (৳)</th>
                    <th className="py-3 px-3.5 text-right">Credit (৳)</th>
                    <th className="py-3 px-3.5 text-right">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((e) => (
                    <tr key={e.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {e.voucher_no}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {e.date}
                      </td>

                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{e.account_name}</p>
                        <span className="text-[10px] text-slate-400 font-semibold">{e.account_type}</span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {e.reference_no}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">
                        {e.particulars}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {e.debit > 0 ? formatBdCurrency(e.debit) : "—"}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {e.credit > 0 ? formatBdCurrency(e.credit) : "—"}
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-blue-600 dark:text-blue-400">
                        {formatBdCurrency(e.balance_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((e) => (
                <div key={e.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {e.voucher_no}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{e.account_name}</h4>
                      <p className="text-[10px] text-slate-400">{e.date} • {e.reference_no}</p>
                    </div>
                    <span className="font-mono font-bold">
                      {e.debit > 0 ? (
                        <span className="text-emerald-600">Dr: {formatBdCurrency(e.debit)}</span>
                      ) : (
                        <span className="text-rose-600">Cr: {formatBdCurrency(e.credit)}</span>
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {e.particulars}
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
    </div>
  );
}
