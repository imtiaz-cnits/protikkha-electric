"use client";

import { useState } from "react";
import { UserPlus, X, Loader2 } from "lucide-react";
import { Customer } from "@/lib/pos-store";

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function CustomerModal({ isOpen, onClose, onCustomerCreated }: CustomerModalProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    mobile: "",
    address_details: "",
    email: "",
    nid: "",
    previous_due_amount: "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.mobile.trim()) {
      setError("Customer name and mobile number are required!");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        onCustomerCreated({
          id: data.customer.id,
          customer_id: data.customer.customer_id,
          customer_name: data.customer.customer_name,
          mobile: data.customer.mobile,
          address_details: data.customer.address_details,
          previous_due_amount: parseFloat(data.customer.previous_due_amount || "0"),
        });
        setFormData({
          customer_name: "",
          mobile: "",
          address_details: "",
          email: "",
          nid: "",
          previous_due_amount: "0",
        });
        onClose();
      } else {
        setError(data.message || "Failed to create customer");
      }
    } catch (err: any) {
      setError(err?.message || "Server communication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
        {/* Sticky Header (Strict Rule: Cool Red Gradient, white title, circular red close button 28x28) */}
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
              Add New Customer
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Customer Name */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Haji Abdur Rahim"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mobile Number <span className="text-red-500">*</span>
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

            {/* Previous Due */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Previous Due (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={formData.previous_due_amount}
                onChange={(e) => setFormData({ ...formData, previous_due_amount: e.target.value })}
                className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Address / Location
              </label>
              <input
                type="text"
                placeholder="e.g. Sonargaon, Narayanganj"
                value={formData.address_details}
                onChange={(e) => setFormData({ ...formData, address_details: e.target.value })}
                className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
            </div>

            {/* Email (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Email (Optional)
              </label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
            </div>

            {/* NID (Optional) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                NID Number (Optional)
              </label>
              <input
                type="text"
                placeholder="National ID"
                value={formData.nid}
                onChange={(e) => setFormData({ ...formData, nid: e.target.value })}
                className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
            </div>
          </div>

          {/* Sticky Footer (Strict Rule: Cancel button red #dc2626, Save button emerald #15803d) */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
