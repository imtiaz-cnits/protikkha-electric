"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  Calendar,
  Printer,
  FileSpreadsheet,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Loader2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  Search,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui";

interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountNameBn: string;
  classification: string;
  normalBalance: string;
  totalDebit: number;
  totalCredit: number;
  balanceDebit: number;
  balanceCredit: number;
}

interface IncomeStatement {
  grossSales: number;
  salesDiscounts: number;
  deliveryIncome: number;
  netRevenue: number;
  cogsCost: number;
  scrapLoss: number;
  totalCogs: number;
  grossProfit: number;
  operatingExpenses: { accountCode: string; name: string; amount: number }[];
  totalOperatingExpenses: number;
  netProfit: number;
}

interface JournalLine {
  accountCode: string;
  debit: number;
  credit: number;
  note?: string;
}

interface JournalEntry {
  entryNo: string;
  date: string;
  referenceType: string;
  referenceNo?: string;
  description: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
}

export default function GeneralLedgerPage() {
  const [activeTab, setActiveTab] = useState<"tb" | "pl" | "coa" | "vouchers">("tb");
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [trialBalance, setTrialBalance] = useState<{
    rows: TrialBalanceRow[];
    totalDebit: number;
    totalCredit: number;
    isBalanced: boolean;
  } | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [coa, setCoa] = useState<Record<string, any>>({});
  const [vouchers, setVouchers] = useState<JournalEntry[]>([]);

  const now = new Date();
  const firstDayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [searchCoa, setSearchCoa] = useState("");
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const url = `/api/reports/general-ledger?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setSummary(data.summary);
        setTrialBalance(data.trial_balance);
        setIncomeStatement(data.income_statement);
        setCoa(data.chart_of_accounts || {});
        setVouchers(data.recent_vouchers || []);
      }
    } catch (err) {
      console.error("General ledger load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const setPreset = (preset: "today" | "yesterday" | "7days" | "month" | "year") => {
    const tStr = new Date().toISOString().split("T")[0];
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
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split("T")[0]);
      setEndDate(tStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(tStr);
    } else if (preset === "year") {
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(tStr);
    }
  };

  const filteredCoa = Object.values(coa).filter(
    (acc: any) =>
      acc.code.includes(searchCoa) ||
      acc.name.toLowerCase().includes(searchCoa.toLowerCase()) ||
      acc.nameBn.includes(searchCoa) ||
      acc.classification.toLowerCase().includes(searchCoa.toLowerCase())
  );

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              General Ledger & Accounts
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                Double-Entry
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              প্রতীক্ষা ইলেকট্রিক - চার্ট অব অ্যাকাউন্টস, রেওয়ামিল ও লাভ-ক্ষতি বিবরণী
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="w-[38px] h-[38px] flex items-center justify-center rounded-xl border border-[#cbd5e1] dark:border-[#334155] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
            title="Print General Ledger"
          >
            <Printer className="w-4 h-4 text-[#1E65A0]" />
          </button>
        </div>
      </div>


      {/* 3. Key Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Double-Entry Status
            </span>
            {trialBalance?.isBalanced ? (
              <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Balanced
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Unbalanced
              </span>
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white">
            {formatBdCurrency(trialBalance?.totalDebit || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Total Debits = Total Credits (Tolerance ৳0.00)
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Net Revenue
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-[#1E65A0]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {formatBdCurrency(incomeStatement?.netRevenue || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Gross Sales - Discounts + Delivery
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Gross Profit
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {formatBdCurrency(incomeStatement?.grossProfit || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Net Revenue - COGS & Scrap Loss
          </p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Net Profit (শুদ্ধ মুনাফা)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-lg font-bold ${(incomeStatement?.netProfit || 0) >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {formatBdCurrency(incomeStatement?.netProfit || 0)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            After Rent, Salaries, Bills & Overheads
          </p>
        </div>
      </div>

      {/* 4. Filters Bar matching Image 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search account, code, voucher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSearchCoa(e.target.value);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Custom Select Filter Dropdown for Tab Navigation */}
        <div className="w-full md:w-64">
          <CustomSelect
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
            options={[
              { value: "tb", label: "Trial Balance (রেওয়ামিল)" },
              { value: "pl", label: "Profit & Loss Statement (লাভ-ক্ষতি)" },
              { value: "coa", label: "Chart of Accounts (হিসাব তালিকা)" },
              { value: "vouchers", label: "Recent Journal Vouchers (ভাউচার লগ)" },
            ]}
            placeholder="Select Statement / View"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-[130px]">
              <CustomDatePicker
                value={startDate}
                onChange={(d) => setStartDate(d)}
                placeholder="From Date"
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[130px]">
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
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={() => setPreset("yesterday")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              onClick={() => setPreset("7days")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              7 Days
            </button>
            <button
              onClick={() => setPreset("month")}
              className="h-[38px] px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              This Month
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Trial Balance */}
      {activeTab === "tb" && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white">
              Trial Balance Statement as of {endDate}
            </h2>
            <div className="text-xs text-slate-500">
              {trialBalance?.rows.length || 0} Active Accounts
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
              <p className="text-xs">Computing General Ledger Balances...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Account Title (English / বাংলা)</th>
                    <th className="py-3 px-4">Classification</th>
                    <th className="py-3 px-4 text-right">Debit Balance (৳)</th>
                    <th className="py-3 px-4 text-right">Credit Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {trialBalance?.rows.map((row) => (
                    <tr
                      key={row.accountCode}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.accountCode}
                      </td>
                      <td className="py-2.5 px-4 font-medium">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {row.accountName}
                        </div>
                        <div className="text-[11px] text-slate-500">{row.accountNameBn}</div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            row.classification === "ASSET"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                              : row.classification === "LIABILITY"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : row.classification === "REVENUE"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : row.classification === "COGS"
                              ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                          }`}
                        >
                          {row.classification}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {row.balanceDebit > 0 ? formatBdCurrency(row.balanceDebit) : "-"}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        {row.balanceCredit > 0 ? formatBdCurrency(row.balanceCredit) : "-"}
                      </td>
                    </tr>
                  ))}
                  {trialBalance?.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No financial activity recorded in selected period
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t-2 border-[#0B3D91] text-xs">
                    <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white uppercase tracking-wider">
                      Total Trial Balance (রেওয়ামিল মোট)
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatBdCurrency(trialBalance?.totalDebit || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatBdCurrency(trialBalance?.totalCredit || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Profit & Loss Statement */}
      {activeTab === "pl" && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs p-6 space-y-6">
          <div className="border-b border-[#cbd5e1] dark:border-[#334155] pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Protikkha Electric - Statement of Profit or Loss
            </h2>
            <p className="text-xs text-slate-500">
              For period: {startDate} to {endDate}
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6 text-sm">
            {/* Revenue Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Operating Revenue (বিক্রয় আয়)
              </h3>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300">Gross Sales of Electrical Products</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {formatBdCurrency(incomeStatement?.grossSales || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60 text-rose-600 dark:text-rose-400">
                <span>Less: Sales Discounts & Concessions</span>
                <span className="font-mono font-medium">
                  - {formatBdCurrency(incomeStatement?.salesDiscounts || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300">Add: Delivery / Carriage Charge Income</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  + {formatBdCurrency(incomeStatement?.deliveryIncome || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 px-3 rounded-lg">
                <span>Net Sales Revenue (নিট বিক্রয় আয়)</span>
                <span className="font-mono text-base">
                  {formatBdCurrency(incomeStatement?.netRevenue || 0)}
                </span>
              </div>
            </div>

            {/* COGS Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                2. Cost of Goods Sold (বিক্রিত পণ্যের ব্যয়)
              </h3>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300">Cost of Electrical Products Sold</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {formatBdCurrency(incomeStatement?.cogsCost || 0)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-700 dark:text-slate-300">Cable Cut-End & Scrap Loss Expense</span>
                <span className="font-mono font-medium text-slate-900 dark:text-white">
                  {formatBdCurrency(incomeStatement?.scrapLoss || 0)}
                </span>
              </div>
              <div className="flex justify-between py-2 font-bold text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 px-3 rounded-lg">
                <span>Total Cost of Goods Sold (মোট COGS)</span>
                <span className="font-mono text-base">
                  - {formatBdCurrency(incomeStatement?.totalCogs || 0)}
                </span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between py-3 font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 rounded-xl border border-amber-200 dark:border-amber-900/50 text-base">
              <span>Gross Profit (মোট মুনাফা)</span>
              <span className="font-mono">
                {formatBdCurrency(incomeStatement?.grossProfit || 0)}
              </span>
            </div>

            {/* Operating Expenses Section */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Operating Expenses (দোকান পরিচালন ব্যয়)
              </h3>
              {incomeStatement?.operatingExpenses.map((exp) => (
                <div
                  key={exp.accountCode}
                  className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60"
                >
                  <span className="text-slate-700 dark:text-slate-300">{exp.name}</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-white">
                    {formatBdCurrency(exp.amount)}
                  </span>
                </div>
              ))}
              {incomeStatement?.operatingExpenses.length === 0 && (
                <div className="text-xs text-slate-400 py-2">No operating expenses recorded</div>
              )}
              <div className="flex justify-between py-2 font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/20 px-3 rounded-lg">
                <span>Total Operating Overhead (মোট পরিচালন খরচ)</span>
                <span className="font-mono text-base">
                  - {formatBdCurrency(incomeStatement?.totalOperatingExpenses || 0)}
                </span>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="flex justify-between py-4 font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 rounded-2xl shadow-md text-lg">
              <span>Net Profit for Period (শুদ্ধ লাভ/ক্ষতি)</span>
              <span className="font-mono">
                {formatBdCurrency(incomeStatement?.netProfit || 0)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Chart of Accounts */}
      {activeTab === "coa" && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#cbd5e1] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#1E65A0]" />
              Official Chart of Accounts (COA Catalog)
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchCoa}
                onChange={(e) => setSearchCoa(e.target.value)}
                placeholder="Search account by code or title..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">বাংলা নাম</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Normal Balance</th>
                  <th className="py-3 px-4">Purpose & Scope</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredCoa.map((acc: any) => (
                  <tr
                    key={acc.code}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {acc.code}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {acc.name}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-600 dark:text-slate-300">
                      {acc.nameBn}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          acc.classification === "ASSET"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : acc.classification === "LIABILITY"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : acc.classification === "REVENUE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : acc.classification === "COGS"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                        }`}
                      >
                        {acc.classification}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 font-medium">
                      {acc.normalBalance}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px]">
                      {acc.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Recent Journal Vouchers */}
      {activeTab === "vouchers" && (
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
          <div className="p-4 border-b border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#1E65A0]" />
              Recent Double-Entry Journal Vouchers (Audit Log)
            </h2>
            <div className="text-xs text-slate-500">
              Showing latest {vouchers.length} vouchers
            </div>
          </div>

          <div className="p-4 space-y-4">
            {vouchers.map((v) => (
              <div
                key={v.entryNo}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {v.entryNo}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(v.date).toLocaleDateString("en-GB")}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {v.referenceType}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Total: {formatBdCurrency(v.totalDebit)}
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 italic">
                  {v.description}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-emerald-600 uppercase">
                      Debits (Dr)
                    </div>
                    {v.lines
                      .filter((l) => l.debit > 0)
                      .map((l, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-0.5 px-2 rounded bg-white dark:bg-slate-800"
                        >
                          <span>
                            {l.accountCode} - {l.note || coa[l.accountCode]?.name}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatBdCurrency(l.debit)}
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="space-y-1">
                    <div className="text-[11px] font-bold text-blue-600 uppercase">
                      Credits (Cr)
                    </div>
                    {v.lines
                      .filter((l) => l.credit > 0)
                      .map((l, i) => (
                        <div
                          key={i}
                          className="flex justify-between py-0.5 px-2 rounded bg-white dark:bg-slate-800"
                        >
                          <span>
                            {l.accountCode} - {l.note || coa[l.accountCode]?.name}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            {formatBdCurrency(l.credit)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ))}

            {vouchers.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs">
                No vouchers found in selected date range
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
