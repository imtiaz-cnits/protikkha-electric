"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Package,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  Loader2,
  X,
  User,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui";

interface CableDrum {
  id: number;
  drum_code: string;
  drum_type: string;
  capacity_meters?: number;
  status: "AVAILABLE" | "ISSUED" | "RETURNED" | "SCRAPPED";
  deposit_price: number;
  deposit_held: number;
  product_id?: number;
  customer_id?: number;
  issued_date?: string;
  returned_date?: string;
  notes?: string;
  products?: { id: number; product_name: string; product_code: string };
  customers?: { id: number; name: string; phone: string };
}

const DRUM_TYPES = [
  { value: "Wooden Drum (কাঠের ড্রাম)", label: "Wooden Drum (কাঠের ড্রাম - বড়)" },
  { value: "Steel Reel (লোহার ড্রাম/রিল)", label: "Steel Reel (লোহার ড্রাম/রিল)" },
  { value: "Plastic Spool (প্লাস্টিক স্পুল)", label: "Plastic Spool (প্লাস্টিক স্পুল)" },
];

export default function CableDrumsPage() {
  const { toast } = useToast();
  const [drums, setDrums] = useState<CableDrum[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [summary, setSummary] = useState({
    total_drums: 0,
    available_count: 0,
    issued_count: 0,
    total_deposit_held: 0,
  });

  // Dependencies
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newDrum, setNewDrum] = useState({
    drum_code: "",
    drum_type: "Wooden Drum (কাঠের ড্রাম)",
    capacity_meters: "1000",
    deposit_price: "2000",
    product_id: "",
    notes: "",
  });

  // Action Modal (Issue / Return)
  const [selectedDrum, setSelectedDrum] = useState<CableDrum | null>(null);
  const [actionType, setActionType] = useState<"ISSUE" | "RETURN">("ISSUE");
  const [actionCustomer, setActionCustomer] = useState("");
  const [actionDeposit, setActionDeposit] = useState("");
  const [actionRefund, setActionRefund] = useState("");
  const [actionDamagePenalty, setActionDamagePenalty] = useState("0");
  const [actionNotes, setActionNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadDrums = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/cable-drums?search=${encodeURIComponent(search)}&status=${statusFilter}`
      );
      const data = await res.json();
      if (data.status === "success") {
        setDrums(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load cable drums");
    } finally {
      setLoading(false);
    }
  };

  const loadDependencies = async () => {
    try {
      const [custRes, prodRes] = await Promise.all([
        fetch("/api/customers?limit=100"),
        fetch("/api/products?spec_type=CABLE&limit=100"),
      ]);
      const custData = await custRes.json();
      const prodData = await prodRes.json();

      if (custData.status === "success") setCustomers(custData.data);
      if (prodData.status === "success") setProducts(prodData.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  useEffect(() => {
    loadDrums();
  }, [search, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrum.drum_code) {
      toast.error("Drum code / number is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/cable-drums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDrum),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Cable drum registered successfully!");
        setIsCreateOpen(false);
        setNewDrum({
          drum_code: "",
          drum_type: "Wooden Drum (কাঠের ড্রাম)",
          capacity_meters: "1000",
          deposit_price: "2000",
          product_id: "",
          notes: "",
        });
        loadDrums();
      } else {
        toast.error(data.message || "Registration failed");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (drum: CableDrum, type: "ISSUE" | "RETURN") => {
    setSelectedDrum(drum);
    setActionType(type);
    if (type === "ISSUE") {
      setActionCustomer(drum.customer_id ? String(drum.customer_id) : "");
      setActionDeposit(String(drum.deposit_price));
      setActionNotes("");
    } else {
      setActionRefund(String(drum.deposit_held));
      setActionDamagePenalty("0");
      setActionNotes("");
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrum) return;

    try {
      setActionLoading(true);
      let payload: any = { action: actionType };

      if (actionType === "ISSUE") {
        if (!actionCustomer) {
          toast.error("Please select a customer to issue drum");
          return;
        }
        payload.customer_id = parseInt(actionCustomer);
        payload.deposit_held = parseFloat(actionDeposit) || 0;
        payload.notes = actionNotes;
      } else {
        payload.refund_amount = parseFloat(actionRefund) || 0;
        payload.damage_penalty = parseFloat(actionDamagePenalty) || 0;
        payload.notes = actionNotes;
      }

      const res = await fetch(`/api/cable-drums/${selectedDrum.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Drum status updated successfully!");
        setSelectedDrum(null);
        loadDrums();
      } else {
        toast.error(data.message || "Action failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing drum update");
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatus = (st: string) => {
    switch (st) {
      case "AVAILABLE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> AVAILABLE (দোকানে মজুদ)
          </span>
        );
      case "ISSUED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-500" /> ISSUED (গ্রাহকের নিকট)
          </span>
        );
      case "RETURNED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <RotateCcw className="w-3.5 h-3.5 text-blue-500" /> RETURNED (ফেরত সম্পন্ন)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
            <ShieldAlert className="w-3.5 h-3.5" /> SCRAPPED
          </span>
        );
    }
  };

  const customerOptions = customers.map((c) => ({
    value: String(c.id),
    label: `${c.name} (${c.phone || "No phone"})`,
  }));

  const productOptions = products.map((p) => ({
    value: String(p.id),
    label: `${p.product_name} (${p.primary_code || "Code"})`,
  }));

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Cable Drum & Refundable Deposits
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                ক্যাবল ড্রাম ও জামানত হিসেব
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              বড় তারের ড্রাম ইস্যু, গ্রাহকের জামানত গ্রহণ, ড্রাম ফেরত ও রিফান্ড ম্যানেজমেন্ট
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ড্রাম রেজিস্টার করুন
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Cable Drums</span>
            <Boxes className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {summary.total_drums}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">দোকানের সর্বমোট রেজিস্টার্ড ড্রাম</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Available in Shop</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {summary.available_count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">দোকানে ও গুদামে প্রস্তুত ড্রাম</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Issued to Customers</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {summary.issued_count}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">গ্রাহকের কাছে বাইরে রয়েছে</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Deposits Held (জামানত)</span>
            <DollarSign className="w-4 h-4 text-[#1E65A0]" />
          </div>
          <div className="text-2xl font-bold text-[#1E65A0] dark:text-blue-400 font-mono">
            {formatBdCurrency(summary.total_deposit_held)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">গ্রাহকদের জমাকৃত মোট সিকিউরিটি মানি</p>
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
            placeholder="Search drum code, type, customer..."
            className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "AVAILABLE", "ISSUED", "RETURNED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
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

      {/* 4. Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading cable drums...</p>
          </div>
        ) : drums.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Boxes className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোন ক্যাবল ড্রাম পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400">নতুন ড্রাম যুক্ত করতে উপরের বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Drum Code</th>
                  <th className="px-4 py-3 font-semibold">Type & Capacity</th>
                  <th className="px-4 py-3 font-semibold">Associated Cable</th>
                  <th className="px-4 py-3 font-semibold">Issued Customer</th>
                  <th className="px-4 py-3 font-semibold text-right">Standard Deposit</th>
                  <th className="px-4 py-3 font-semibold text-right">Deposit Held</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {drums.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-bold font-mono text-[#1E65A0] dark:text-blue-400">
                      {d.drum_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{d.drum_type}</div>
                      <div className="text-[11px] text-slate-400">{d.capacity_meters || 0} Meters capacity</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {d.products?.product_name || "General Cable Reel"}
                    </td>
                    <td className="px-4 py-3">
                      {d.customers ? (
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">{d.customers.name}</div>
                          <div className="text-[11px] text-slate-400">{d.customers.phone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">In Stock</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {formatBdCurrency(d.deposit_price)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                      {formatBdCurrency(d.deposit_held)}
                    </td>
                    <td className="px-4 py-3">{renderStatus(d.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {d.status === "AVAILABLE" && (
                        <button
                          onClick={() => openActionModal(d, "ISSUE")}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity cursor-pointer"
                        >
                          ইস্যু করুন (Issue)
                        </button>
                      )}
                      {d.status === "ISSUED" && (
                        <button
                          onClick={() => openActionModal(d, "RETURN")}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> ফেরত ও রিফান্ড
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create Drum Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">Register New Cable Drum (নতুন ড্রাম নিবন্ধন)</h2>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ড্রাম কোড বা ক্রমিক নম্বর (Drum Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDrum.drum_code}
                    onChange={(e) => setNewDrum({ ...newDrum, drum_code: e.target.value })}
                    placeholder="e.g. DRM-BBS-1001"
                    className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ড্রামের ধরণ (Drum Type) *
                    </label>
                    <CustomSelect
                      value={newDrum.drum_type}
                      onChange={(val) => setNewDrum({ ...newDrum, drum_type: val })}
                      options={DRUM_TYPES}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ধারণক্ষমতা (মিটার)
                    </label>
                    <input
                      type="number"
                      value={newDrum.capacity_meters}
                      onChange={(e) => setNewDrum({ ...newDrum, capacity_meters: e.target.value })}
                      placeholder="1000"
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      স্ট্যান্ডার্ড জামানত মূল্য (৳ Deposit) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={newDrum.deposit_price}
                      onChange={(e) => setNewDrum({ ...newDrum, deposit_price: e.target.value })}
                      placeholder="2000"
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      নির্দিষ্ট ক্যাবল পণ্য
                    </label>
                    <CustomSelect
                      value={newDrum.product_id}
                      onChange={(val) => setNewDrum({ ...newDrum, product_id: val })}
                      options={[{ value: "", label: "General Cable (যে কোন ক্যাবল)" }, ...productOptions]}
                      placeholder="Select Cable Product"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    নোট বা বিবরণ
                  </label>
                  <input
                    type="text"
                    value={newDrum.notes}
                    onChange={(e) => setNewDrum({ ...newDrum, notes: e.target.value })}
                    placeholder="e.g. বিআরবি ক্যাবল সাপ্লায়ার থেকে গৃহীত ড্রাম"
                    className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] hover:bg-red-700 rounded-xl cursor-pointer"
                >
                  বাতিল (Cancel)
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:opacity-95 rounded-xl transition-opacity flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  সংরক্ষণ করুন (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Issue / Return Action Modal */}
      {selectedDrum && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">
                  {actionType === "ISSUE" ? "Issue Drum to Customer" : "Return Drum & Refund Deposit"}
                </h2>
              </div>
              <button
                onClick={() => setSelectedDrum(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-slate-800 dark:text-white">
                    Drum: <span className="text-[#1E65A0] font-mono">{selectedDrum.drum_code}</span>
                  </div>
                  <div className="text-slate-500">Type: {selectedDrum.drum_type}</div>
                </div>

                {actionType === "ISSUE" ? (
                  <>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        গ্রাহক নির্বাচন করুন (Customer) *
                      </label>
                      <CustomSelect
                        value={actionCustomer}
                        onChange={setActionCustomer}
                        options={customerOptions}
                        placeholder="Select Customer"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        জামানত বাবদ গৃহীত অর্থ (Deposit Amount ৳) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={actionDeposit}
                        onChange={(e) => setActionDeposit(e.target.value)}
                        className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 font-mono font-bold"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-100">
                      <div className="text-slate-500">জমাকৃত জামানত (Held Deposit):</div>
                      <div className="text-lg font-black text-[#1E65A0] font-mono">
                        {formatBdCurrency(selectedDrum.deposit_held)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ভাঙচুর / ক্ষতিপূরণ কর্তন (৳)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={actionDamagePenalty}
                          onChange={(e) => {
                            const penalty = parseFloat(e.target.value) || 0;
                            setActionDamagePenalty(e.target.value);
                            setActionRefund(String(Math.max(0, selectedDrum.deposit_held - penalty)));
                          }}
                          className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          ফেরতযোগ্য রিফান্ড (৳ Refund)
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={actionRefund}
                          onChange={(e) => setActionRefund(e.target.value)}
                          className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 font-mono font-bold text-emerald-600"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    মন্তব্য / নোট
                  </label>
                  <input
                    type="text"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="e.g. ড্রাম সম্পূর্ণ ভালো অবস্থায় ফেরত এসেছে"
                    className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedDrum(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  {actionLoading ? "প্রসেসিং..." : "নিশ্চিত করুন"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
