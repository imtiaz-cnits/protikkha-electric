"use client";

import { useState, useEffect } from "react";
import {
  X,
  Loader2,
  Barcode,
  Layers,
  PlusCircle,
} from "lucide-react";
import { POPULAR_TILE_SIZES, TILE_GRADES, SURFACE_FINISHES, autoCalculateSqftPerBox } from "@/lib/tiles-calculator";
import { CustomSelect } from "@/components/ui/custom-select";

interface QuickProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: number; category_name: string }>;
  brands: Array<{ id: number; name: string }>;
  units: Array<{ id: number; unit_name: string }>;
  onProductCreated: (product: any) => void;
}

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
    tile_size: "",
    sqft_per_box: "",
    pcs_per_box: "",
    grade: "",
    surface_finish: "",
    brand_id: "",
    category_id: "",
    unit_id: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and reset whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const defaultCat =
        categories.find(
          (c) =>
            c.category_name?.toLowerCase().includes("tile") ||
            c.category_name?.toLowerCase().includes("টাইল")
        ) || categories[0];

      const isTile = Boolean(
        defaultCat?.category_name &&
          (defaultCat.category_name.toLowerCase().includes("tile") ||
            defaultCat.category_name.toLowerCase().includes("টাইল"))
      );

      let defaultUnitId = "";
      if (isTile) {
        const boxUnit = units.find((u) => u.unit_name?.toLowerCase() === "box");
        if (boxUnit) defaultUnitId = String(boxUnit.id);
      }
      if (!defaultUnitId && units[0]?.id) {
        defaultUnitId = String(units[0].id);
      }

      setFormData({
        product_name: "",
        product_code: "",
        cost_price: "",
        sell_price: "",
        quantity: "10",
        tile_size: "",
        sqft_per_box: "",
        pcs_per_box: "",
        grade: "",
        surface_finish: "",
        brand_id: brands[0]?.id ? String(brands[0].id) : "",
        category_id: defaultCat?.id ? String(defaultCat.id) : "",
        unit_id: defaultUnitId,
      });
      setError(null);
    }
  }, [isOpen, categories, brands, units]);

  if (!isOpen) return null;

  const selectedCategory = categories.find((c) => String(c.id) === String(formData.category_id));
  const isTilesCategory = Boolean(
    selectedCategory?.category_name &&
      (selectedCategory.category_name.toLowerCase().includes("tile") ||
        selectedCategory.category_name.toLowerCase().includes("টাইল"))
  );

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
        tile_size: isTilesCategory ? (formData.tile_size || null) : null,
        sqft_per_box: isTilesCategory && formData.sqft_per_box ? Number(formData.sqft_per_box) : null,
        pcs_per_box: isTilesCategory && formData.pcs_per_box ? Number(formData.pcs_per_box) : null,
        grade: isTilesCategory ? (formData.grade || null) : null,
        surface_finish: isTilesCategory ? (formData.surface_finish || null) : null,
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        setError(data.message || "Failed to create product");
        setLoading(false);
        return;
      }

      onProductCreated(data.data);
      onClose();
    } catch (err: any) {
      setError(err?.message || "An error occurred while saving product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
      {/* Unified Container: max-w-3xl sm:max-w-4xl matching product page */}
      <div className="w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header: Cool Crimson / Ruby Red Gradient, Circular Red Close */}
        <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white tracking-tight m-0">
              Add New Product Item
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form wrapping scrollable body and fixed footer cleanly */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Body: scrollbar stops cleanly above footer */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Product Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.product_name}
                onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                placeholder="e.g. Fresh Ceramics 60x60 Floor Tiles"
                className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
              />
            </div>

            {/* Category & Brand Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Category *
                </label>
                <CustomSelect
                  options={categories.map((c) => ({ value: c.id, label: c.category_name }))}
                  value={formData.category_id}
                  onChange={(val) => {
                    const newCatId = String(val);
                    const catObj = categories.find((c) => String(c.id) === newCatId);
                    const isTile = Boolean(
                      catObj?.category_name &&
                        (catObj.category_name.toLowerCase().includes("tile") ||
                          catObj.category_name.toLowerCase().includes("টাইল"))
                    );

                    let newUnitId = formData.unit_id;
                    if (isTile && !newUnitId) {
                      const boxUnit = units.find((u) => u.unit_name?.toLowerCase() === "box");
                      if (boxUnit) newUnitId = String(boxUnit.id);
                    }

                    setFormData({
                      ...formData,
                      category_id: newCatId,
                      unit_id: newUnitId,
                    });
                  }}
                  placeholder="Select Category"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Brand *
                </label>
                <CustomSelect
                  options={brands.map((b) => ({ value: b.id, label: b.name }))}
                  value={formData.brand_id}
                  onChange={(val) => setFormData({ ...formData, brand_id: String(val) })}
                  placeholder="Select Brand"
                />
              </div>
            </div>

            {/* Prices & Stock */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Cost Price (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Selling Price (৳) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.sell_price}
                  onChange={(e) => setFormData({ ...formData, sell_price: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 font-bold text-rose-700 dark:text-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Stock Qty
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0"
                  className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
                />
              </div>
            </div>

            {/* Unit & Barcode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Unit of Measurement
                </label>
                <CustomSelect
                  options={units.map((u) => ({ value: u.id, label: u.unit_name }))}
                  value={formData.unit_id}
                  onChange={(val) => setFormData({ ...formData, unit_id: String(val) })}
                  placeholder="Select Unit"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Product Code / Barcodes
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={formData.product_code}
                    onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                    placeholder="e.g. PRD-0001, 8934521093"
                    className="w-full h-[42px] pl-9 pr-3 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Separate multiple barcodes with commas. Leave blank to auto-generate.
                </p>
              </div>
            </div>

            {/* Tiles Specifications & Packaging Section - STRICTLY VISIBLE ONLY FOR TILES */}
            {isTilesCategory && (
              <div className="border border-rose-200 dark:border-rose-950/70 rounded-2xl p-4 bg-gradient-to-br from-rose-50/50 via-white to-slate-50/50 dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900/60 space-y-3.5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight">
                        Tiles Specifications & Packaging Calculator
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        For Tiles items: Size, Box to Sq.Ft conversion, Grade & Surface Finish
                      </p>
                    </div>
                  </div>
                  {formData.tile_size && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                      Tiles Mode Active
                    </span>
                  )}
                </div>

                {/* Popular Size Pills */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Tile Dimensions / Size (Quick Pick)
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {POPULAR_TILE_SIZES.map((size) => (
                      <button
                        key={size.value}
                        type="button"
                        onClick={() => {
                          setFormData({
                            ...formData,
                            tile_size: size.value,
                            sqft_per_box: size.defaultSqftPerBox ? String(size.defaultSqftPerBox) : formData.sqft_per_box,
                            pcs_per_box: size.defaultPcsPerBox ? String(size.defaultPcsPerBox) : formData.pcs_per_box,
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                          formData.tile_size === size.value
                            ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#334155] hover:border-rose-400"
                        }`}
                      >
                        {size.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={formData.tile_size}
                    onChange={(e) => {
                      const newSize = e.target.value;
                      const pcs = parseFloat(formData.pcs_per_box || "0");
                      const autoSqft = autoCalculateSqftPerBox(newSize, pcs);
                      setFormData({
                        ...formData,
                        tile_size: newSize,
                        ...(autoSqft !== null ? { sqft_per_box: String(autoSqft) } : {}),
                      });
                    }}
                    placeholder="Or enter custom size (e.g. 8/12, 12x24, 10.5/24)"
                    className="w-full h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 font-medium"
                  />
                </div>

                {/* Box Packaging & Conversion Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Sq.Ft per Box (বক্সে মোট স্কয়ার ফিট)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={formData.sqft_per_box}
                      onChange={(e) => setFormData({ ...formData, sqft_per_box: e.target.value })}
                      placeholder="e.g. 16.66 or 16.0"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs font-bold text-rose-700 dark:text-rose-400 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Required for live POS Box ⇄ Sq.Ft billing conversion.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Pieces per Box (বক্সে মোট পিস)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.pcs_per_box}
                      onChange={(e) => {
                        const newPcs = e.target.value;
                        const pcsNum = parseFloat(newPcs || "0");
                        const autoSqft = autoCalculateSqftPerBox(formData.tile_size, pcsNum);
                        setFormData({
                          ...formData,
                          pcs_per_box: newPcs,
                          ...(autoSqft !== null ? { sqft_per_box: String(autoSqft) } : {}),
                        });
                      }}
                      placeholder="e.g. 25, 11, 10, 8, 4"
                      className="w-full h-[40px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs font-bold text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Useful for loose piece calculations.
                    </p>
                  </div>
                </div>

                {/* Grade & Surface Finish */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tiles Grade / Quality
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {TILE_GRADES.map((g) => (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, grade: formData.grade === g.value ? "" : g.value })}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                            formData.grade === g.value
                              ? "bg-rose-600 text-white border-rose-700 shadow-xs"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#334155] hover:border-rose-400"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Surface Finish
                    </label>
                    <CustomSelect
                      options={SURFACE_FINISHES.map((f) => ({ value: f, label: f }))}
                      value={formData.surface_finish}
                      onChange={(val) => setFormData({ ...formData, surface_finish: String(val) })}
                      placeholder="Select Surface Finish (Optional)"
                    />
                  </div>
                </div>

                {/* Live Packaging Badge */}
                {formData.sqft_per_box && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
                    <span>📦 1 Box = {formData.sqft_per_box} Sq.Ft {formData.pcs_per_box ? `(${formData.pcs_per_box} Pcs)` : ""}</span>
                    {formData.sell_price && Number(formData.sqft_per_box) > 0 && (
                      <span className="text-[11px] font-black">
                        Rate: ৳{(Number(formData.sell_price) / Number(formData.sqft_per_box)).toFixed(2)} / Sq.Ft
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer (Rule 6.4) - Fixed at bottom outside the scroll area */}
          <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 z-10 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-70 shadow-sm"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Ring</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
