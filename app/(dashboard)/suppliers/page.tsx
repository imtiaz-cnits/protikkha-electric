"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  ArrowUpRight,
  Edit2,
  Trash2,
  X,
  Loader2,
  DollarSign,
  Download,
  Receipt,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect, Pagination, DeleteConfirmModal } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface Supplier {
  id: number;
  supplier_id: string;
  name: string;
  company: string;
  mobile: string;
  address: string;
  email?: string | null;
  purchase_payable_amount: number;
  total_purchases: number;
  status: string;
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    mobile: "",
    address: "",
    email: "",
    purchase_payable_amount: "0",
  });

  const [paymentData, setPaymentData] = useState({
    paid_amount: "",
    discount_amount: "0",
    payment_method: "Cash",
    transaction_id: "",
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch suppliers
  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.status === "success") {
        setSuppliers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [search]);

  // Open Edit Modal
  const handleOpenEdit = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData({
      name: s.name,
      company: s.company,
      mobile: s.mobile,
      address: s.address,
      email: s.email || "",
      purchase_payable_amount: String(s.purchase_payable_amount),
    });
    setIsAddModalOpen(true);
  };

  // Open Pay Due Modal
  const handleOpenPay = (s: Supplier) => {
    setSelectedSupplier(s);
    setPaymentData({
      paid_amount: String(s.purchase_payable_amount),
      discount_amount: "0",
      payment_method: "Cash",
      transaction_id: "",
    });
    setIsPayModalOpen(true);
  };

  // Submit Supplier Add/Edit
  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.company.trim() || !formData.mobile.trim()) {
      setErrorMsg("Name, Company, and Mobile number are required!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const url = selectedSupplier
        ? `/api/suppliers/${selectedSupplier.id}`
        : "/api/suppliers";
      const method = selectedSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsAddModalOpen(false);
        setSelectedSupplier(null);
        setFormData({
          name: "",
          company: "",
          mobile: "",
          address: "",
          email: "",
          purchase_payable_amount: "0",
        });
        toast.success(
          selectedSupplier
            ? "Supplier updated successfully!"
            : "Supplier created successfully!"
        );
        setCurrentPage(1);
        loadSuppliers();
      } else {
        setErrorMsg(data.message || "Failed to save supplier");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  // Submit Due Payment
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier || !paymentData.paid_amount) return;

    try {
      setSaving(true);
      setErrorMsg(null);

      const res = await fetch("/api/suppliers/due-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: selectedSupplier.id,
          paid_amount: paymentData.paid_amount,
          discount_amount: paymentData.discount_amount,
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        setIsPayModalOpen(false);
        setSelectedSupplier(null);
        toast.success("Due payment recorded successfully!");
        setCurrentPage(1);
        loadSuppliers();
      } else {
        setErrorMsg(data?.message || `Failed to process payment (Status ${res.status})`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  // Delete Supplier
  const handleDelete = (s: Supplier) => {
    setSupplierToDelete(s);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/suppliers/${supplierToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        toast.success("Supplier deleted successfully!");
        setSupplierToDelete(null);
        setCurrentPage(1);
        loadSuppliers();
      } else {
        toast.error(data?.message || `Failed to delete supplier (Status ${res.status})`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Communication error deleting supplier");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.company.toLowerCase().includes(search.toLowerCase()) ||
      s.mobile.includes(search) ||
      s.supplier_id.toLowerCase().includes(search.toLowerCase())
  );
  const startIndex = (currentPage - 1) * pageSize;
  const displayedSuppliers = filteredSuppliers.slice(startIndex, startIndex + pageSize);

  const totalPayableDue = suppliers.reduce((sum, s) => sum + s.purchase_payable_amount, 0);

  return (
    <div className="space-y-4">
      {/* 1. Header & Top Actions (Strict Marss Corp Layout) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Suppliers & Vendors
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Manage product suppliers, purchase orders, and payable balances
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Total Due Banner */}
          <div className="h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              Total Payable:
            </span>
            <span className="text-xs font-black text-rose-800 dark:text-rose-300">
              {formatBdCurrency(totalPayableDue)}
            </span>
          </div>

          <button
            onClick={() => {
              setSelectedSupplier(null);
              setFormData({
                name: "",
                company: "",
                mobile: "",
                address: "",
                email: "",
                purchase_payable_amount: "0",
              });
              setIsAddModalOpen(true);
            }}
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by supplier name, company, mobile, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total: {suppliers.length} Supplier(s)
        </span>
      </div>

      {/* 3. Desktop Table (Strict Rule: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Supplier / ID</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Address</th>
                <th className="py-3 px-3 text-center">Purchases</th>
                <th className="py-3 px-3 text-right">Payable Due</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading suppliers...</span>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-bold">
                    No suppliers found. Click "+ Add Supplier" to create one.
                  </td>
                </tr>
              ) : (
                displayedSuppliers.map((s, idx) => (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          {s.name}
                        </Link>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <Link
                          href={`/suppliers/${s.id}`}
                          className="text-rose-600 hover:underline font-mono font-bold cursor-pointer"
                        >
                          {s.supplier_id}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-200">
                      {s.company}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{s.mobile}</div>
                      {s.email && <div className="text-[10px] text-slate-400">{s.email}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[160px] truncate">
                      {s.address || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                        {s.total_purchases} Bills
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black text-xs ${s.purchase_payable_amount > 0
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-emerald-600 dark:text-emerald-400"
                          }`}
                      >
                        {formatBdCurrency(s.purchase_payable_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Pay Due Button */}
                        {s.purchase_payable_amount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenPay(s)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Pay Supplier Due"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Pay</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Supplier"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
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
          totalItems={filteredSuppliers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 4. Mobile View: Responsive Card List (Strict Rule: block md:hidden) */}
      <div className="block md:hidden space-y-2.5">
        {loading ? (
          <div className="py-10 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>Loading suppliers...</span>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-6 text-center text-slate-400 font-bold bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
            No suppliers found.
          </div>
        ) : (
          displayedSuppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    <Link href={`/suppliers/${s.id}`} className="hover:text-rose-600 transition-colors">
                      {s.name}
                    </Link>
                  </h3>
                  <p className="text-[11px] font-semibold text-emerald-600">{s.company}</p>
                </div>
                <Link
                  href={`/suppliers/${s.id}`}
                  className="text-[10px] font-mono text-rose-600 font-bold hover:underline"
                >
                  {s.supplier_id}
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 block">Phone:</span>
                  <span className="font-bold">{s.mobile}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Payable Due:</span>
                  <span
                    className={`font-black ${s.purchase_payable_amount > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                  >
                    {formatBdCurrency(s.purchase_payable_amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {s.purchase_payable_amount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenPay(s)}
                    className="h-[30px] w-full px-3 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Pay Due</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenEdit(s)}
                  className="h-[30px] w-full px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center"
                >
                  Edit
                </button>
              </div>
            </div>
          ))
        )}

        {/* Pagination Controls Mobile */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredSuppliers.length}
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

      {/* 5. ADD / EDIT SUPPLIER MODAL (Marss Corp Rule: #15803d Header, 28x28 Red Close) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  {selectedSupplier ? "Edit Supplier" : "Add New Supplier"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupplier} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Md. Shahidul Islam"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Company / Firm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RFL Hardware Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="017xxxxxxxx"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payable Due Balance (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                    value={formData.purchase_payable_amount}
                    onChange={(e) =>
                      setFormData({ ...formData, purchase_payable_amount: e.target.value })
                    }
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Address / Warehouse Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tejgaon I/A, Dhaka"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={saving}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Supplier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PAY SUPPLIER DUE MODAL */}
      {isPayModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Pay Supplier Due
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {/* Supplier Info Badge */}
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Supplier:</span>
                  <strong className="font-bold text-slate-800 dark:text-white">
                    {selectedSupplier.name} ({selectedSupplier.company})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Payable Due:</span>
                  <strong className="font-bold text-rose-600">
                    {formatBdCurrency(selectedSupplier.purchase_payable_amount)}
                  </strong>
                </div>
              </div>

              {/* Amount to pay */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Paid Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Discount / Adjustment */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Discount / Concession (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paymentData.discount_amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, discount_amount: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <CustomSelect
                  value={paymentData.payment_method}
                  onChange={(val) =>
                    setPaymentData({ ...paymentData, payment_method: val })
                  }
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "Bank", label: "Bank Transfer" },
                    { value: "bKash", label: "bKash" },
                    { value: "Nagad", label: "Nagad" },
                    { value: "Rocket", label: "Rocket" },
                    { value: "Card", label: "Card" },
                  ]}
                  placeholder="Select Payment Method"
                />
              </div>

              {/* Trx ID */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction / Cheque No. (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. CHQ-984214"
                  value={paymentData.transaction_id}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, transaction_id: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  disabled={saving}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Payment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(supplierToDelete)}
        onClose={() => setSupplierToDelete(null)}
        onConfirm={confirmDeleteSupplier}
        title="Confirm Supplier Deletion"
        recordIdentifier={
          supplierToDelete
            ? `Supplier: ${supplierToDelete.name} (${supplierToDelete.company})`
            : null
        }
        warningMessage="Are you sure you want to delete this supplier? This action cannot be undone."
        isLoading={deleting}
      />
    </div>
  );
}
