"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Search,
  Calendar,
  Printer,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  FileText,
  User,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { ChallanPrintReceipt, ChallanPrintData } from "@/components/challan/challan-print-receipt";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui";
import { formatBoxAndPcs, formatTileOrItemQty, parseBoxAndPcs } from "@/lib/tiles-calculator";

export default function ChallansPage() {
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected Challan for View / Print
  const [selectedChallan, setSelectedChallan] = useState<ChallanPrintData | null>(null);

  const fetchChallans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (dateFilter) params.set("date", dateFilter);
      params.set("page", String(page));
      params.set("limit", String(limit));

      const res = await fetch(`/api/challans?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setChallans(data.data || []);
        setTotalPages(data.pagination?.total_pages || 1);
        setTotalRecords(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Error fetching challans:", err);
    } finally {
      setLoading(false);
    }
  }, [search, dateFilter, page, limit]);

  useEffect(() => {
    fetchChallans();
  }, [fetchChallans]);

  const handleOpenPrint = async (challanId: number) => {
    try {
      const res = await fetch(`/api/challans/${challanId}`);
      const data = await res.json();
      if (data.status === "success") {
        setSelectedChallan(data.data);
      }
    } catch (err) {
      console.error("Error fetching challan details:", err);
    }
  };

  const formatChallanQty = (c: any): string => {
    if (!c.items || c.items.length === 0) {
      return formatBoxAndPcs(c.total_quantity);
    }
    if (c.items.length === 1) {
      return formatTileOrItemQty(c.items[0].quantity, c.items[0]);
    }
    let totalBoxes = 0;
    let totalPcs = 0;
    let allNonTiles = true;
    for (const it of c.items) {
      const isTile = Boolean(it.tile_size || it.pcs_per_box || (it.unit && it.unit.toLowerCase().includes("box")));
      if (isTile) {
        allNonTiles = false;
        const { fullBoxes, pcs } = parseBoxAndPcs(it.quantity, it.pcs_per_box, it.tile_size);
        totalBoxes += fullBoxes;
        totalPcs += pcs;
      }
    }
    if (allNonTiles) {
      return `${c.total_quantity} Pcs`;
    }
    if (totalBoxes > 0 && totalPcs > 0) {
      return `${totalBoxes} Boxes ${totalPcs} Pcs`;
    } else if (totalBoxes > 0) {
      return `${totalBoxes} Box${totalBoxes > 1 ? "es" : ""}`;
    } else if (totalPcs > 0) {
      return `${totalPcs} Pcs`;
    }
    return "0 Box";
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none">
              Delivery Challans
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tiles delivery documents, logistics register, and warehouse dispatches
            </p>
          </div>
        </div>

        <button
          onClick={fetchChallans}
          className="h-[38px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-600" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search Bar with Custom DatePicker & Custom Select */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl p-4 border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search Challan No, Invoice, Customer..."
              className="h-[38px] w-full pl-9 pr-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#1E65A0] focus:border-[#1E65A0] transition-all shadow-2xs"
            />
          </div>

          {/* Project Custom Flatpickr Date Picker */}
          <div className="w-full sm:w-[150px]">
            <CustomDatePicker
              value={dateFilter}
              onChange={(d) => {
                setDateFilter(d);
                setPage(1);
              }}
              placeholder="Filter Date"
              allowClear
            />
          </div>
        </div>

        {/* Compact Auto-Width Show Entries Dropdown */}
        <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
          <div className="w-[116px]">
            <CustomSelect
              value={String(limit)}
              onChange={(val) => {
                setLimit(Number(val));
                setPage(1);
              }}
              options={[
                { value: "15", label: "Show: 15" },
                { value: "50", label: "Show: 50" },
                { value: "100", label: "Show: 100" },
                { value: "200", label: "Show: 200" },
              ]}
              matchTriggerWidth={true}
              searchThreshold={99}
              className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1 [&_button]:!px-3 whitespace-nowrap"
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-rose-600" />
            <p className="text-xs font-semibold mt-2">Loading delivery records...</p>
          </div>
        ) : challans.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Truck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Delivery Challans Found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Challans are generated from Tiles invoices in the POS or Invoices menu when goods are dispatched from the warehouse.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                    <th className="py-3 px-3 text-center w-[50px]">SL</th>
                    <th className="py-3 px-4">Challan No</th>
                    <th className="py-3 px-4">Invoice Ref</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Vehicle / Driver</th>
                    <th className="py-3 px-4 text-center">Items (Boxes)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                  {challans.map((c, idx) => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">{(page - 1) * limit + idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-rose-800 dark:text-rose-400">
                        {c.challan_no}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white">
                        {c.order_no}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                        {c.challan_date ? new Date(c.challan_date).toLocaleDateString("en-GB") : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {c.customer_name}
                        </div>
                        {c.customer_mobile && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.customer_mobile}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs truncate text-slate-500">
                        {c.delivery_address || "Showroom Counter"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {c.vehicle_no || c.driver_name
                          ? `${c.vehicle_no || ""} ${c.driver_name ? `(${c.driver_name})` : ""}`
                          : "Self Handover"}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-slate-900 dark:text-white whitespace-nowrap">
                        {formatChallanQty(c)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          <CheckCircle2 className="w-3 h-3 text-rose-600" />
                          <span>{c.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPrint(c.id)}
                          className="h-8 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1E65A0] dark:text-blue-300 hover:bg-gradient-to-r hover:from-[#0B3D91] hover:to-[#1E65A0] hover:text-white border border-blue-200 dark:border-blue-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {challans.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-sm text-rose-800 dark:text-rose-400">
                        {c.challan_no}
                      </span>
                      <p className="text-[11px] font-mono text-slate-500">Ref: {c.order_no}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      {c.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] text-slate-400">Customer</span>
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {c.customer_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Quantity</span>
                      <p className="font-bold font-mono text-slate-900 dark:text-white">
                        {formatChallanQty(c)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">
                      {c.challan_date ? new Date(c.challan_date).toLocaleDateString("en-GB") : ""}
                    </span>
                    <button
                      onClick={() => handleOpenPrint(c.id)}
                      className="h-8 px-3 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="h-14 px-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900">
              <div>
                Showing <span className="font-bold text-slate-700 dark:text-slate-200">{challans.length}</span> of{" "}
                <span className="font-bold text-slate-700 dark:text-slate-200">{totalRecords}</span> entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-semibold text-slate-800 dark:text-white">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Printable Receipt Overlay */}
      {selectedChallan && (
        <ChallanPrintReceipt
          challan={selectedChallan}
          onClose={() => setSelectedChallan(null)}
        />
      )}
    </div>
  );
}
