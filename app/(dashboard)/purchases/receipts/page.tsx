"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Truck,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
  PackageCheck,
  Building,
  DollarSign,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface GoodsReceiptItem {
  id: number;
  grn_no: string;
  purchase_no: string;
  supplier_name: string;
  received_date: string;
  items_count: number;
  bill_amount: number;
  freight_charges: number;
  unloading_charges: number;
  total_landed_cost: number;
  status: string;
  received_by: string;
  warehouse: string;
}

export default function GoodsReceiptsPage() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<GoodsReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/purchases/receipts");
      const data = await res.json();
      if (data.status === "success") {
        setReceipts(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load goods receipts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return receipts;
    const q = search.toLowerCase().trim();
    return receipts.filter(
      (r) =>
        r.grn_no.toLowerCase().includes(q) ||
        r.purchase_no.toLowerCase().includes(q) ||
        r.supplier_name.toLowerCase().includes(q) ||
        r.warehouse.toLowerCase().includes(q)
    );
  }, [receipts, search]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (receipts.length === 0) return;
    const headers = ["GRN No", "Purchase Bill", "Supplier", "Date", "Items", "Bill Amount", "Freight", "Labor/Unload", "Landed Cost", "Status", "Warehouse"];
    const rows = receipts.map((r) => [
      `"${r.grn_no}"`,
      `"${r.purchase_no}"`,
      `"${r.supplier_name}"`,
      r.received_date,
      r.items_count,
      r.bill_amount,
      r.freight_charges,
      r.unloading_charges,
      r.total_landed_cost,
      r.status,
      `"${r.warehouse}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `goods_receipts_${new Date().toISOString().slice(0, 10)}.csv`);
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
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Goods Receipts & Landed Costs
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Goods Receipt Notes (GRN), freight allocation, unloading charges, and unit landed cost
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Receipts</span>
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
            placeholder="Search by GRN number, purchase bill, supplier, or warehouse..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading goods receipts...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No goods receipts found.
          </div>
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-2.5 w-[110px]">GRN No</th>
                    <th className="py-2.5 px-2.5 w-[115px]">Purchase Bill</th>
                    <th className="py-2.5 px-2.5">Supplier &amp; Warehouse</th>
                    <th className="py-2.5 px-2 text-center w-[95px]">Date</th>
                    <th className="py-2.5 px-2.5 text-right w-[115px]">Bill Total</th>
                    <th className="py-2.5 px-2.5 text-right w-[115px]">Freight &amp; Labor</th>
                    <th className="py-2.5 px-2.5 text-right w-[125px]">Landed Cost</th>
                    <th className="py-2.5 px-2 text-center w-[95px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((r) => (
                    <tr key={r.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {r.grn_no}
                        </span>
                      </td>

                      <td className="py-2 px-2.5 whitespace-nowrap font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                        {r.purchase_no}
                      </td>

                      <td className="py-2 px-2.5 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate" title={r.supplier_name}>{r.supplier_name}</p>
                        <span className="text-[10px] text-slate-400 truncate block">{r.warehouse} • {r.items_count} items</span>
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap font-medium text-slate-600 dark:text-slate-400 text-[11px]">
                        {r.received_date}
                      </td>

                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(r.bill_amount)}
                      </td>

                      <td className="py-2 px-2.5 text-right whitespace-nowrap text-amber-600 dark:text-amber-400 font-medium">
                        +{formatBdCurrency(r.freight_charges + r.unloading_charges)}
                      </td>

                      <td className="py-2 px-2.5 text-right whitespace-nowrap font-bold text-[#0B3D91] dark:text-blue-400">
                        {formatBdCurrency(r.total_landed_cost)}
                      </td>

                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3" />
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((r) => (
                <div key={r.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {r.grn_no}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{r.supplier_name}</h4>
                      <p className="text-[10px] text-slate-400">{r.received_date} • {r.purchase_no}</p>
                    </div>
                    <span className="font-bold text-[#0B3D91] dark:text-blue-400">
                      {formatBdCurrency(r.total_landed_cost)}
                    </span>
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
