"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileSpreadsheet,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Loader2,
  DollarSign,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { Pagination } from "@/components/ui";
import { ReportFilterBar } from "@/components/reports/report-filter-bar";
import { PrintTableSheet, ReportExportActions } from "@/components/reports/print-table-sheet";
import type { PrintReportPayload } from "@/lib/report-pdf";

interface SalesOrder {
  id: number;
  order_no: string;
  customer_id: number | null;
  customer_name: string;
  customer_mobile: string;
  items_count: number;
  sub_total: number;
  discount_amount: number;
  delivery_charge: number;
  net_amount: number;
  cost_amount: number;
  profit_amount: number;
  paid_amount: number;
  due_amount: number;
  return_amount: number;
  date: string;
}

interface Summary {
  total_orders: number;
  total_sales_amount: number;
  total_cost_amount: number;
  total_gross_profit: number;
  total_paid_amount: number;
  total_due_amount: number;
  total_discount_amount: number;
  total_return_amount: number;
}

export default function SalesReportPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadData = async () => {
    try {
      setLoading(true);
      let url = `/api/reports/sales?search=${encodeURIComponent(search)}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      if (data.status === "success") {
        setOrders(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, startDate, endDate]);

  const startIndex = (currentPage - 1) * pageSize;
  const displayedOrders = orders.slice(startIndex, startIndex + pageSize);

  const reportPayload: PrintReportPayload = useMemo(
    () => ({
      title: "Sales & Gross Profit Report",
      subtitle: "Detailed breakdown of revenue, COGS, profit margin, cash collected, and dues",
      metaItems: [
        {
          label: "Period",
          value: startDate || endDate ? `${startDate || "Start"} to ${endDate || "Today"}` : "All Dates",
        },
        { label: "Total Revenue", value: formatBdCurrency(summary?.total_sales_amount || 0) },
        { label: "Cash Collected", value: formatBdCurrency(summary?.total_paid_amount || 0) },
        { label: "Customer Due", value: formatBdCurrency(summary?.total_due_amount || 0) },
        { label: "Gross Profit", value: formatBdCurrency(summary?.total_gross_profit || 0) },
      ],
      columns: [
        { header: "SL", align: "center", width: "5%" },
        { header: "Invoice / Date", align: "left", width: "17%" },
        { header: "Customer", align: "left", width: "19%" },
        { header: "Items", align: "center", width: "6%" },
        { header: "Cost (৳)", align: "right", width: "11%" },
        { header: "Selling (৳)", align: "right", width: "11%" },
        { header: "Paid (৳)", align: "right", width: "11%" },
        { header: "Due (৳)", align: "right", width: "10%" },
        { header: "Profit (৳)", align: "right", width: "10%" },
      ],
      rows: orders.map((o, idx) => [
        { text: String(idx + 1), align: "center" },
        { text: o.order_no, subText: o.date, bold: true },
        { text: o.customer_name, subText: o.customer_mobile || undefined, bold: true },
        { text: String(o.items_count), align: "center" },
        { text: formatBdCurrency(o.cost_amount), align: "right" },
        { text: formatBdCurrency(o.net_amount), align: "right", bold: true },
        { text: formatBdCurrency(o.paid_amount), align: "right", color: "emerald" },
        { text: formatBdCurrency(o.due_amount), align: "right", color: o.due_amount > 0 ? "rose" : "default" },
        { text: formatBdCurrency(o.profit_amount), align: "right", bold: true, color: "emerald" },
      ]),
      totalRow: [
        "",
        "TOTAL",
        `${orders.length} Invoices`,
        {
          text: String(orders.reduce((s, x) => s + x.items_count, 0)),
          align: "center",
        },
        { text: formatBdCurrency(summary?.total_cost_amount || 0), align: "right" },
        { text: formatBdCurrency(summary?.total_sales_amount || 0), align: "right" },
        { text: formatBdCurrency(summary?.total_paid_amount || 0), align: "right", color: "emerald" },
        { text: formatBdCurrency(summary?.total_due_amount || 0), align: "right", color: "rose" },
        { text: formatBdCurrency(summary?.total_gross_profit || 0), align: "right", color: "emerald" },
      ],
      filename: "sales-gross-profit-report",
    }),
    [orders, summary, startDate, endDate]
  );

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Sales & Gross Profit Report
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Detailed breakdown of revenue, COGS, profit margin, cash collected, and dues
            </p>
          </div>
        </div>

        <ReportExportActions payload={reportPayload} />
      </div>

      {/* 2. Four Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-[#1E65A0]" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBdCurrency(summary?.total_sales_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary?.total_orders || 0} invoices generated
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Cash Collected</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBdCurrency(summary?.total_paid_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Paid at counter / POS
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Customer Due (Receivable)</span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {formatBdCurrency(summary?.total_due_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Pending customer dues
          </div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Estimated Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {formatBdCurrency(summary?.total_gross_profit || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Sales less buying cost & returns
          </div>
        </div>
      </div>

      {/* 3. Unified Dynamic Date Range & Custom Preset Dropdown Bar */}
      <ReportFilterBar
        search={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search invoice or customer..."
        startDate={startDate}
        endDate={endDate}
        onDateRangeChange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
          setCurrentPage(1);
        }}
        onClear={() => {
          setSearch("");
          setStartDate("");
          setEndDate("");
          setCurrentPage(1);
        }}
      />

      {/* 4. Compact Full-Screen Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <table className="w-full table-fixed text-left text-xs border-collapse">
          <thead>
            <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
              <th className="py-2.5 px-2.5 text-center w-[44px]">SL</th>
              <th className="py-2.5 px-3 w-[16%]">Invoice / Date</th>
              <th className="py-2.5 px-3 w-[18%]">Customer</th>
              <th className="py-2.5 px-2 text-center w-[58px]">Items</th>
              <th className="py-2.5 px-2.5 text-right w-[12%]">Cost (৳)</th>
              <th className="py-2.5 px-2.5 text-right w-[13%]">Selling (৳)</th>
              <th className="py-2.5 px-2.5 text-right w-[12%]">Paid (৳)</th>
              <th className="py-2.5 px-2.5 text-right w-[11%]">Due (৳)</th>
              <th className="py-2.5 px-3 text-right w-[12%]">Profit (৳)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E65A0]" />
                  <span>Loading sales report...</span>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                  No sales invoices found for the specified period.
                </td>
              </tr>
            ) : (
              displayedOrders.map((o, idx) => (
                <tr
                  key={o.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-2.5 px-2.5 text-center font-bold text-slate-500">
                    {startIndex + idx + 1}
                  </td>
                  <td className="py-2.5 px-3 truncate">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate" title={o.order_no}>
                      {o.order_no}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {o.date}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 truncate">
                    <div className="font-bold text-slate-800 dark:text-slate-100 truncate" title={o.customer_name}>
                      {o.customer_name}
                    </div>
                    {o.customer_mobile && (
                      <div className="text-[10px] text-slate-400 truncate">
                        {o.customer_mobile}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center font-bold text-slate-700 dark:text-slate-300">
                    {o.items_count}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatBdCurrency(o.cost_amount)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-black text-slate-900 dark:text-white whitespace-nowrap">
                    {formatBdCurrency(o.net_amount)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {formatBdCurrency(o.paid_amount)}
                  </td>
                  <td className="py-2.5 px-2.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                    {formatBdCurrency(o.due_amount)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    {formatBdCurrency(o.profit_amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={orders.length}
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
        {displayedOrders.map((o) => (
          <div
            key={o.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">
                  {o.order_no}
                </span>
                <p className="text-[11px] text-slate-500">{o.customer_name}</p>
              </div>
              <span className="font-black text-xs text-slate-900 dark:text-white">
                {formatBdCurrency(o.net_amount)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs py-1.5 border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <div>
                <div className="text-[10px] text-slate-400">Paid</div>
                <div className="font-bold text-emerald-600">{formatBdCurrency(o.paid_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Due</div>
                <div className="font-bold text-rose-600">{formatBdCurrency(o.due_amount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Profit</div>
                <div className="font-bold text-emerald-700">{formatBdCurrency(o.profit_amount)}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 text-right">
              Date: {o.date} &bull; {o.items_count} items
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={orders.length}
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

      <PrintTableSheet {...reportPayload} />
    </div>
  );
}
