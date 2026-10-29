"use client";

import { useEffect, useState } from "react";
import {
  Receipt,
  Search,
  Printer,
  Eye,
  Wallet,
  X,
  Loader2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  UserCheck,
  FileText,
  DollarSign,
  ArrowRight,
  Truck,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { formatElectricalQty, formatElectricalOrderQty, formatTileOrItemQty, formatOrderQty } from "@/lib/electrical-unit-service";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt";
import { CustomSelect, Pagination } from "@/components/ui";
import { InvoiceActionMenu } from "@/components/invoices/invoice-action-menu";

interface Invoice {
  id: number;
  order_no: string;
  invoice_date: string | null;
  customer_id: number;
  customer_name: string;
  customer_mobile: string;
  customer_address: string;
  customer_prev_due: number;
  cashier: string;
  sub_total: number;
  delivery_charge: number;
  discount_amount: number;
  return_adjustment_amount: number;
  net_payable: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  payment_status: string;
  total_items: number;
  order_note?: string | null;
  challan_status?: string;
  has_pending_tiles?: boolean;
  has_tiles?: boolean;
  has_challan?: boolean;
  challan_id?: number | null;
  challan_no?: string | null;
  details: Array<{
    id: number;
    product_name: string;
    product_code?: string;
    spec_type?: string | null;
    cable_size?: string | null;
    current_rating?: string | null;
    voltage_grade?: string | null;
    wattage?: string | null;
    gang_module?: string | null;
    packaging_unit?: string | null;
    conversion_ratio?: number | null;
    is_tiles?: boolean;
    tile_size?: string | null;
    sqft_per_box?: number | null;
    pcs_per_box?: number | null;
    grade?: string | null;
    category?: string | null;
    quantity: number;
    selling_price: number;
    unit: string;
    line_total: number;
  }>;
  payments: Array<{
    id: number;
    paid_amount: number;
    payment_method: string;
    payment_status: string;
    transaction_id?: string | null;
  }>;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  
  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCollectDueOpen, setIsCollectDueOpen] = useState(false);
  const [thermalReceiptData, setThermalReceiptData] = useState<any | null>(null);
    
  // Due collection state
  const [dueCollectData, setDueCollectData] = useState({
    paid_amount: "",
    discount_amount: "0",
    payment_method: "Cash",
    transaction_id: "",
    note: "",
  });
  const [submittingDue, setSubmittingDue] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/invoices?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.status === "success") {
        setInvoices(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search]);

  // Handle Due Collection Submission
  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !dueCollectData.paid_amount) return;

    try {
      setSubmittingDue(true);
      const res = await fetch("/api/customers/due-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedInvoice.customer_id,
          order_id: selectedInvoice.id,
          paid_amount: dueCollectData.paid_amount,
          discount_amount: dueCollectData.discount_amount,
          payment_method: dueCollectData.payment_method,
          transaction_id: dueCollectData.transaction_id,
          note: dueCollectData.note,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsCollectDueOpen(false);
        setSelectedInvoice(null);
        setCurrentPage(1);
        loadInvoices();
      } else {
        alert(data.message || "Failed to collect due");
      }
    } catch (err) {
      alert("Communication error");
    } finally {
      setSubmittingDue(false);
    }
  };

  // Trigger 80mm receipt
  const triggerThermalReceipt = (inv: Invoice) => {
    setThermalReceiptData({
      id: inv.id,
      order_no: inv.order_no,
      has_tiles: Boolean(
        inv.has_tiles ||
        inv.has_pending_tiles ||
        inv.has_challan ||
        (inv.challan_status && inv.challan_status !== "NOT_REQUIRED")
      ),
      challan_status: inv.challan_status,
      invoice_date: inv.invoice_date || new Date().toISOString().split("T")[0],
      customer: {
        customer_name: inv.customer_name,
        mobile: inv.customer_mobile,
        address_details: inv.customer_address,
      },
      cashier: inv.cashier,
      sub_total: inv.sub_total,
      discount_amount: inv.discount_amount,
      delivery_charge: inv.delivery_charge,
      return_adjustment_amount: inv.return_adjustment_amount,
      paid_amount: inv.paid_amount,
      due_amount: inv.due_amount,
      previous_due_amount: inv.customer_prev_due,
      payment_method: inv.payment_method,
      order_note: inv.order_note,
      details: inv.details.map((d) => ({
        product_name: d.product_name,
        tile_size: d.tile_size,
        sqft_per_box: d.sqft_per_box,
        grade: d.grade,
        quantity: d.quantity,
        price: d.selling_price,
        total: d.line_total,
      })),
    });
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter === "paid" && inv.payment_status !== "Paid") return false;
    if (statusFilter === "due" && inv.due_amount <= 0) return false;
    if (statusFilter === "partial" && inv.payment_status !== "Partial Paid") return false;
    return true;
  });

  const startIndex = (currentPage - 1) * pageSize;
  const displayedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  const totalSalesRevenue = invoices.reduce((sum, inv) => sum + inv.net_payable, 0);
  const totalSalesDue = invoices.reduce((sum, inv) => sum + inv.due_amount, 0);

  return (
    <div className="space-y-4">
      {/* 1. Header & Summary Statistics (Strict Marss Corp Rule) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Sales Invoices Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Track customer sales, payments, print vouchers, and collect due
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Revenue */}
          <div className="h-[38px] px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              Sales Revenue:
            </span>
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
              {formatBdCurrency(totalSalesRevenue)}
            </span>
          </div>

          {/* Sales Due */}
          <div className="h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              Sales Due:
            </span>
            <span className="text-xs font-black text-rose-800 dark:text-rose-300">
              {formatBdCurrency(totalSalesDue)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Invoice #, Customer name, or mobile..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { label: "All Invoices", value: "all" },
            { label: "Paid", value: "paid" },
            { label: "Partial Paid", value: "partial" },
            { label: "Due", value: "due" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`h-[32px] px-3.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${statusFilter === tab.value
                ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white shadow-xs"
                : "bg-slate-100 dark:bg-[#1e293b] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Desktop Table (Strict Marss Corp Rule: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Invoice # / Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3 text-center">Items</th>
                <th className="py-3 px-3 text-right">Net Payable</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Due Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-rose-600" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                    No invoices matching the search criteria.
                  </td>
                </tr>
              ) : (
                displayedInvoices.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                        {inv.order_no}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{inv.invoice_date || "N/A"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {inv.customer_name}
                      </div>
                      <div className="text-[10px] text-slate-400">{inv.customer_mobile}</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatOrderQty(inv.details, inv.total_items, inv.has_tiles)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatBdCurrency(inv.net_payable)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBdCurrency(inv.paid_amount)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black ${inv.due_amount > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                      >
                        {formatBdCurrency(inv.due_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${inv.payment_status === "Paid"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : inv.payment_status === "Partial Paid"
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                          }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <InvoiceActionMenu
                          invoice={inv}
                          onPrintReceipt={triggerThermalReceipt}
                          onCollectDue={(invoice) => {
                            setSelectedInvoice(inv);
                            setDueCollectData({
                              paid_amount: String(invoice.due_amount),
                              discount_amount: "0",
                              payment_method: "Cash",
                              transaction_id: "",
                              note: `Due collection for ${invoice.order_no}`,
                            });
                            setIsCollectDueOpen(true);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Desktop */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredInvoices.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 4. Mobile Card View */}
      <div className="block md:hidden space-y-2.5">
        {displayedInvoices.map((inv) => (
          <div
            key={inv.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {inv.order_no}
                </span>
                <p className="text-[11px] font-semibold text-emerald-600">
                  {inv.customer_name} ({inv.customer_mobile})
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${inv.payment_status === "Paid"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                    }`}
                >
                  {inv.payment_status}
                </span>
                <InvoiceActionMenu
                  invoice={inv}
                  onPrintReceipt={triggerThermalReceipt}
                  onCollectDue={(invoice) => {
                    setSelectedInvoice(inv);
                    setDueCollectData({
                      paid_amount: String(invoice.due_amount),
                      discount_amount: "0",
                      payment_method: "Cash",
                      transaction_id: "",
                      note: `Due collection for ${invoice.order_no}`,
                    });
                    setIsCollectDueOpen(true);
                          }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block">Net Payable:</span>
                <span className="font-bold">{formatBdCurrency(inv.net_payable)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">
                  Due Amount:
                </span>
                <span
                  className={`font-black ${inv.due_amount > 0
                    ? "text-rose-600"
                    : "text-emerald-600"
                    }`}
                >
                  {formatBdCurrency(inv.due_amount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              

              {/* Print Button */}
              <button
                type="button"
                onClick={() => triggerThermalReceipt(inv)}
                className="h-[30px] w-full px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              {/* Return Button */}
              <Link
                href={`/returns?tab=sales&order_no=${encodeURIComponent(inv.order_no)}`}
                className="h-[30px] w-full px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1"
                title="Process Sales Return"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return</span>
              </Link>

              {/* View Button */}
              <Link
                href={`/invoices/${inv.id}`}
                className="h-[30px] w-full px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center"
              >
                View
              </Link>
            </div>
          </div>
        ))}

        {/* Pagination Controls Mobile */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredInvoices.length}
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

      {/* 5. VIEW INVOICE DETAILS MODAL */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Invoice Details: {selectedInvoice.order_no}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                
                <button
                  type="button"
                  onClick={() => triggerThermalReceipt(selectedInvoice)}
                  className="h-[30px] p-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Customer & Invoice Meta */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer:</span>
                  <strong className="text-slate-800 dark:text-white font-bold">
                    {selectedInvoice.customer_name}
                  </strong>
                  <div className="text-slate-500">{selectedInvoice.customer_mobile}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {selectedInvoice.customer_address}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date / Cashier:</span>
                  <strong>{selectedInvoice.invoice_date}</strong>
                  <div className="text-slate-500">Cashier: {selectedInvoice.cashier}</div>
                  <div className="text-slate-500">Method: {selectedInvoice.payment_method}</div>
                </div>
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-[#1e293b] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-2 text-center w-16">Qty</th>
                      <th className="py-2.5 px-2 text-right w-24">Price (৳)</th>
                      <th className="py-2.5 px-3 text-right w-28">Total (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedInvoice.details.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-medium">
                          <div>{d.product_name}</div>
                          {(d.cable_size || d.voltage_grade || d.current_rating || d.wattage || d.gang_module) && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {d.cable_size && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                                  ⚡ {d.cable_size}
                                </span>
                              )}
                              {d.current_rating && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                  ⚡ {d.current_rating}
                                </span>
                              )}
                              {d.wattage && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                                  💡 {d.wattage}
                                </span>
                              )}
                              {d.gang_module && (
                                <span className="text-[9px] font-bold text-slate-500">
                                  {d.gang_module}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-bold whitespace-nowrap">
                          {formatTileOrItemQty(d.quantity, d)}
                        </td>
                        <td className="py-2 px-2 text-right">{d.selling_price.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold">{d.line_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3.5 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <strong>{formatBdCurrency(selectedInvoice.sub_total)}</strong>
                </div>
                {selectedInvoice.delivery_charge > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Charge:</span>
                    <span>+{formatBdCurrency(selectedInvoice.delivery_charge)}</span>
                  </div>
                )}
                {selectedInvoice.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Discount:</span>
                    <span>-{formatBdCurrency(selectedInvoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black pt-1 border-t border-slate-200 dark:border-slate-800 text-sm">
                  <span>Net Payable:</span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {formatBdCurrency(selectedInvoice.net_payable)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid ({selectedInvoice.payment_method}):</span>
                  <span>{formatBdCurrency(selectedInvoice.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-black">
                  <span>Due Balance:</span>
                  <span>{formatBdCurrency(selectedInvoice.due_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. COLLECT DUE MODAL */}
      {isCollectDueOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Collect Customer Due
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCollectDueOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCollectDue} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <strong className="font-mono">{selectedInvoice.order_no}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <strong className="font-bold">{selectedInvoice.customer_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Due:</span>
                  <strong className="font-black text-rose-600">
                    {formatBdCurrency(selectedInvoice.due_amount)}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Collected Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={dueCollectData.paid_amount}
                  onChange={(e) =>
                    setDueCollectData({ ...dueCollectData, paid_amount: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Discount / Concession (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={dueCollectData.discount_amount}
                  onChange={(e) =>
                    setDueCollectData({ ...dueCollectData, discount_amount: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <CustomSelect
                  value={dueCollectData.payment_method}
                  onChange={(val) =>
                    setDueCollectData({ ...dueCollectData, payment_method: val })
                  }
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "bKash", label: "bKash" },
                    { value: "Nagad", label: "Nagad" },
                    { value: "Rocket", label: "Rocket" },
                    { value: "Bank", label: "Bank Transfer" },
                    { value: "Card", label: "Card" },
                  ]}
                  placeholder="Select Payment Method"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction ID / Ref
                </label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={dueCollectData.transaction_id}
                  onChange={(e) =>
                    setDueCollectData({ ...dueCollectData, transaction_id: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollectDueOpen(false)}
                  disabled={submittingDue}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDue}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {submittingDue && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Collection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. THERMAL RECEIPT MODAL */}
      {thermalReceiptData && (
        <ThermalReceiptModal
          receiptData={thermalReceiptData}
          onClose={() => setThermalReceiptData(null)}
        />
      )}

      

      
    </div>
  );
}
