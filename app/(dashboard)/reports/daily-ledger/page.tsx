"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Coins,
  Loader2,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";
import { getPresetDateRange } from "@/lib/report-date-utils";

interface LedgerItem {
  id: string;
  timestamp: string;
  date_formatted: string;
  particulars: string;
  party_name: string;
  type: "inflow" | "outflow";
  category: string;
  inflow: number;
  outflow: number;
  ref_no: string;
  payment_method: string;
  running_balance: number;
}

interface Summary {
  opening_balance: number;
  total_inflow: number;
  total_outflow: number;
  net_balance: number;
  total_count: number;
  start_date: string;
  end_date: string;
}

export default function DailyLedgerPage() {
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  const initialRange = getPresetDateRange("today");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/reports/daily-ledger${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "success") {
        setLedger(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadData();
  }, [startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const filteredLedger = ledger.filter(
    (item) =>
      item.particulars.toLowerCase().includes(search.toLowerCase()) ||
      item.party_name.toLowerCase().includes(search.toLowerCase()) ||
      item.ref_no.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const displayedLedger = filteredLedger.slice(startIndex, startIndex + pageSize);

  const reportPayload: PrintReportPayload = useMemo(
    () => ({
      title: "Daily Cashbook Ledger (দৈনিক জমা-খরচ খাতা)",
      subtitle: "Chronological cash inflows & outflows with real-time running balance",
      metaItems: [
        {
          label: "Period",
          value: startDate || endDate ? `${startDate || "Start"} to ${endDate || "Today"}` : "All Dates",
        },
        { label: "Opening Float", value: formatBdCurrency(summary?.opening_balance || 0) },
        { label: "Total Inflow (জমা)", value: formatBdCurrency(summary?.total_inflow || 0) },
        { label: "Total Outflow (খরচ)", value: formatBdCurrency(summary?.total_outflow || 0) },
        { label: "Closing Balance", value: formatBdCurrency(summary?.net_balance || 0) },
      ],
      columns: [
        { header: "SL", align: "center", width: "5%" },
        { header: "Date & Time", align: "left", width: "14%" },
        { header: "Particulars / বিবরণ", align: "left", width: "26%" },
        { header: "Category", align: "left", width: "13%" },
        { header: "Voucher Ref", align: "left", width: "11%" },
        { header: "Inflow (৳)", align: "right", width: "10%" },
        { header: "Outflow (৳)", align: "right", width: "10%" },
        { header: "Balance (৳)", align: "right", width: "11%" },
      ],
      rows: filteredLedger.map((tx, idx) => [
        { text: String(idx + 1), align: "center" },
        { text: tx.date_formatted, mono: true },
        { text: tx.particulars, subText: tx.party_name || undefined, bold: true },
        tx.category,
        { text: tx.ref_no, mono: true },
        {
          text: tx.inflow > 0 ? formatBdCurrency(tx.inflow) : "—",
          align: "right",
          bold: tx.inflow > 0,
          color: tx.inflow > 0 ? "emerald" : "muted",
        },
        {
          text: tx.outflow > 0 ? formatBdCurrency(tx.outflow) : "—",
          align: "right",
          bold: tx.outflow > 0,
          color: tx.outflow > 0 ? "rose" : "muted",
        },
        { text: formatBdCurrency(tx.running_balance), align: "right", bold: true },
      ]),
      totalRow: [
        "",
        "",
        "CLOSING CASHBOOK SUMMARY",
        "",
        "",
        { text: formatBdCurrency(summary?.total_inflow || 0), align: "right", color: "emerald" },
        { text: formatBdCurrency(summary?.total_outflow || 0), align: "right", color: "rose" },
        { text: formatBdCurrency(summary?.net_balance || 0), align: "right", color: "navy" },
      ],
      filename: "daily-cashbook-ledger",
    }),
    [filteredLedger, summary, startDate, endDate]
  );

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Daily Cashbook Ledger (দৈনিক জমা-খরচ খাতা)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Chronological cash inflows & outflows with real-time running balance
            </p>
          </div>
        </div>

        <ReportExportActions payload={reportPayload} />
      </div>

      {/* 2. Four Ledger Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Opening Cash Float</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatBdCurrency(summary?.opening_balance || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Starting drawer float</div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Cash Inflow (জমা)</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            +{formatBdCurrency(summary?.total_inflow || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Sales & due collections
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Cash Outflow (খরচ)</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            -{formatBdCurrency(summary?.total_outflow || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Expenses & supplier pay
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Closing / Net Balance</span>
            <Wallet className="w-4 h-4 text-[#1E65A0]" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBdCurrency(summary?.net_balance || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Remaining drawer cash
          </div>
        </div>
      </div>

      {/* 3. Unified Dynamic Filter Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Search particulars, voucher, or party..."
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onClear={() => {
          setSearch("");
          setStartDate("");
          setEndDate("");
        }}
      />

      {/* 4. Compact Full-Screen Desktop Cashbook Table */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead>
            <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
              <th className="py-2.5 px-2.5 text-center w-[44px]">SL</th>
              <th className="py-2.5 px-3 w-[15%]">Date & Time</th>
              <th className="py-2.5 px-3 w-[25%]">Particulars / বিবরণ</th>
              <th className="py-2.5 px-2.5 w-[15%]">Category</th>
              <th className="py-2.5 px-2.5 w-[11%]">Voucher Ref</th>
              <th className="py-2.5 px-2.5 text-right w-[10%]">Inflow (৳)</th>
              <th className="py-2.5 px-2.5 text-right w-[10%]">Outflow (৳)</th>
              <th className="py-2.5 px-3 text-right w-[11%]">Balance (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E65A0]" />
                  <span>Loading daily ledger transactions...</span>
                </td>
              </tr>
            ) : filteredLedger.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                  No cashbook transactions found for the selected date range.
                </td>
              </tr>
            ) : (
              displayedLedger.map((tx, idx) => (
                <tr
                  key={tx.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-2.5 text-center font-bold text-slate-500">
                    {startIndex + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 truncate">
                    {tx.date_formatted}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 dark:text-slate-100 truncate" title={tx.particulars}>
                    {tx.particulars}
                  </td>
                  <td className="py-2.5 px-2.5 font-medium text-slate-600 dark:text-slate-300 truncate">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 truncate inline-block max-w-full">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-2.5 font-mono text-[11px] text-slate-500 truncate" title={tx.ref_no}>
                    {tx.ref_no}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {tx.inflow > 0 ? formatBdCurrency(tx.inflow) : "—"}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    {tx.outflow > 0 ? formatBdCurrency(tx.outflow) : "—"}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                    {formatBdCurrency(tx.running_balance)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLedger.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {displayedLedger.map((tx) => (
          <div
            key={tx.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    tx.type === "inflow"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                  }`}
                >
                  {tx.category}
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-white mt-1">
                  {tx.particulars}
                </p>
              </div>
              <span
                className={`text-xs font-black ${
                  tx.type === "inflow" ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {tx.type === "inflow"
                  ? `+${formatBdCurrency(tx.inflow)}`
                  : `-${formatBdCurrency(tx.outflow)}`}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-400">
              <span>{tx.date_formatted}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200">
                Balance: {formatBdCurrency(tx.running_balance)}
              </span>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredLedger.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      <PrintTableSheet {...reportPayload} />
    </div>
  );
}
