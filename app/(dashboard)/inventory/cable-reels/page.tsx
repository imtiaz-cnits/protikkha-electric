"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Boxes,
  Search,
  FileSpreadsheet,
  Zap,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface ReelItem {
  id: number;
  reel_number: string;
  product_name: string;
  brand: string;
  conductor: string;
  cable_size: string;
  core_count: number;
  color: string;
  initial_meters: number;
  sold_meters: number;
  balance_meters: number;
  unit_rate: number;
  status: string;
  drum_type: string;
  location: string;
}

export default function CableReelsPage() {
  const { toast } = useToast();
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory/cable-reels");
      const data = await res.json();
      if (data.status === "success") {
        setReels(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load cable reels");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return reels.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          r.reel_number.toLowerCase().includes(q) ||
          r.product_name.toLowerCase().includes(q) ||
          r.cable_size.toLowerCase().includes(q) ||
          r.brand.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [reels, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (reels.length === 0) return;
    const headers = ["Reel No", "Cable Product", "Brand", "Conductor", "Size", "Color", "Initial (m)", "Sold (m)", "Balance (m)", "Rate/m", "Status", "Location"];
    const rows = reels.map((r) => [
      `"${r.reel_number}"`,
      `"${r.product_name}"`,
      `"${r.brand}"`,
      `"${r.conductor}"`,
      `"${r.cable_size}"`,
      `"${r.color}"`,
      r.initial_meters,
      r.sold_meters,
      r.balance_meters,
      r.unit_rate,
      r.status,
      `"${r.location}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `cable_reels_${new Date().toISOString().slice(0, 10)}.csv`);
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
              Cable Reels & Cut-Length Tracking
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track master drum reels, sold meters, balance stock, and rack locations
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Reels</span>
        </button>
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
            placeholder="Search by reel no, cable size, brand, or color..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex gap-2">
          {["all", "IN_USE", "LOW_REEL", "EXHAUSTED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`h-[38px] px-3 rounded-xl text-xs font-bold border transition ${
                statusFilter === st
                  ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
              }`}
            >
              {st === "all" ? "All Reels" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading cable reels...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No cable reels found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Reel Number</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Cable Product & Spec</th>
                    <th className="py-3 px-3.5">Drum Type / Rack</th>
                    <th className="py-3 px-3.5 text-right">Initial (m)</th>
                    <th className="py-3 px-3.5 text-right">Sold (m)</th>
                    <th className="py-3 px-3.5 text-right">Balance (m)</th>
                    <th className="py-3 px-3.5 text-center">Progress</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((r) => {
                    const percentSold = Math.round((r.sold_meters / r.initial_meters) * 100);
                    return (
                      <tr key={r.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {r.reel_number}
                          </span>
                        </td>

                        <td className="py-3 px-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">{r.product_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded">
                              {r.cable_size}
                            </span>
                            <span className="text-[10px] text-slate-400">{r.conductor} • {r.color}</span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <p className="font-medium text-slate-800 dark:text-slate-200">{r.drum_type}</p>
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{r.location}</span>
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-medium text-slate-600 dark:text-slate-400">
                          {r.initial_meters} m
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-rose-600">
                          {r.sold_meters} m
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {r.balance_meters} m
                        </td>

                        <td className="py-3 px-3.5 w-32">
                          <div className="space-y-1">
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1E65A0] h-full rounded-full transition-all"
                                style={{ width: `${percentSold}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 text-right block">{percentSold}% cut</span>
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              r.status === "IN_USE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : r.status === "LOW_REEL"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {r.status.replace("_", " ")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((r) => (
                <div key={r.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {r.reel_number}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{r.product_name}</h4>
                      <p className="text-[10px] text-slate-400">{r.cable_size} • {r.location}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">{r.balance_meters} m left</span>
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
