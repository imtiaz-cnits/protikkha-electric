"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Zap,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Wallet,
  Clock,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  X,
  CreditCard,
  Building2,
  ArrowUpRight,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui";

interface Contractor {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  nid_number?: string;
  specialty?: string;
  contractor_type: "CONTRACTOR" | "ELECTRICIAN" | "TECHNICIAN";
  default_commission_rate: number;
  total_earned: number;
  total_paid: number;
  payable_balance: number;
  status: string;
  notes?: string;
}

interface CommissionRecord {
  id: number;
  order_id?: number;
  order_no?: string;
  customer_id?: number;
  sale_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: "PENDING" | "APPROVED" | "PAID";
  paid_at?: string;
  notes?: string;
  created_at: string;
}

const SPECIALTY_OPTIONS = [
  { value: "House Wiring (হাউস ওয়্যারিং)", label: "House Wiring (হাউস ওয়্যারিং)" },
  { value: "Substation & HT Panel (সাবস্টেশন ও প্যানেল)", label: "Substation & HT Panel (সাবস্টেশন ও প্যানেল)" },
  { value: "Solar System Installation (সোলার বিদ্যুৎ)", label: "Solar System Installation (সোলার বিদ্যুৎ)" },
  { value: "Industrial Wiring & Motor (ইন্ডাস্ট্রিয়াল)", label: "Industrial Wiring & Motor (ইন্ডাস্ট্রিয়াল)" },
  { value: "Plumbing & Electrical (প্লাম্বিং ও ইলেকট্রিক)", label: "Plumbing & Electrical (প্লাম্বিং ও ইলেকট্রিক)" },
  { value: "General Electrician (সাধারণ ইলেকট্রিশিয়ান)", label: "General Electrician (সাধারণ ইলেকট্রিশিয়ান)" },
];

const CONTRACTOR_TYPES = [
  { value: "ELECTRICIAN", label: "Electrician (ইলেকট্রিশিয়ান)" },
  { value: "CONTRACTOR", label: "Contractor (ঠিকাদার / কন্ট্রাক্টর)" },
  { value: "TECHNICIAN", label: "Technician (টেকনিশিয়ান)" },
];

