"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Wrench,
  XCircle,
  FileText,
  User,
  Phone,
  Calendar,
  Loader2,
  Barcode,
  Layers,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui";

interface WarrantyRecord {
  id: number;
  serial_number: string;
  product_id: number;
  product_name: string;
  spec_type: string;
  order_id: number | null;
  order_no: string | null;
  customer_id: number | null;
  customer_name: string;
  customer_mobile: string;
  purchase_date: string | null;
  warranty_months: number;
  expiry_date: string;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "REPLACED";
  days_remaining: number;
  is_expired: boolean;
  notes: string | null;
  created_at: string;
}

interface Summary {
  total_records: number;
  active_count: number;
  expired_count: number;
  claimed_count: number;
}

export default function WarrantyPage() {
  const { toast } = useToast();
  const [warranties, setWarranties] = useState<WarrantyRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyRecord | null>(null);
  const [claimAction, setClaimAction] = useState<"REPLACE" | "CLAIM" | "REJECT">("REPLACE");
  const [claimReason, setClaimReason] = useState("");
  const [replacementSerial, setReplacementSerial] = useState("");
  const [claimNotes, setClaimNotes] = useState("");
  const [processingClaim, setProcessingClaim] = useState(false);

  // New Registration Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [newProduct, setNewProduct] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newOrderNo, setNewOrderNo] = useState("");
  const [newPurchaseDate, setNewPurchaseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newWarrantyMonths, setNewWarrantyMonths] = useState("12");
  const [newNotes, setNewNotes] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = `/api/warranty?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setWarranties(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Warranty loading error:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      const data = await res.json();
      if (data.status === "success") {
        setProductsList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, []);

  const handleOpenClaim = (w: WarrantyRecord) => {
    setSelectedWarranty(w);
    setClaimAction("REPLACE");
    setClaimReason("");
    setReplacementSerial("");
    setClaimNotes("");
    setIsClaimModalOpen(true);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarranty) return;

    try {
      setProcessingClaim(true);
      const res = await fetch(`/api/warranty/${selectedWarranty.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: claimAction,
          claim_reason: claimReason,
          replacement_serial: replacementSerial,
          note: claimNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Claim processed successfully!");
        setIsClaimModalOpen(false);
        loadData();
      } else {
        toast.error(data.message || "Could not process claim");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setProcessingClaim(false);
    }
  };

  const handleSubmitNewWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct || !newSerial) {
      toast.error("Please select product and enter serial number");
      return;
    }

    try {
      setSavingNew(true);
      const res = await fetch("/api/warranty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: newProduct,
          serial_number: newSerial,
          purchase_date: newPurchaseDate,
          warranty_months: newWarrantyMonths,
          notes: newNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Warranty card registered successfully!");
        setIsNewModalOpen(false);
        setNewSerial("");
        setNewNotes("");
        loadData();
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Warranty & Claim Management
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                বৈদ্যুতিক পণ্যের ওয়ারেন্টি
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              সার্কিট ব্রেকার, ফ্যান, সুইচ ও লাইটের সিরিয়াল ট্র্যাকিং ও ক্লেইম লাইফসাইকেল
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs"
          >
            <Plus className="w-4 h-4" />
            নতুন ওয়ারেন্টি কার্ড ইস্যু
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Cards</span>
            <Barcode className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {summary?.total_records || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সর্বমোট নিবন্ধিত কার্ড</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Active Warranties</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {summary?.active_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">বৈধ / সক্রিয় ওয়ারেন্টি</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Expired</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-400 font-mono">
            {summary?.expired_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">মেয়াদোত্তীর্ণ আইটেম</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Claimed / Replaced</span>
            <RotateCcw className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {summary?.claimed_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ক্লেইমকৃত বা প্রতিস্থাপিত</p>
        </div>
      </div>

      {/* 3. Search and Status Filter */}
      <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan / Type Serial No, Barcode, Phone or Order..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "ACTIVE", "EXPIRED", "CLAIMED", "REPLACED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

      {/* 4. Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading warranty cards...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Serial Number</th>
                  <th className="py-3 px-4">Product & Specification</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Purchase Date & Order</th>
                  <th className="py-3 px-4">Warranty Expiry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {warranties.map((w) => (
                  <tr
                    key={w.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {w.serial_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {w.product_name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {w.spec_type}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {w.customer_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {w.customer_mobile}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200">
                        {w.purchase_date || "N/A"}
                      </div>
                      {w.order_no && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                          {w.order_no}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">
                        {w.expiry_date}
                      </div>
                      <div className="text-[11px]">
                        {w.is_expired ? (
                          <span className="text-rose-500 font-medium">Expired</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            {w.days_remaining} days left
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          w.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : w.status === "EXPIRED"
                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"
                            : w.status === "CLAIMED"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {w.status === "ACTIVE" ? (
                        <button
                          onClick={() => handleOpenClaim(w)}
                          className="px-3 py-1 rounded-lg text-xs font-bold text-[#1E65A0] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
                        >
                          Claim / Replace
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {warranties.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No warranty records found matching criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim Processing Modal */}
      {isClaimModalOpen && selectedWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Process Warranty Claim
              </h3>
              <button
                onClick={() => setIsClaimModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="p-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Serial No:</span>{" "}
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedWarranty.serial_number}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Product:</span>{" "}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedWarranty.product_name}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Action Type
                </label>
                <CustomSelect
                  value={claimAction}
                  onChange={(val) => setClaimAction(val)}
                  options={[
                    { value: "REPLACE", label: "Brand New Replacement (নতুন পণ্য প্রতিস্থাপন)" },
                    { value: "CLAIM", label: "Service / Repair Claim (মেরামত সার্ভিস)" },
                    { value: "REJECT", label: "Reject Claim (বাতিল - শর্তভঙ্গ/ক্ষতিগ্রস্ত)" },
                  ]}
                  className="w-full h-10"
                />
              </div>

              {claimAction === "REPLACE" && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    New Replacement Serial Number
                  </label>
                  <input
                    type="text"
                    value={replacementSerial}
                    onChange={(e) => setReplacementSerial(e.target.value)}
                    placeholder="Enter new unit serial barcode..."
                    className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Claim Reason / Defect Detail
                </label>
                <input
                  type="text"
                  value={claimReason}
                  onChange={(e) => setClaimReason(e.target.value)}
                  placeholder="e.g. Coil burnt, Breaker tripping failed, LED blinking..."
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={claimNotes}
                  onChange={(e) => setClaimNotes(e.target.value)}
                  placeholder="Customer remarks or technician notes..."
                  className="w-full h-16 p-2 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingClaim}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold"
                >
                  {processingClaim ? "Processing..." : "Confirm Claim Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Warranty Registration Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Register Product Warranty Card
              </h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewWarranty} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Product
                </label>
                <CustomSelect
                  value={newProduct}
                  onChange={(val) => setNewProduct(val)}
                  placeholder="Select electrical product..."
                  options={productsList.map((p) => ({
                    value: String(p.id),
                    label: p.product_name,
                  }))}
                  className="w-full h-10"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Serial Number / Barcode
                </label>
                <input
                  type="text"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                  placeholder="Scan or enter unique serial number..."
                  className="w-full h-10 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Purchase Date
                  </label>
                  <CustomDatePicker
                    value={newPurchaseDate}
                    onChange={(d) => setNewPurchaseDate(d)}
                    className="w-full h-10"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Warranty (Months)
                  </label>
                  <CustomSelect
                    value={newWarrantyMonths}
                    onChange={(val) => setNewWarrantyMonths(val)}
                    options={[
                      { value: "6", label: "6 Months" },
                      { value: "12", label: "12 Months (1 Year)" },
                      { value: "24", label: "24 Months (2 Years)" },
                      { value: "36", label: "36 Months (3 Years)" },
                      { value: "60", label: "60 Months (5 Years)" },
                    ]}
                    className="w-full h-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Card Notes / Customer Reference
                </label>
                <textarea
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Invoice number, customer name or phone..."
                  className="w-full h-14 p-2 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold"
                >
                  {savingNew ? "Saving..." : "Register Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
