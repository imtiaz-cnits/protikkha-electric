"use client";

import { useEffect, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Printer,
  Calendar,
  User,
  Phone,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Loader2,
  Trash2,
  Percent,
  Check,
  Building,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { useToast, CustomSelect } from "@/components/ui";

interface QuotationItem {
  id: number;
  product_id: number;
  product_name: string;
  packaging_unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  spec_notes: string;
}

interface Quotation {
  id: number;
  quotation_no: string;
  project_name: string;
  client_name: string;
  client_phone: string;
  client_address: string;
  contractor_name: string;
  contractor_phone: string;
  commission_percent: number;
  commission_amount: number;
  subtotal: number;
  discount_amount: number;
  estimated_total: number;
  status: "DRAFT" | "SENT" | "APPROVED" | "CONVERTED_TO_ORDER" | "REJECTED";
  validity_days: number;
  expiry_date: string | null;
  order_id: number | null;
  order_no: string | null;
  total_items: number;
  note: string | null;
  created_at: string;
  items: QuotationItem[];
}

interface Summary {
  total_quotations: number;
  total_estimated_amount: number;
  approved_count: number;
  draft_count: number;
}

export default function QuotationsPage() {
  const { toast } = useToast();
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("3.0");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [validityDays, setValidityDays] = useState("15");
  const [quotationNotes, setQuotationNotes] = useState("");

  const [formItems, setFormItems] = useState<
    Array<{
      product_id: string;
      item_name: string;
      packaging_unit: string;
      quantity: string;
      unit_price: string;
      spec_notes: string;
    }>
  >([
    {
      product_id: "",
      item_name: "",
      packaging_unit: "Piece",
      quantity: "1",
      unit_price: "0",
      spec_notes: "",
    },
  ]);

  // View / Print Modal
  const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
  const [convertingId, setConvertingId] = useState<number | null>(null);

  const loadQuotations = async () => {
    try {
      setLoading(true);
      const url = `/api/quotations?search=${encodeURIComponent(search)}&status=${statusFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setQuotations(data.data);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch("/api/products?limit=150");
      const data = await res.json();
      if (data.status === "success") {
        setProductsList(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [search, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAddItemRow = () => {
    setFormItems([
      ...formItems,
      {
        product_id: "",
        item_name: "",
        packaging_unit: "Piece",
        quantity: "1",
        unit_price: "0",
        spec_notes: "",
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(formItems.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const prod = productsList.find((p) => String(p.id) === productId);
    const updated = [...formItems];
    if (prod) {
      updated[index] = {
        ...updated[index],
        product_id: productId,
        item_name: prod.product_name,
        unit_price: String(prod.sell_price || "0"),
        packaging_unit: prod.unit || "Piece",
      };
    } else {
      updated[index].product_id = "";
    }
    setFormItems(updated);
  };

  const calculateFormSubtotal = () => {
    return formItems.reduce((sum, it) => {
      const q = parseFloat(it.quantity || "0") || 0;
      const p = parseFloat(it.unit_price || "0") || 0;
      return sum + q * p;
    }, 0);
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !clientName) {
      toast.error("Please enter project title and client name");
      return;
    }

    const validItems = formItems.filter(
      (it) => it.product_id && parseFloat(it.quantity) > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid product item");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_name: projectName,
          client_name: clientName,
          client_phone: clientPhone,
          client_address: clientAddress,
          contractor_name: contractorName,
          contractor_phone: contractorPhone,
          commission_percent: commissionPercent,
          discount_amount: discountAmount,
          validity_days: validityDays,
          note: quotationNotes,
          items: validItems,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Quotation created successfully!");
        setIsCreateModalOpen(false);
        // Reset form
        setProjectName("");
        setClientName("");
        setClientPhone("");
        setClientAddress("");
        setFormItems([
          {
            product_id: "",
            item_name: "",
            packaging_unit: "Piece",
            quantity: "1",
            unit_price: "0",
            spec_notes: "",
          },
        ]);
        loadQuotations();
      } else {
        toast.error(data.message || "Failed to create quotation");
      }
    } catch (err: any) {
      toast.error(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    id: number,
    newStatus: "APPROVED" | "REJECTED" | "SENT"
  ) => {
    try {
      const res = await fetch(`/api/quotations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message);
        loadQuotations();
        if (viewingQuotation && viewingQuotation.id === id) {
          setViewingQuotation({ ...viewingQuotation, status: newStatus });
        }
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConvertToOrder = async (id: number) => {
    try {
      setConvertingId(id);
      const res = await fetch(`/api/quotations/${id}/convert`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message);
        loadQuotations();
        if (viewingQuotation) setViewingQuotation(null);
      } else {
        toast.error(data.message || "Failed to convert quotation");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setConvertingId(null);
    }
  };

  const formSubtotal = calculateFormSubtotal();
  const formDiscount = parseFloat(discountAmount || "0");
  const formGrandTotal = Math.max(0, formSubtotal - formDiscount);
  const formCommPct = parseFloat(commissionPercent || "0");
  const formCommission = Math.round(((formSubtotal * formCommPct) / 100) * 100) / 100;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Project Quotations & Estimations
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-medium">
                B2B & Contractor
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ইলেকট্রিশিয়ান ও ঠিকাদারদের কোটেশন, কমিশন এবং এক ক্লিকে বিক্রয় ইনভয়েসে রূপান্তর
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs"
          >
            <Plus className="w-4 h-4" />
            নতুন প্রজেক্ট কোটেশন
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Quotations</span>
            <FileText className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {summary?.total_quotations || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সর্বমোট প্রস্তুতকৃত কোটেশন</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Estimated Value</span>
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {formatBdCurrency(summary?.total_estimated_amount || 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">প্রাক্কলিত মোট কাজের মূল্য</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Approved / Converted</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 font-mono">
            {summary?.approved_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">অনুমোদিত বা অর্ডারে রূপান্তরিত</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Draft / Pending</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">
            {summary?.draft_count || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">বিবেচনাধীন কোটেশন</p>
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
            placeholder="Search Quotation No, Project, Client, Contractor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "DRAFT", "SENT", "APPROVED", "CONVERTED_TO_ORDER", "REJECTED"].map(
            (st) => (
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
            )
          )}
        </div>
      </div>

      {/* 4. Quotations Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading project quotations...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Quotation No</th>
                  <th className="py-3 px-4">Project & Client</th>
                  <th className="py-3 px-4">Contractor & Comm.</th>
                  <th className="py-3 px-4 text-center">Items</th>
                  <th className="py-3 px-4 text-right">Estimated Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {quotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {q.quotation_no}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {q.project_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" /> {q.client_name}{" "}
                        {q.client_phone && `(${q.client_phone})`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-800 dark:text-slate-200">
                        {q.contractor_name || "Self"}
                      </div>
                      {q.commission_amount > 0 && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          Comm: {formatBdCurrency(q.commission_amount)} ({q.commission_percent}%)
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-medium">
                      {q.total_items}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatBdCurrency(q.estimated_total)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          q.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : q.status === "CONVERTED_TO_ORDER"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                            : q.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingQuotation(q)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1E65A0] bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 hover:bg-blue-100"
                          title="View & Print"
                        >
                          View / Print
                        </button>

                        {q.status === "APPROVED" && !q.order_id && (
                          <button
                            onClick={() => handleConvertToOrder(q.id)}
                            disabled={convertingId === q.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1"
                            title="Convert to live Sales Invoice"
                          >
                            <ArrowRight className="w-3 h-3" />
                            {convertingId === q.id ? "Converting..." : "Invoice"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No quotations found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl max-w-3xl w-full my-8 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />
                নতুন প্রজেক্ট কোটেশন ও এস্টিমেশন তৈরি করুন
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-4 space-y-4 text-xs">
              {/* Project & Client Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Project Title *
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g. 5-Storey Residential Building Wiring"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Client / Owner Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Al-Hajj Nurul Islam"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Client Phone
                  </label>
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Project Site Address
                  </label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    placeholder="e.g. House 14, Road 5, Mirpur DOHS"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Contractor / Electrician Commission */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/40">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Contractor / Electrician
                  </label>
                  <input
                    type="text"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g. Master Electrician Kabir"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Electrician Phone
                  </label>
                  <input
                    type="text"
                    value={contractorPhone}
                    onChange={(e) => setContractorPhone(e.target.value)}
                    placeholder="018XXXXXXXX"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(e.target.value)}
                    placeholder="3.0"
                    className="w-full h-9 px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    Quotation Line Items (তার, ব্রেকার, পাইপ ও সুইচ তালিকা)
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="flex items-center gap-1 text-xs text-[#1E65A0] font-bold hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" /> আইটেম যোগ করুন
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                      <tr>
                        <th className="py-2 px-3 text-left">Product Selection</th>
                        <th className="py-2 px-2 text-left w-20">Unit</th>
                        <th className="py-2 px-2 text-right w-20">Qty</th>
                        <th className="py-2 px-2 text-right w-24">Unit Price</th>
                        <th className="py-2 px-2 text-right w-24">Total</th>
                        <th className="py-2 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {formItems.map((item, idx) => {
                        const lineTotal =
                          (parseFloat(item.quantity || "0") || 0) *
                          (parseFloat(item.unit_price || "0") || 0);

                        return (
                          <tr key={idx} className="bg-white dark:bg-slate-900">
                            <td className="p-2 min-w-[200px]">
                              <CustomSelect
                                value={item.product_id}
                                onChange={(val) => handleProductSelect(idx, val)}
                                options={productsList.map((p) => ({
                                  value: String(p.id),
                                  label: p.product_name,
                                }))}
                                placeholder="Select electrical product..."
                                className="w-full h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={item.packaging_unit}
                                onChange={(e) => {
                                  const upd = [...formItems];
                                  upd[idx].packaging_unit = e.target.value;
                                  setFormItems(upd);
                                }}
                                className="w-full h-8 px-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                value={item.quantity}
                                onChange={(e) => {
                                  const upd = [...formItems];
                                  upd[idx].quantity = e.target.value;
                                  setFormItems(upd);
                                }}
                                className="w-full h-8 px-2 text-xs text-right font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                required
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                step="any"
                                value={item.unit_price}
                                onChange={(e) => {
                                  const upd = [...formItems];
                                  upd[idx].unit_price = e.target.value;
                                  setFormItems(upd);
                                }}
                                className="w-full h-8 px-2 text-xs text-right font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                                required
                              />
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {formatBdCurrency(lineTotal)}
                            </td>
                            <td className="p-2 text-center">
                              {formItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItemRow(idx)}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Summary Preview */}
              <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block">
                      Special Discount (৳)
                    </label>
                    <input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-24 h-8 px-2 text-right font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block">
                      Validity (Days)
                    </label>
                    <input
                      type="number"
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className="w-16 h-8 px-2 text-center font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="text-right space-y-1 font-mono">
                  <div className="text-xs text-slate-500">
                    Subtotal: {formatBdCurrency(formSubtotal)}
                  </div>
                  {formCommission > 0 && (
                    <div className="text-xs text-emerald-600">
                      Electrician Commission: {formatBdCurrency(formCommission)}
                    </div>
                  )}
                  <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    Grand Total: {formatBdCurrency(formGrandTotal)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold"
                >
                  {saving ? "Creating Quotation..." : "Save & Generate Quotation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Quotation View Modal */}
      {viewingQuotation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white p-4 flex items-center justify-between">
              <h3 className="text-sm font-bold">
                Quotation #{viewingQuotation.quotation_no}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  onClick={() => setViewingQuotation(null)}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-600 text-white hover:bg-rose-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 text-xs font-sans print:p-0">
              {/* Header Details */}
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    PROTIKKHA ELECTRIC
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Retail & Wholesale Electrical Goods
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Project: <strong className="text-slate-800 dark:text-slate-200">{viewingQuotation.project_name}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-blue-600">
                    {viewingQuotation.quotation_no}
                  </div>
                  <div className="text-slate-500">
                    Date: {new Date(viewingQuotation.created_at).toLocaleDateString("en-GB")}
                  </div>
                  <div className="text-slate-500">
                    Valid for: {viewingQuotation.validity_days} Days
                  </div>
                </div>
              </div>

              {/* Client & Contractor Info */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">
                    Prepared For:
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {viewingQuotation.client_name}
                  </div>
                  {viewingQuotation.client_phone && (
                    <div className="text-slate-500">
                      Mobile: {viewingQuotation.client_phone}
                    </div>
                  )}
                  {viewingQuotation.client_address && (
                    <div className="text-slate-500">
                      Site: {viewingQuotation.client_address}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase text-slate-400">
                    Contractor / Technician:
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {viewingQuotation.contractor_name || "Direct Client"}
                  </div>
                  {viewingQuotation.contractor_phone && (
                    <div className="text-slate-500">
                      Contact: {viewingQuotation.contractor_phone}
                    </div>
                  )}
                  <div className="text-slate-500">
                    Status: <strong className="uppercase text-blue-600">{viewingQuotation.status}</strong>
                  </div>
                </div>
              </div>

              {/* Items List */}
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 font-bold border-b">
                    <th className="py-2 px-3">SL</th>
                    <th className="py-2 px-3">Description of Electrical Materials</th>
                    <th className="py-2 px-3 text-center">Unit</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Rate (৳)</th>
                    <th className="py-2 px-3 text-right">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {viewingQuotation.items.map((it, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 text-slate-400 font-mono">{i + 1}</td>
                      <td className="py-2 px-3 font-medium text-slate-900 dark:text-white">
                        {it.product_name}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {it.packaging_unit}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        {it.quantity}
                      </td>
                      <td className="py-2 px-3 text-right font-mono">
                        {formatBdCurrency(it.unit_price)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {formatBdCurrency(it.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                    <td colSpan={5} className="py-2 px-3 text-right">
                      Subtotal:
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatBdCurrency(viewingQuotation.subtotal)}
                    </td>
                  </tr>
                  {viewingQuotation.discount_amount > 0 && (
                    <tr className="font-bold text-rose-500">
                      <td colSpan={5} className="py-1 px-3 text-right">
                        Discount:
                      </td>
                      <td className="py-1 px-3 text-right font-mono">
                        - {formatBdCurrency(viewingQuotation.discount_amount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t font-bold text-sm text-[#0B3D91] dark:text-blue-400">
                    <td colSpan={5} className="py-2 px-3 text-right uppercase">
                      Estimated Project Total:
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      {formatBdCurrency(viewingQuotation.estimated_total)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Status Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {viewingQuotation.status !== "APPROVED" &&
                    viewingQuotation.status !== "CONVERTED_TO_ORDER" && (
                      <button
                        onClick={() => handleUpdateStatus(viewingQuotation.id, "APPROVED")}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs"
                      >
                        Approve Quotation
                      </button>
                    )}
                  {viewingQuotation.status !== "REJECTED" &&
                    viewingQuotation.status !== "CONVERTED_TO_ORDER" && (
                      <button
                        onClick={() => handleUpdateStatus(viewingQuotation.id, "REJECTED")}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-600 text-xs"
                      >
                        Reject
                      </button>
                    )}
                </div>

                {viewingQuotation.status === "APPROVED" && !viewingQuotation.order_id && (
                  <button
                    onClick={() => handleConvertToOrder(viewingQuotation.id)}
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold text-xs flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    Convert to Live Invoice
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
