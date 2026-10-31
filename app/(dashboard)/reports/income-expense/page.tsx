"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Scale,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Tag,
  Truck,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";
import { getPresetDateRange } from "@/lib/report-date-utils";

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

  const initialRange = getPresetDateRange("month");
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      const qs = params.toString();
      const res = await fetch(`/api/reports/income-expense${qs ? `?${qs}` : ""}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.status === "success") {
        setSummary(data.summary);
        setExpenses(data.expenses_breakdown || []);
        setSuppliers(data.supplier_payments_breakdown || []);
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

  const q = search.trim().toLowerCase();

  const filteredExpenses = useMemo(() => {
    if (!q) return expenses;
    return expenses.filter((e) => e.type_name.toLowerCase().includes(q));
  }, [expenses, q]);

  const filteredSuppliers = useMemo(() => {
    if (!q) return suppliers;
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, q]);

  const reportPayload: PrintReportPayload = useMemo(() => {
    const rows: PrintReportPayload["rows"] = [
      [
        { text: "1", align: "center" },
        { text: "Opening Cash Float", bold: true },
        "Opening Drawer Balance",
        { text: formatBdCurrency(summary?.opening_balance || 0), align: "right", bold: true, color: "amber" },
        { text: "—", align: "right", color: "muted" },
      ],
      [
        { text: "2", align: "center" },
        { text: "Sales Cash Collections", bold: true },
        "Counter & POS Invoices (জমা)",
        { text: formatBdCurrency(summary?.sales_collection || 0), align: "right", bold: true, color: "emerald" },
        { text: "—", align: "right", color: "muted" },
      ],
      [
        { text: "3", align: "center" },
        { text: "Customer Due Collections", bold: true },
        "Receivable Arrears Recovered (জমা)",
        { text: formatBdCurrency(summary?.due_collection || 0), align: "right", bold: true, color: "emerald" },
        { text: "—", align: "right", color: "muted" },
      ],
      ...filteredExpenses.map((exp, idx) => [
        { text: String(4 + idx), align: "center" as const },
        { text: exp.type_name, bold: true },
        `Operating Overhead (${exp.count} entries)`,
        { text: "—", align: "right" as const, color: "muted" as const },
        { text: formatBdCurrency(exp.total_amount), align: "right" as const, bold: true, color: "rose" as const },
      ]),
      ...filteredSuppliers.map((sup, idx) => [
        { text: String(4 + filteredExpenses.length + idx), align: "center" as const },
        { text: sup.name, bold: true },
        "Supplier Payment (খরচ)",
        { text: "—", align: "right" as const, color: "muted" as const },
        { text: formatBdCurrency(sup.total_paid), align: "right" as const, bold: true, color: "rose" as const },
      ]),
    ];

    return {
      title: "Income & Expense Statement (প্রাপ্তি-পরিশোধ বিবরণী)",
      subtitle: "Complete receipts & payments accounting with categorized breakdown",
      metaItems: [
        {
          label: "Period",
          value: startDate || endDate ? `${startDate || "Start"} to ${endDate || "Today"}` : "All Dates",
        },
        { label: "Opening Balance", value: formatBdCurrency(summary?.opening_balance || 0) },
        { label: "Total Receipts (জমা)", value: formatBdCurrency(summary?.total_inflow || 0) },
        { label: "Total Payments (খরচ)", value: formatBdCurrency(summary?.total_outflow || 0) },
        { label: "Closing Balance", value: formatBdCurrency(summary?.closing_balance || 0) },
      ],
      columns: [
        { header: "SL", align: "center", width: "6%" },
        { header: "Particulars / বিবরণ", align: "left", width: "34%" },
        { header: "Category / Type", align: "left", width: "26%" },
        { header: "Receipts / জমা (৳)", align: "right", width: "17%" },
        { header: "Payments / খরচ (৳)", align: "right", width: "17%" },
      ],
      rows,
      totalRow: [
        "",
        "TOTAL RECEIPTS, PAYMENTS & CLOSING BALANCE",
        `Closing: ${formatBdCurrency(summary?.closing_balance || 0)}`,
        { text: formatBdCurrency(summary?.total_inflow || 0), align: "right", color: "emerald" },
        { text: formatBdCurrency(summary?.total_outflow || 0), align: "right", color: "rose" },
      ],
      filename: "income-expense-statement",
    };
  }, [summary, filteredExpenses, filteredSuppliers, startDate, endDate]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
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

        <ReportExportActions payload={reportPayload} />
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
              <Wallet className="w-4 h-4 text-[#1E65A0]" />
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

      {/* 3. Unified Dynamic Filter Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={(val) => setSearch(val)}
        searchPlaceholder="Search particular, expense, supplier..."
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

      {/* 4. Two-Column Dual Financial Ledger (Receipts vs Payments) */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${loading ? "opacity-60" : ""}`}>
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
          <div className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-4 py-3 flex items-center justify-between text-white font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-amber-300" />
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
              {filteredExpenses.length === 0 ? (
                <div className="text-xs text-slate-400 py-2">No operating expenses</div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredExpenses.map((exp, idx) => (
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
              {filteredSuppliers.length === 0 ? (
                <div className="text-xs text-slate-400 py-1">No supplier payments</div>
              ) : (
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {filteredSuppliers.map((sup, idx) => (
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

      <PrintTableSheet {...reportPayload} />
    </div>
  );
}