export default function ContractorsPage() {
  const { toast } = useToast();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [summary, setSummary] = useState({
    total_contractors: 0,
    total_earned: 0,
    total_paid: 0,
    total_payable: 0,
  });

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    nid_number: "",
    specialty: "House Wiring (হাউস ওয়্যারিং)",
    contractor_type: "ELECTRICIAN",
    default_commission_rate: "5",
    notes: "",
  });

  // Commission Statement / Payout Drawer
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commLoading, setCommLoading] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("CASH");
  const [payoutNote, setPayoutNote] = useState("");
  const [paying, setPaying] = useState(false);

  const loadContractors = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/contractors?search=${encodeURIComponent(search)}&type=${typeFilter}`
      );
      const data = await res.json();
      if (data.status === "success") {
        setContractors(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load contractors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractors();
  }, [search, typeFilter]);

  const handleOpenCommissions = async (c: Contractor) => {
    setSelectedContractor(c);
    setCommLoading(true);
    try {
      const res = await fetch(`/api/contractors/${c.id}/commissions`);
      const data = await res.json();
      if (data.status === "success") {
        setCommissions(data.data);
      }
    } catch (err) {
      toast.error("Failed to load commission history");
    } finally {
      setCommLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error("Name and Phone number are required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/contractors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Contractor registered successfully!");
        setIsCreateOpen(false);
        setFormData({
          name: "",
          phone: "",
          email: "",
          address: "",
          nid_number: "",
          specialty: "House Wiring (হাউস ওয়্যারিং)",
          contractor_type: "ELECTRICIAN",
          default_commission_rate: "5",
          notes: "",
        });
        loadContractors();
      } else {
        toast.error(data.message || "Failed to create contractor");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor) return;
    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid payout amount");
      return;
    }

    try {
      setPaying(true);
      const res = await fetch(`/api/contractors/${selectedContractor.id}/commissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payment_method: payoutMethod,
          notes: payoutNote,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Commission payout recorded successfully!");
        setIsPayoutOpen(false);
        setPayoutAmount("");
        setPayoutNote("");
        handleOpenCommissions(selectedContractor);
        loadContractors();
      } else {
        toast.error(data.message || "Payout failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing payout");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Electricians & Contractors
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-medium">
                ইলেকট্রিশিয়ান ও ঠিকাদার কমিশন
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              রেফারেল কমিশন, বিক্রয় কমিশন হিসাব ও পেআউট সেটেলমেন্ট ব্যবস্থাপনা
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            নতুন ইলেকট্রিশিয়ান / ঠিকাদার যোগ
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Registered Partners</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {summary.total_contractors}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">তালিকাভুক্ত ইলেকট্রিশিয়ান ও ঠিকাদার</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Commission Earned</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatBdCurrency(summary.total_earned)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সর্বমোট অর্জিত কমিশন</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Paid Out</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {formatBdCurrency(summary.total_paid)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">পরিশোধিত কমিশন অর্থ</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Payable Balance (বকেয়া)</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {formatBdCurrency(summary.total_payable)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">বর্তমান বকেয়া কমিশন পাওনা</p>
        </div>
      </div>

      {/* 3. Search and Type Filters */}
      <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, mobile, specialty..."
            className="w-full h-[38px] pl-9 pr-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "ELECTRICIAN", "CONTRACTOR", "TECHNICIAN"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                typeFilter === t
                  ? "bg-[#0B3D91] text-white shadow-xs"
                  : "border border-[#cbd5e1] dark:border-[#334155] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading electricians and contractors...</p>
          </div>
        ) : contractors.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোন রেকর্ড পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400">নতুন ইলেকট্রিশিয়ান বা ঠিকাদার যুক্ত করতে উপরের বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Name & Specialty</th>
                  <th className="px-4 py-3 font-semibold">Contact (মোবাইল)</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold text-center">Comm Rate</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Earned</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Paid</th>
                  <th className="px-4 py-3 font-semibold text-right">Payable (বকেয়া)</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contractors.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.specialty || "General Electrical"}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {c.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#1E65A0] border border-blue-200">
                        {c.contractor_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                      {c.default_commission_rate}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBdCurrency(c.total_earned)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 dark:text-slate-400">
                      {formatBdCurrency(c.total_paid)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-amber-600 dark:text-amber-400">
                      {formatBdCurrency(c.payable_balance)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenCommissions(c)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5 text-amber-400" />
                        লেজার ও পেআউট
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Create Contractor Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">New Electrician / Contractor (নতুন পার্টনার)</h2>
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
                    পূর্ণ নাম (Partner Name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. মোঃ রফিকুল ইসলাম"
                    className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      মোবাইল নম্বর (Phone) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="017XXXXXXXX"
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      জাতীয় পরিচয়পত্র (NID)
                    </label>
                    <input
                      type="text"
                      value={formData.nid_number}
                      onChange={(e) => setFormData({ ...formData, nid_number: e.target.value })}
                      placeholder="NID Number"
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      পার্টনারের ধরণ (Type) *
                    </label>
                    <CustomSelect
                      value={formData.contractor_type}
                      onChange={(val) => setFormData({ ...formData, contractor_type: val })}
                      options={CONTRACTOR_TYPES}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ডিফল্ট কমিশন হার (Comm %) *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formData.default_commission_rate}
                      onChange={(e) => setFormData({ ...formData, default_commission_rate: e.target.value })}
                      className="w-full h-[42px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0] font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    কাজের ক্ষেত্র / দক্ষতা (Specialty)
                  </label>
                  <CustomSelect
                    value={formData.specialty}
                    onChange={(val) => setFormData({ ...formData, specialty: val })}
                    options={SPECIALTY_OPTIONS}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ঠিকানা ও নোট (Address & Notes)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="বর্তমান ঠিকানা / এলাকার নাম"
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

      {/* 6. Commission Statement & Payout Modal */}
      {selectedContractor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-4 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold">
                  {selectedContractor.name} - কমিশন হিসেব ও লেজার
                </h2>
              </div>
              <button
                onClick={() => setSelectedContractor(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Financial Summary Strip */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-center">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Earned</span>
                  <span className="text-sm font-bold text-emerald-600 font-mono">
                    {formatBdCurrency(selectedContractor.total_earned)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Paid</span>
                  <span className="text-sm font-bold text-blue-600 font-mono">
                    {formatBdCurrency(selectedContractor.total_paid)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Payable (বকেয়া)</span>
                  <span className="text-sm font-bold text-amber-600 font-mono">
                    {formatBdCurrency(selectedContractor.payable_balance)}
                  </span>
                </div>
              </div>

              {/* Payout Action Form */}
              {isPayoutOpen ? (
                <form
                  onSubmit={handlePayoutSubmit}
                  className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 space-y-3"
                >
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4" /> নতুন পেআউট প্রদান করুন (Record Commission Payout)
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        পরিশোধের পরিমাণ (Amount ৳) *
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        placeholder={`Max: ${selectedContractor.payable_balance}`}
                        className="w-full h-[38px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                        পেমেন্ট মাধ্যম (Payment Method)
                      </label>
                      <CustomSelect
                        value={payoutMethod}
                        onChange={setPayoutMethod}
                        options={[
                          { value: "CASH", label: "Cash (ক্যাশ)" },
                          { value: "BANK", label: "Bank Transfer (ব্যাংক)" },
                          { value: "BKASH", label: "bKash / Nagad (এমএফএস)" },
                        ]}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      রেফারেন্স নোট / ভাউচার নং
                    </label>
                    <input
                      type="text"
                      value={payoutNote}
                      onChange={(e) => setPayoutNote(e.target.value)}
                      placeholder="e.g. মার্চ মাসের কাজের কমিশন প্রদান"
                      className="w-full h-[38px] px-3 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPayoutOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      disabled={paying}
                      className="px-4 py-1.5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white rounded-lg text-xs font-bold"
                    >
                      {paying ? "প্রসেসিং..." : "পেমেন্ট নিশ্চিত করুন"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setPayoutAmount(String(selectedContractor.payable_balance));
                      setIsPayoutOpen(true);
                    }}
                    disabled={selectedContractor.payable_balance <= 0}
                    className="px-4 py-2 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white rounded-xl text-xs font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    কমিশন পেআউট করুন (Make Payout)
                  </button>
                </div>
              )}

              {/* Commissions Table */}
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white mb-2">কমিশন ট্রানজ্যাকশন হিস্টোরি:</h4>
                {commLoading ? (
                  <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                    <Loader2 className="w-5 h-5 animate-spin text-[#1E65A0]" />
                  </div>
                ) : commissions.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 border border-dashed rounded-xl">
                    কোন কমিশন রেকর্ড পাওয়া যায়নি
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        <tr>
                          <th className="px-3 py-2">Order No</th>
                          <th className="px-3 py-2 text-right">Sale Amount</th>
                          <th className="px-3 py-2 text-center">Rate</th>
                          <th className="px-3 py-2 text-right">Commission</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {commissions.map((cm) => (
                          <tr key={cm.id}>
                            <td className="px-3 py-2 font-mono font-bold text-[#1E65A0]">
                              {cm.order_no || `Order #${cm.order_id}`}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">
                              {formatBdCurrency(cm.sale_amount)}
                            </td>
                            <td className="px-3 py-2 text-center font-mono">{cm.commission_rate}%</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                              {formatBdCurrency(cm.commission_amount)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  cm.status === "PAID"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {cm.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedContractor(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#dc2626] rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
