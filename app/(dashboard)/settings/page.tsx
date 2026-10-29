"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  Loader2,
  DollarSign,
  Printer,
  ShieldCheck,
  Save,
} from "lucide-react";
import { CustomSelect } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

export default function StoreSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    shop_name: "Protikkha Electric",
    tagline: "Retail & Wholesale Electrical & Machinery Supply",
    phone: "01711-000000",
    email: "info@protikkhaelectric.com",
    address: "Shop # 12-14, Nawabpur Road, Dhaka-1100, Bangladesh",
    bin_vat_no: "BIN-002948123-0101",
    currency: "BDT (৳)",
    invoice_prefix: "PE-INV-",
    challan_prefix: "PE-CHL-",
    default_warranty_months: 12,
    drum_deposit_default: 3000,
    thermal_paper_size: "80mm",
    show_bangla_font: true,
  });

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile");
      const data = await res.json();
      if (data.status === "success" && data.data) {
        setForm(data.data);
      }
    } catch {
      toast.error("Failed to load store settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Business profile settings saved successfully");
      }
    } catch (err: any) {
      toast.error("Failed to save settings");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Store Profile & System Settings
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure business legal details, invoice prefixes, VAT numbers, and POS printing options
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
          <span className="text-xs text-slate-400">Loading settings...</span>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          {/* Shop Profile Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Building className="w-4 h-4" />
              1. Business Identity
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shop / Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.shop_name}
                  onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Business Tagline
                </label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Shop Physical Address *
                </label>
                <input
                  type="text"
                  required
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>
            </div>
          </div>

          {/* Operational Settings */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Printer className="w-4 h-4" />
              2. Invoices & POS Configuration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  BIN / VAT Registration No
                </label>
                <input
                  type="text"
                  value={form.bin_vat_no}
                  onChange={(e) => setForm({ ...form, bin_vat_no: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={form.invoice_prefix}
                  onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  POS Thermal Receipt Size
                </label>
                <CustomSelect
                  options={[
                    { value: "80mm", label: "80mm Thermal Paper (Standard)" },
                    { value: "58mm", label: "58mm Compact Receipt" },
                    { value: "A4", label: "A4 Laser Invoice Sheet" },
                  ]}
                  value={form.thermal_paper_size}
                  onChange={(val) => setForm({ ...form, thermal_paper_size: String(val) })}
                  placeholder="Paper Size"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Standard Warranty Default (Months)
                </label>
                <input
                  type="number"
                  value={form.default_warranty_months}
                  onChange={(e) => setForm({ ...form, default_warranty_months: parseInt(e.target.value) || 0 })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Default Cable Drum Deposit (৳)
                </label>
                <input
                  type="number"
                  value={form.drum_deposit_default}
                  onChange={(e) => setForm({ ...form, drum_deposit_default: parseFloat(e.target.value) || 0 })}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Currency Symbol
                </label>
                <input
                  type="text"
                  disabled
                  value={form.currency}
                  className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] px-6 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm hover:scale-[1.02] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
