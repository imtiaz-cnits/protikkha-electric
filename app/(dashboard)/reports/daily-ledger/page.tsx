"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Coins,
  Loader2,
  Search,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui";

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

  const todayStr = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = `/api/reports/daily-ledger?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
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

  const setPreset = (preset: "today" | "yesterday" | "7days" | "month") => {
    const now = new Date();
    const tStr = now.toISOString().split("T")[0];

    if (preset === "today") {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (preset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split("T")[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === "7days") {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(tStr);
    } else if (preset === "month") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      setStartDate(firstDay);
      setEndDate(tStr);
    }
  };

  const filteredLedger = ledger.filter(
    (item) =>
      item.particulars.toLowerCase().includes(search.toLowerCase()) ||
      item.party_name.toLowerCase().includes(search.toLowerCase()) ||
      item.ref_no.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const displayedLedger = filteredLedger.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
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

        <button
          onClick={() => window.print()}
          className="h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto border border-[#cbd5e1] dark:border-[#334155]"
        >
          <Printer className="w-4 h-4" />
          <span>Print Cashbook</span>
        </button>
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
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBdCurrency(summary?.net_balance || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Remaining drawer cash
          </div>
        </div>
      </div>

      {/* 3. Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search particulars, voucher, or party..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[135px]">
              <CustomDatePicker
                value={startDate}
                onChange={(d) => setStartDate(d)}
                placeholder="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[135px]">
              <CustomDatePicker
                value={endDate}
                onChange={(d) => setEndDate(d)}
                placeholder="To Date"
              />
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPreset("today")}
              className={`h-[38px] px-2.5 rounded-xl text-xs font-bold ${
                startDate === todayStr && endDate === todayStr
                  ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              7 Days
            </button>
            <button
              onClick={() => setPreset("month")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* 4. Desktop Cashbook Table (Strict Marss Corp Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-bold whitespace-nowrap">
              <th className="py-3 px-3 text-center w-[50px]">SL</th>
              <th className="py-3 px-4 w-36">Date & Time</th>
              <th className="py-3 px-4">Particulars / বিবরণ</th>
              <th className="py-3 px-3">Party / Category</th>
              <th className="py-3 px-3">Voucher Ref</th>
              <th className="py-3 px-3 text-right">Inflow / জমা (৳)</th>
              <th className="py-3 px-3 text-right">Outflow / খরচ (৳)</th>
              <th className="py-3 px-4 text-right">Running Balance (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
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
                  <td className="py-3 px-3 text-center font-bold text-slate-500">
                    {startIndex + idx + 1}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {tx.date_formatted}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                    {tx.particulars}
                  </td>
                  <td className="py-3 px-3 font-medium text-slate-600 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800">
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                    {tx.ref_no}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                    {tx.inflow > 0 ? formatBdCurrency(tx.inflow) : "—"}
                  </td>
                  <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400">
                    {tx.outflow > 0 ? formatBdCurrency(tx.outflow) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-white">
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
    </div>
  );
}
