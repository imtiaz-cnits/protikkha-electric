"use client";

import { useEffect, useState } from "react";
import {
  Scale,
  Calendar,
  Printer,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Loader2,
  TrendingUp,
  Tag,
  Truck,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";

interface StatementSummary {
  opening_balance: number;
  sales_collection: number;
  due_collection: number;
  total_inflow: number;
  supplier_payments: number;
  total_expenses: number;
  total_outflow: number;
  net_cash_flow: number;
  closing_balance: number;
}

interface ExpenseBreakdown {
  type_name: string;
  count: number;
  total_amount: number;
}

interface SupplierBreakdown {
  name: string;
  total_paid: number;
}

export default function IncomeExpensePage() {
  const [summary, setSummary] = useState<StatementSummary | null>(null);
  const [expenses, setExpenses] = useState<ExpenseBreakdown[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const todayStr = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(firstDayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = `/api/reports/income-expense?start_date=${startDate}&end_date=${endDate}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setSummary(data.summary);
        setExpenses(data.expenses_breakdown);
        setSuppliers(data.supplier_payments_breakdown);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const setPreset = (preset: "today" | "month" | "last30") => {
    const tStr = new Date().toISOString().split("T")[0];
    if (preset === "today") {
      setStartDate(tStr);
      setEndDate(tStr);
    } else if (preset === "month") {
      setStartDate(firstDayStr);
      setEndDate(tStr);
    } else if (preset === "last30") {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      setStartDate(past.toISOString().split("T")[0]);
      setEndDate(tStr);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Income & Expense Statement (প্রাপ্তি-পরিশোধ বিবরণী)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Complete receipts & payments accounting with categorized breakdown
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="h-[38px] px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto border border-[#cbd5e1] dark:border-[#334155]"
        >
          <Printer className="w-4 h-4" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* 2. Top Summary KPI Row */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Opening Balance</span>
              <Coins className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {formatBdCurrency(summary.opening_balance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Initial cash float</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Total Receipts (জমা)</span>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              +{formatBdCurrency(summary.total_inflow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sales & customer dues</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Total Payments (খরচ)</span>
              <ArrowUpRight className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
              -{formatBdCurrency(summary.total_outflow)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Overheads & suppliers</div>
          </div>

          <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
              <span>Closing Balance</span>
              <Wallet className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
              {formatBdCurrency(summary.closing_balance)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Net: {formatBdCurrency(summary.net_cash_flow)}
            </div>
          </div>
        </div>
      )}

      {/* 3. Date Range Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="flex items-center gap-1.5 flex-wrap">
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

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPreset("today")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            Today
          </button>
          <button
            onClick={() => setPreset("month")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            This Month
          </button>
          <button
            onClick={() => setPreset("last30")}
            className="h-[38px] px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* 4. Two-Column Dual Financial Ledger (Receipts vs Payments) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Card: Cash Receipts / Inflow */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
          <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-4 py-3 flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-200" />
              <span>Cash Receipts / মোট প্রাপ্তি (জমা)</span>
            </div>
            <span>{formatBdCurrency(summary?.total_inflow || 0)}</span>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Sales Cash Collections
                </div>
                <div className="text-[11px] text-slate-400">Counter and POS invoices</div>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                {formatBdCurrency(summary?.sales_collection || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Customer Due Collections
                </div>
                <div className="text-[11px] text-slate-400">Past arrears recovered</div>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                {formatBdCurrency(summary?.due_collection || 0)}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Total Revenue Receipts</span>
              <span className="text-emerald-700 dark:text-emerald-300 text-sm font-black">
                {formatBdCurrency(summary?.total_inflow || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Card: Cash Payments / Outflow */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
          <div className="bg-rose-700 px-4 py-3 flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-rose-200" />
              <span>Cash Payments / মোট পরিশোধ (খরচ)</span>
            </div>
            <span>{formatBdCurrency(summary?.total_outflow || 0)}</span>
          </div>

          <div className="p-4 space-y-4">
            {/* Category wise expenses */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>Operating Overheads Breakdown</span>
              </div>
              {expenses.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No operating expenses</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {expenses.map((exp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {exp.type_name} ({exp.count})
                      </span>
                      <span className="font-bold text-rose-600">
                        {formatBdCurrency(exp.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Supplier Payments */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5" />
                <span>Supplier Due Payments</span>
              </div>
              {suppliers.length === 0 ? (
                <div className="text-xs text-slate-400 py-1">No supplier payments</div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {suppliers.map((sup, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800"
                    >
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {sup.name}
                      </span>
                      <span className="font-bold text-rose-600">
                        {formatBdCurrency(sup.total_paid)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Total Expenditure Payments</span>
              <span className="text-rose-600 text-sm font-black">
                {formatBdCurrency(summary?.total_outflow || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
