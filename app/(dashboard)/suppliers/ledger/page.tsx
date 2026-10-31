"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Users,
  Search,
  FileSpreadsheet,
  Building2,
  DollarSign,
  Loader2,
  Phone,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface SupplierLedgerItem {
  id: number;
  supplier_id: number;
  supplier_name: string;
  mobile: string;
  date: string;
  reference_no: string;
  description: string;
  bill_amount: number;
  paid_amount: number;
  balance: number;
  status: string;
}

export default function SupplierLedgerPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<SupplierLedgerItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const [ledRes, supRes] = await Promise.all([
        fetch(`/api/suppliers/ledger?supplier_id=${selectedSupplier}`),
        fetch("/api/suppliers"),
      ]);
      const [ledData, supData] = await Promise.all([ledRes.json(), supRes.json()]);

      if (ledData.status === "success") setEntries(ledData.data || []);
      if (supData.status === "success") setSuppliers(supData.data || []);
    } catch (err: any) {
      toast.error("Failed to load supplier ledger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedSupplier]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase().trim();
    return entries.filter(
      (e) =>
        e.supplier_name.toLowerCase().includes(q) ||
        e.reference_no.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.mobile.includes(q)
    );
  }, [entries, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (entries.length === 0) return;
    const headers = ["Date", "Supplier", "Mobile", "Ref No", "Description", "Bill Amount", "Paid Amount", "Balance Due", "Status"];
    const rows = entries.map((e) => [
      e.date,
      `"${e.supplier_name}"`,
      `"${e.mobile}"`,
      `"${e.reference_no}"`,
      `"${e.description}"`,
      e.bill_amount,
      e.paid_amount,
      e.balance,
      e.status,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `supplier_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Supplier Statements & Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Detailed transaction ledger, bills, disbursements, and payable balances
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Ledger</span>
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
            placeholder="Search by supplier name, reference, mobile..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="w-full md:w-64">
          <CustomSelect
            options={[
              { value: "all", label: "All Suppliers" },
              ...suppliers.map((s) => ({ value: String(s.id), label: s.supplier_name })),
            ]}
            value={selectedSupplier}
            onChange={(val) => {
              setSelectedSupplier(String(val));
              setCurrentPage(1);
            }}
            placeholder="Select Supplier"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading ledger...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No supplier ledger entries found.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-2.5 w-[95px]">Date</th>
                    <th className="py-2.5 px-2.5 w-[115px]">Reference</th>
                    <th className="py-2.5 px-2.5 w-[20%]">Supplier</th>
                    <th className="py-2.5 px-2.5">Description</th>
                    <th className="py-2.5 px-2.5 text-right w-[110px]">Bill Amount</th>
                    <th className="py-2.5 px-2.5 text-right w-[105px]">Paid</th>
                    <th className="py-2.5 px-2.5 text-right w-[110px]">Balance Due</th>
                    <th className="py-2.5 px-2 text-center w-[85px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((e) => (
                    <tr key={e.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                        {e.date}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                        {e.reference_no}
                      </td>
                      <td className="py-2 px-2.5 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate" title={e.supplier_name}>{e.supplier_name}</p>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                          <Phone className="w-2.5 h-2.5 shrink-0" />
                          {e.mobile}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 dark:text-slate-300 truncate" title={e.description}>
                        {e.description}
                      </td>
                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(e.bill_amount)}
                      </td>
                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(e.paid_amount)}
                      </td>
                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-bold text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(e.balance)}
                      </td>
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            e.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : e.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {e.status}
                        </span>
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
                      <h4 className="font-bold text-slate-800 dark:text-white">{e.supplier_name}</h4>
                      <p className="text-[10px] text-slate-400">{e.date} • {e.reference_no}</p>
                    </div>
                    <span className="font-bold text-rose-600">
                      Due: {formatBdCurrency(e.balance)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {e.description}
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
