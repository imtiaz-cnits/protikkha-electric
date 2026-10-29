"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Boxes,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Loader2,
  FileSpreadsheet,
  Calendar,
  Layers,
} from "lucide-react";
import { CustomSelect, Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface MovementItem {
  id: number;
  product_id: number;
  product_name: string;
  category: string;
  unit: string;
  movement_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  reference_type: string;
  reference_no: string;
  stock_after: number;
  date: string;
  note: string;
}

export default function StockMovementsPage() {
  const { toast } = useToast();
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/movements?type=${selectedType}`);
      const data = await res.json();
      if (data.status === "success") {
        setMovements(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load stock ledger");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [selectedType]);

  const filtered = useMemo(() => {
    if (!search.trim()) return movements;
    const q = search.toLowerCase().trim();
    return movements.filter(
      (m) =>
        m.product_name.toLowerCase().includes(q) ||
        m.reference_no.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q)
    );
  }, [movements, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (movements.length === 0) return;
    const headers = ["Date", "Product", "Type", "Ref Type", "Ref No", "Qty", "Unit", "Rate", "Total Value", "Stock After", "Note"];
    const rows = movements.map((m) => [
      m.date,
      `"${m.product_name}"`,
      m.movement_type,
      m.reference_type,
      `"${m.reference_no}"`,
      m.quantity,
      `"${m.unit}"`,
      m.unit_price,
      m.total_value,
      m.stock_after,
      `"${m.note}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `stock_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
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
              Stock Movement Ledger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Audit trail of every stock entry, POS cut-length deduction, return, and transfer
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

      {/* Filters */}
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
            placeholder="Search by product name, ref no, or note..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="w-full md:w-56">
          <CustomSelect
            options={[
              { value: "all", label: "All Movements" },
              { value: "IN", label: "Stock Received (IN)" },
              { value: "OUT", label: "Stock Deducted (OUT)" },
              { value: "ADJUSTMENT", label: "Stock Adjustment" },
              { value: "RETURN", label: "Sales/Purchase Return" },
            ]}
            value={selectedType}
            onChange={(val) => {
              setSelectedType(String(val));
              setCurrentPage(1);
            }}
            placeholder="Movement Type"
          />
        </div>
      </div>

      {/* Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading stock movements...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No stock movement records found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Product</th>
                    <th className="py-3 px-3.5 text-center">Type</th>
                    <th className="py-3 px-3.5">Reference</th>
                    <th className="py-3 px-3.5 text-right">Qty In/Out</th>
                    <th className="py-3 px-3.5 text-right">Unit Rate</th>
                    <th className="py-3 px-3.5 text-right">Total Value</th>
                    <th className="py-3 px-3.5 text-right">Stock Balance</th>
                    <th className="py-3 px-3.5 min-w-[150px]">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {m.date}
                        </td>

                        <td className="py-3 px-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{m.product_name}</p>
                          <span className="text-[10px] text-slate-400">{m.category}</span>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isPositive
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200"
                            }`}
                          >
                            {isPositive ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                            {m.movement_type}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <p className="font-mono font-bold text-slate-800 dark:text-slate-200 text-[11px]">{m.reference_no}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">{m.reference_type}</span>
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <span className={`font-bold font-mono ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                            {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                          {formatBdCurrency(m.unit_price)}
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                          {formatBdCurrency(m.total_value)}
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                            {m.stock_after} {m.unit}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-slate-500 text-[11px]">{m.note || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((m) => (
                <div key={m.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{m.product_name}</h4>
                      <p className="text-[10px] text-slate-400">{m.date} • {m.reference_no}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        m.quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    <span className="text-slate-400">Balance: <strong className="text-slate-700 dark:text-slate-300">{m.stock_after} {m.unit}</strong></span>
                    <span className="text-slate-400">Total: <strong className="text-slate-700 dark:text-slate-300">{formatBdCurrency(m.total_value)}</strong></span>
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
    </div>
  );
}
