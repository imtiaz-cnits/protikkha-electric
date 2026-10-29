"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Boxes,
  ArrowRight,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Loader2,
  Building2,
  Eye,
  RefreshCw,
  X,
  Package,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui";

interface TransferItem {
  id: number;
  product_id: number;
  quantity: number;
  unit: string;
  notes?: string;
  products?: {
    id: number;
    product_name: string;
    product_code: string;
  };
}

interface TransferRecord {
  id: number;
  transfer_no: string;
  from_business_unit_id: number;
  to_business_unit_id: number;
  status: "DRAFT" | "DISPATCHED" | "RECEIVED" | "CANCELLED";
  transfer_date: string;
  dispatched_at?: string;
  received_at?: string;
  note?: string;
  from_business_unit?: { id: number; name: string; code: string };
  to_business_unit?: { id: number; name: string; code: string };
  transfer_items?: TransferItem[];
  users?: { id: number; name: string };
}

interface BusinessUnit {
  id: number;
  name: string;
  code: string;
  unit_type: string;
}

interface ProductOption {
  id: number;
  product_name: string;
  primary_code?: string;
  quantity: number;
  unit: string;
}

export default function StockTransfersPage() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Stores and Products
  const [stores, setStores] = useState<BusinessUnit[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [fromUnitId, setFromUnitId] = useState("");
  const [toUnitId, setToUnitId] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Array<{ product_id: string; quantity: string; unit: string; notes: string }>>([
    { product_id: "", quantity: "1", unit: "Pcs", notes: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // View Modal
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadTransfers = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/inventory/transfers?page=${currentPage}&pageSize=${pageSize}&search=${encodeURIComponent(
          search
        )}&status=${statusFilter}`
      );
      const data = await res.json();
      if (data.status === "success") {
        setTransfers(data.data);
        setTotalRecords(data.pagination.total);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load store transfers");
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [storesRes, prodsRes] = await Promise.all([
        fetch("/api/business-units"),
        fetch("/api/products?limit=all"),
      ]);
      const storesData = await storesRes.json();
      const prodsData = await prodsRes.json();

      if (storesData.status === "success") {
        setStores(storesData.data);
        if (storesData.data.length >= 2) {
          setFromUnitId(String(storesData.data[0].id));
          setToUnitId(String(storesData.data[1].id));
        }
      }
      if (prodsData.status === "success") {
        setProducts(prodsData.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadTransfers();
  }, [currentPage, pageSize, search, statusFilter]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { product_id: "", quantity: "1", unit: "Pcs", notes: "" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, val: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      if (field === "product_id") {
        const prod = products.find((p) => String(p.id) === val);
        if (prod) {
          next[index].unit = prod.unit || "Pcs";
        }
      }
      return next;
    });
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromUnitId || !toUnitId) {
      toast.error("Please select both source and destination stores");
      return;
    }
    if (fromUnitId === toUnitId) {
      toast.error("Source and destination store cannot be the same");
      return;
    }

    const validItems = items.filter((it) => it.product_id && parseFloat(it.quantity) > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid product with quantity");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/inventory/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from_business_unit_id: parseInt(fromUnitId),
          to_business_unit_id: parseInt(toUnitId),
          transfer_date: transferDate,
          note: notes,
          items: validItems.map((it) => ({
            product_id: parseInt(it.product_id),
            quantity: parseFloat(it.quantity),
            unit: it.unit,
            notes: it.notes,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Stock transfer draft created!");
        setIsCreateOpen(false);
        setItems([{ product_id: "", quantity: "1", unit: "Pcs", notes: "" }]);
        setNotes("");
        loadTransfers();
      } else {
        toast.error(data.message || "Failed to create transfer");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatch = async (transferId: number) => {
    if (!confirm("Are you sure you want to dispatch this transfer? Stock will be deducted from source store.")) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/inventory/transfers/${transferId}/dispatch`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Transfer dispatched into transit!");
        loadTransfers();
        if (selectedTransfer?.id === transferId) setSelectedTransfer(null);
      } else {
        toast.error(data.message || "Dispatch failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error during dispatch");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceive = async (transferId: number) => {
    if (!confirm("Confirm receipt of goods? Destination store inventory will be incremented.")) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await fetch(`/api/inventory/transfers/${transferId}/receive`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Stock received and inventoried successfully!");
        loadTransfers();
        if (selectedTransfer?.id === transferId) setSelectedTransfer(null);
      } else {
        toast.error(data.message || "Receipt failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error during receive");
    } finally {
      setActionLoading(false);
    }
  };

  // Status badge styling
  const renderStatus = (st: string) => {
    switch (st) {
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5" /> DRAFT (খসড়া)
          </span>
        );
      case "DISPATCHED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            <Truck className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> IN TRANSIT (ট্রানজিটে)
          </span>
        );
      case "RECEIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> RECEIVED (গৃহীত)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300">
            <XCircle className="w-3.5 h-3.5" /> {st}
          </span>
        );
    }
  };

  const storeOptions = stores.map((s) => ({ value: String(s.id), label: `${s.name} (${s.code})` }));
  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.product_name} [Stock: ${p.quantity} ${p.unit}]`,
  }));

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Store & Warehouse Stock Transfers
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                ইন্টার-স্টোর ট্রান্সফার
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              শোরুম ও সেন্ট্রাল ওয়্যারহাউসের মধ্যে মালামাল পাঠানো, ট্র্যাকিং ও রিসিভ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs"
          >
            <Plus className="w-4 h-4" />
            নতুন স্টক ট্রান্সফার
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Transfers</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalRecords}</div>
          <p className="text-[11px] text-slate-400 mt-1">সর্বমোট ট্রান্সফার চালানের সংখ্যা</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Draft Transfers</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-300 font-mono">
            {transfers.filter((t) => t.status === "DRAFT").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">খসড়া ও অনুমোদন অপেক্ষমাণ</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">In-Transit</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {transfers.filter((t) => t.status === "DISPATCHED").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">গাড়িতে বা রাস্তায় রয়েছে</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Completed & Received</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {transfers.filter((t) => t.status === "RECEIVED").length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সফলভাবে রিসিভ সম্পন্ন</p>
        </div>
      </div>

      {/* 3. Search and Status Filters */}
      <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer no, note..."
            className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "DRAFT", "DISPATCHED", "RECEIVED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-[#0B3D91] text-white shadow-xs"
                  : "border border-[#cbd5e1] dark:border-[#334155] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table (Desktop) & Cards (Mobile) */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading store transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Truck className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোন স্টক ট্রান্সফার রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400">নতুন মালামাল ট্রান্সফার করতে উপরের বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Transfer No</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">From (উৎস)</th>
                    <th className="px-4 py-3 font-semibold">To (গন্তব্য)</th>
                    <th className="px-4 py-3 font-semibold">Items</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transfers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-bold font-mono text-[#1E65A0] dark:text-blue-400">
                        {t.transfer_no}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-mono">
                        {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString("en-GB") : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-semibold">
                        {t.from_business_unit?.name || `Store #${t.from_business_unit_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-semibold">
                        <div className="flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 text-amber-500" />
                          {t.to_business_unit?.name || `Store #${t.to_business_unit_id}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {t.transfer_items?.length || 0}
                        </span>{" "}
                        Products
                      </td>
                      <td className="px-4 py-3">{renderStatus(t.status)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTransfer(t)}
                            title="View Details"
                            className="p-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-slate-600 hover:text-[#1E65A0] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {t.status === "DRAFT" && (
                            <button
                              onClick={() => handleDispatch(t.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              মালামাল ছাড়ুন (Dispatch)
                            </button>
                          )}

                          {t.status === "DISPATCHED" && (
                            <button
                              onClick={() => handleReceive(t.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              রিসিভ করুন (Receive)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {transfers.map((t) => (
                <div key={t.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-[#1E65A0]">{t.transfer_no}</span>
                    {renderStatus(t.status)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">{t.from_business_unit?.name}</span>
                    <span className="mx-1 text-amber-500">➔</span>
                    <span className="font-semibold">{t.to_business_unit?.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400">Date:</span>{" "}
                      <span className="font-mono text-slate-700 dark:text-slate-300">
                        {t.transfer_date ? new Date(t.transfer_date).toLocaleDateString("en-GB") : "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Items:</span>{" "}
                      <span className="font-bold">{t.transfer_items?.length || 0} Products</span>
                    </div>
                  </div>
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedTransfer(t)}
                      className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] text-xs font-bold"
                    >
                      Details
                    </button>
                    {t.status === "DRAFT" && (
                      <button
                        onClick={() => handleDispatch(t.id)}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold"
                      >
                        Dispatch
                      </button>
                    )}
                    {t.status === "DISPATCHED" && (
                      <button
                        onClick={() => handleReceive(t.id)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                      >
                        Receive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Showing {transfers.length} of {totalRecords} records
              </span>
              <Pagination
                currentPage={currentPage}
                totalItems={totalRecords}
                pageSize={pageSize}
                onPageChange={(page) => setCurrentPage(page)}
              />
            </div>
          </>
        )}
      </div>

      {/* 5. Create Transfer Modal (Rule 9: Unified Container, 16px radius, sticky header/footer) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky Header */}
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">New Stock Transfer (নতুন স্টক চালান)</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Store Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      উৎস শোরুম / ওয়্যারহাউস (From Store) *
                    </label>
                    <CustomSelect
                      value={fromUnitId}
                      onChange={setFromUnitId}
                      options={storeOptions}
                      placeholder="Select Source Store"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      গন্তব্য শোরুম / ওয়্যারহাউস (To Store) *
                    </label>
                    <CustomSelect
                      value={toUnitId}
                      onChange={setToUnitId}
                      options={storeOptions}
                      placeholder="Select Destination Store"
                    />
                  </div>
                </div>

                {/* Transfer Date & Note */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      চালানের তারিখ (Transfer Date) *
                    </label>
                    <CustomDatePicker value={transferDate} onChange={setTransferDate} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      চালান নোট / রেফারেন্স (Notes)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. জরুরি প্রয়োজন / সাপ্তাহিক স্টক ব্যালান্স"
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
                    />
                  </div>
                </div>

                {/* Product Items List */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-blue-500" />
                      ট্রান্সফার আইটেম তালিকা (Transfer Items)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-bold text-[#1E65A0] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> পণ্য যোগ করুন
                    </button>
                  </div>

                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">আইটেম #{idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" /> মুছুন
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-7">
                          <CustomSelect
                            value={item.product_id}
                            onChange={(val) => handleItemChange(idx, "product_id", val)}
                            options={productOptions}
                            placeholder="পণ্য সিলেক্ট করুন (Select Electrical Item)"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                            placeholder="পরিমাণ"
                            className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                            placeholder="Unit"
                            className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] hover:bg-red-700 rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:opacity-95 rounded-xl transition-opacity flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  সংরক্ষণ করুন (Create Draft)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. View Details Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Transfer Details: {selectedTransfer.transfer_no}</h2>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="text-slate-400 block">From:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedTransfer.from_business_unit?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">To:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedTransfer.to_business_unit?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status:</span>
                  {renderStatus(selectedTransfer.status)}
                </div>
                <div>
                  <span className="text-slate-400 block">Date:</span>
                  <span className="font-mono font-semibold">
                    {new Date(selectedTransfer.transfer_date).toLocaleDateString("en-GB")}
                  </span>
                </div>
              </div>

              {selectedTransfer.note && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100 text-slate-700 dark:text-slate-300">
                  <span className="font-bold block mb-1">Notes:</span>
                  {selectedTransfer.note}
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">Transfer Items:</h4>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                      <tr>
                        <th className="px-3 py-2">Product</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {selectedTransfer.transfer_items?.map((it) => (
                        <tr key={it.id}>
                          <td className="px-3 py-2 font-medium">{it.products?.product_name || `Product #${it.product_id}`}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{it.quantity}</td>
                          <td className="px-3 py-2 text-slate-500">{it.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] rounded-xl"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedTransfer.status === "DRAFT" && (
                  <button
                    onClick={() => handleDispatch(selectedTransfer.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" /> Dispatch Out
                  </button>
                )}
                {selectedTransfer.status === "DISPATCHED" && (
                  <button
                    onClick={() => handleReceive(selectedTransfer.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Receive In
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
