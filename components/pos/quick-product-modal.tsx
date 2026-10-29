"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Barcode,
  Zap,
  PlusCircle,
  Tag,
  Boxes,
} from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: number; category_name: string }>;
  brands: Array<{ id: number; name: string }>;
  units: Array<{ id: number; unit_name: string }>;
  onProductCreated: (product: any) => void;
}

const SPEC_TYPES = [
  { id: "CABLE", label: "Wires & Cables (তার/ক্যাবল)" },
  { id: "BREAKER", label: "Circuit Breakers (সার্কিট ব্রেকার)" },
  { id: "SWITCH", label: "Switches & Sockets (সুইচ/সকেট)" },
  { id: "LIGHTING", label: "LED & Lighting (লাইট/টিউব)" },
  { id: "CONDUIT", label: "Pipes & Conduits (পাইপ/ফিটিংস)" },
  { id: "GENERAL", label: "General Accessories (সাধারণ যন্ত্রাংশ)" },
];

export function QuickProductModal({
  isOpen,
  onClose,
  categories,
  brands,
  units,
  onProductCreated,
}: QuickProductModalProps) {
  const [formData, setFormData] = useState({
    product_name: "",
    product_code: "",
    cost_price: "",
    sell_price: "",
    quantity: "10",
    spec_type: "CABLE",
    cable_size: "",
    current_rating: "",
    voltage_grade: "450/750V",
    gang_module: "",
    wattage: "",
    brand_id: "",
    category_id: "",
    unit_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        product_name: "",
        product_code: "",
        cost_price: "",
        sell_price: "",
        quantity: "10",
        spec_type: "CABLE",
        cable_size: "",
        current_rating: "",
        voltage_grade: "450/750V",
        gang_module: "",
        wattage: "",
        brand_id: brands[0]?.id ? String(brands[0].id) : "",
        category_id: categories[0]?.id ? String(categories[0].id) : "",
        unit_id: units[0]?.id ? String(units[0].id) : "",
      });
      setError(null);
    }
  }, [isOpen, categories, brands, units]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.product_name.trim()) {
      setError("Product Name is required");
      return;
    }
    if (!formData.sell_price || Number(formData.sell_price) <= 0) {
      setError("Please enter a valid Selling Price");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const parsedCodes = formData.product_code
        ? formData.product_code.split(",").map((c) => c.trim()).filter(Boolean)
        : [];

      const payload = {
        product_name: formData.product_name.trim(),
        product_code: parsedCodes.length > 0 ? parsedCodes : undefined,
        cost_price: Number(formData.cost_price || 0),
        sell_price: Number(formData.sell_price || 0),
        quantity: Number(formData.quantity || 0),
        brand_id: Number(formData.brand_id || (brands[0]?.id ? String(brands[0].id) : 1)),
        category_id: Number(formData.category_id || (categories[0]?.id ? String(categories[0].id) : 1)),
        unit_id: formData.unit_id ? Number(formData.unit_id) : null,
        electrical_spec: {
          spec_type: formData.spec_type,
          cable_size: formData.spec_type === "CABLE" ? formData.cable_size : null,
          current_rating: formData.spec_type === "BREAKER" ? formData.current_rating : null,
          voltage_grade: formData.spec_type === "CABLE" ? formData.voltage_grade : null,
          gang_module: formData.spec_type === "SWITCH" ? formData.gang_module : null,
          wattage: formData.spec_type === "LIGHTING" ? formData.wattage : null,
        },
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === "success" && data.data) {
        onProductCreated(data.data);
        onClose();
      } else {
        setError(data.message || "Failed to create product");
      }
    } catch (err: any) {
      setError(err?.message || "Communication error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
        {/* Sticky Header per Rule 9 */}
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
              Quick Add Electrical Product
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-2xs"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Product Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BRB 2.5 RM BYA Cable Red or Schneider 16A MCB"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full h-[42px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
            />
          </div>

          {/* Barcode & Spec Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Barcode / Product Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Scan or type code..."
                  value={formData.product_code}
                  onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                  className="w-full h-[42px] pl-8 pr-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
                <Barcode className="w-4 h-4 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Electrical Category Type
              </label>
              <CustomSelect
                value={formData.spec_type}
                onChange={(val) => setFormData({ ...formData, spec_type: val })}
                options={SPEC_TYPES.map((s) => ({ value: s.id, label: s.label }))}
              />
            </div>
          </div>

          {/* Dynamic Spec Inputs Based on Spec Type */}
          {formData.spec_type === "CABLE" && (
            <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200 mb-1">
                  Cable Size (e.g. 1.5 RM, 2.5 RM)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2.5 RM BYA"
                  value={formData.cable_size}
                  onChange={(e) => setFormData({ ...formData, cable_size: e.target.value })}
                  className="w-full h-[38px] px-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-blue-900 dark:text-blue-200 mb-1">
                  Voltage Grade
                </label>
                <input
                  type="text"
                  placeholder="e.g. 450/750V"
                  value={formData.voltage_grade}
                  onChange={(e) => setFormData({ ...formData, voltage_grade: e.target.value })}
                  className="w-full h-[38px] px-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          {formData.spec_type === "BREAKER" && (
            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                Current Rating (Ampere)
              </label>
              <input
                type="text"
                placeholder="e.g. 16A, 20A, 32A SP/DP"
                value={formData.current_rating}
                onChange={(e) => setFormData({ ...formData, current_rating: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {formData.spec_type === "SWITCH" && (
            <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
              <label className="block text-[11px] font-bold text-purple-900 dark:text-purple-200 mb-1">
                Gang / Module Type
              </label>
              <input
                type="text"
                placeholder="e.g. 1-Gang Switch, 2-Gang, Socket, Fan Dimmer"
                value={formData.gang_module}
                onChange={(e) => setFormData({ ...formData, gang_module: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {formData.spec_type === "LIGHTING" && (
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50">
              <label className="block text-[11px] font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                Wattage (Power Rating)
              </label>
              <input
                type="text"
                placeholder="e.g. 9W, 12W, 18W T8"
                value={formData.wattage}
                onChange={(e) => setFormData({ ...formData, wattage: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          {/* Pricing & Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cost Price (৳)
              </label>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                className="w-full h-[42px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Selling Price (৳) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={formData.sell_price}
                onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                className="w-full h-[42px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs font-mono font-bold text-[#0B3D91] dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                step="any"
                placeholder="10"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full h-[42px] px-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs font-mono font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
              />
            </div>
          </div>

          {/* Category, Brand & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <CustomSelect
                value={formData.category_id}
                onChange={(val) => setFormData({ ...formData, category_id: val })}
                options={categories.map((c) => ({ value: String(c.id), label: c.category_name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Brand
              </label>
              <CustomSelect
                value={formData.brand_id}
                onChange={(val) => setFormData({ ...formData, brand_id: val })}
                options={brands.map((b) => ({ value: String(b.id), label: b.name }))}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Base Unit
              </label>
              <CustomSelect
                value={formData.unit_id}
                onChange={(val) => setFormData({ ...formData, unit_id: val })}
                options={units.map((u) => ({ value: String(u.id), label: u.unit_name }))}
              />
            </div>
          </div>

          {/* Sticky Footer per Rule 9 */}
          <div className="pt-3 border-t border-[#cbd5e1] dark:border-[#334155] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Create &amp; Ring to Cart</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
