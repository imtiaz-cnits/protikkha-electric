"use client";

import { useState, useEffect } from "react";
import { X, Calculator, Check, Boxes, Sparkles, ArrowRight, Layers } from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import {
  calculateTileCoverage,
  calculateSqftFromBoxes,
  calculateRatePerSqft,
  calculateBoxPrice,
  formatBoxAndPcs,
  calculateFromPcs,
} from "@/lib/tiles-calculator";

interface TileCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    product_id: number;
    product_name: string;
    selling_price: number;
    quantity: number;
    tile_size?: string | null;
    sqft_per_box?: number | null;
    pcs_per_box?: number | null;
    grade?: string | null;
    surface_finish?: string | null;
  } | null;
  onApply: (data: { quantity: number; price?: number; custom_sqft?: number }) => void;
}

export function TileCalculatorModal({
  isOpen,
  onClose,
  product,
  onApply,
}: TileCalculatorModalProps) {
  const [calcMode, setCalcMode] = useState<"sqft" | "pcs" | "box">("sqft");
  const [selectedBoxMode, setSelectedBoxMode] = useState<"exact" | "full">("exact");
  const [sqftInput, setSqftInput] = useState<string>("");
  const [pcsInput, setPcsInput] = useState<string>("");
  const [boxesInput, setBoxesInput] = useState<string>("1");
  const [boxPriceInput, setBoxPriceInput] = useState<string>("");
  const [sqftPriceInput, setSqftPriceInput] = useState<string>("");

  const sqftPerBox = product?.sqft_per_box || 16.0;
  const pcsPerBox = product?.pcs_per_box || 4;

  useEffect(() => {
    if (product) {
      const initialBoxes = product.quantity || 1;
      setBoxesInput(String(initialBoxes));
      setSqftInput(String((initialBoxes * sqftPerBox).toFixed(1)));
      setPcsInput(String(Math.round(initialBoxes * pcsPerBox)));
      setBoxPriceInput(String(product.selling_price));
      setSqftPriceInput(String(calculateRatePerSqft(product.selling_price, sqftPerBox)));
      setSelectedBoxMode("exact");
    }
  }, [product, sqftPerBox, pcsPerBox]);

  if (!isOpen || !product) return null;

  // Handle Box Price change
  const handleBoxPriceChange = (val: string) => {
    setBoxPriceInput(val);
    const num = parseFloat(val) || 0;
    if (sqftPerBox > 0) {
      setSqftPriceInput(String(calculateRatePerSqft(num, sqftPerBox)));
    }
  };

  // Handle SqFt Price change
  const handleSqftPriceChange = (val: string) => {
    setSqftPriceInput(val);
    const num = parseFloat(val) || 0;
    if (sqftPerBox > 0) {
      setBoxPriceInput(String(calculateBoxPrice(num, sqftPerBox)));
    }
  };

  // Live calculations
  const sqftNum = parseFloat(sqftInput) || 0;
  const coverage = calculateTileCoverage(sqftNum, sqftPerBox);

  // Exact vs Full Box calculations for Tab 1
  const activeBoxes = selectedBoxMode === "exact" ? coverage.boxesExact : coverage.recommendedBoxes;
  const activeSqft = selectedBoxMode === "exact" ? sqftNum : coverage.totalSqftSupplied;

  // Pcs calculations for Tab 2
  const pcsNum = parseInt(pcsInput, 10) || 0;
  const pcsCalc = calculateFromPcs(pcsNum, pcsPerBox, sqftPerBox);

  const boxesNum = parseFloat(boxesInput) || 0;
  const totalSqftFromBoxes = calculateSqftFromBoxes(boxesNum, sqftPerBox);
  const totalPcs = Math.round(boxesNum * pcsPerBox);

  const currentBoxPrice = parseFloat(boxPriceInput) || product.selling_price;

  const handleApplyRecommended = () => {
    onApply({
      quantity: activeBoxes,
      price: currentBoxPrice,
      custom_sqft: activeSqft,
    });
    onClose();
  };

  const handleApplyPcs = () => {
    onApply({
      quantity: Math.max(0.01, pcsCalc.totalBoxes),
      price: currentBoxPrice,
      custom_sqft: pcsCalc.totalSqft,
    });
    onClose();
  };

  const handleApplyBoxes = () => {
    onApply({
      quantity: Math.max(0.01, boxesNum),
      price: currentBoxPrice,
      custom_sqft: totalSqftFromBoxes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl sm:max-w-3xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[92vh] flex flex-col">
        {/* Header (Rule 6.2) */}
        <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
              Tiles Conversion & Packaging Calculator
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

        {/* Body */}
        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
          {/* Product Info & Specifications Card */}
          <div className="bg-slate-50 dark:bg-[#1e293b] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">
                  {product.product_name}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {product.tile_size && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      📐 {product.tile_size}
                    </span>
                  )}
                  {product.grade && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      ★ {product.grade}
                    </span>
                  )}
                  {product.surface_finish && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      ✨ {product.surface_finish}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Unit Packaging</span>
                <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                  {sqftPerBox} Sft / Box
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {pcsPerBox} Pcs / Box
                </span>
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="grid grid-cols-3 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 gap-1">
            <button
              type="button"
              onClick={() => setCalcMode("sqft")}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                calcMode === "sqft"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📐 Calculate by Sq.Ft Needed
            </button>
            <button
              type="button"
              onClick={() => setCalcMode("pcs")}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                calcMode === "pcs"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🧩 Calculate by Pcs
            </button>
            <button
              type="button"
              onClick={() => setCalcMode("box")}
              className={`py-2 px-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                calcMode === "box"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              📦 Calculate by Box Quantity
            </button>
          </div>

          {/* Tab 1: Calculate by Sq.Ft Needed */}
          {calcMode === "sqft" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Square Feet Area Needed (কাস্টমারের প্রয়োজনীয় মোট স্কয়ার ফিট)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={sqftInput}
                    onChange={(e) => setSqftInput(e.target.value)}
                    placeholder="e.g. 250 Sq.Ft"
                    className="w-full h-[44px] pl-3.5 pr-14 rounded-xl bg-white dark:bg-slate-800/90 text-sm font-extrabold text-slate-900 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    Sq.Ft
                  </span>
                </div>
              </div>

              {/* Conversion Result Card */}
              {sqftNum > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-slate-900/40 border border-blue-200 dark:border-blue-900 space-y-2.5">
                  {/* Mode Selector Toggle: Exact (ভাংতি হিসাব) vs Full Boxes (পূর্ণ বক্স) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBoxMode("exact")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedBoxMode === "exact"
                          ? "bg-white dark:bg-slate-800 border-[#1E65A0] dark:border-blue-500 shadow-xs ring-2 ring-[#1E65A0]/20"
                          : "bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] dark:text-blue-400">
                          ভাংতি হিসাব (Exact)
                        </span>
                        {selectedBoxMode === "exact" && (
                          <span className="w-2 h-2 rounded-full bg-[#1E65A0] animate-pulse" />
                        )}
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {formatBoxAndPcs(coverage.boxesExact, pcsPerBox)}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        Covering {sqftNum} Sq.Ft
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedBoxMode("full")}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedBoxMode === "full"
                          ? "bg-white dark:bg-slate-800 border-[#1E65A0] dark:border-blue-500 shadow-xs ring-2 ring-[#1E65A0]/20"
                          : "bg-white/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0B3D91] dark:text-blue-400">
                          পূর্ণ বক্স (Round Up)
                        </span>
                        {selectedBoxMode === "full" && (
                          <span className="w-2 h-2 rounded-full bg-[#1E65A0] animate-pulse" />
                        )}
                      </div>
                      <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                        {coverage.recommendedBoxes} <span className="text-xs font-normal">Boxes</span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {coverage.totalSqftSupplied} Sq.Ft (+{coverage.extraSqft} Sft)
                      </div>
                    </button>
                  </div>

                  {/* Financial & Coverage Summary Card */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        {selectedBoxMode === "exact" ? "Selected (ভাংতি হিসাব):" : "Selected (পূর্ণ বক্স):"}
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {selectedBoxMode === "exact"
                          ? formatBoxAndPcs(coverage.boxesExact, pcsPerBox)
                          : `${coverage.recommendedBoxes} Boxes`}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Covering {activeSqft} Sq.Ft {selectedBoxMode === "full" && coverage.extraSqft > 0 ? `(+${coverage.extraSqft} Sft margin)` : ""}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Total Price:
                      </span>
                      <span className="text-base font-black text-rose-700 dark:text-rose-400">
                        {formatBdCurrency(activeBoxes * currentBoxPrice)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        @ {formatBdCurrency(currentBoxPrice)}/Box
                      </span>
                    </div>
                  </div>

                  {/* Apply Action Button */}
                  <button
                    type="button"
                    onClick={handleApplyRecommended}
                    className="w-full h-[40px] rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Apply{" "}
                      {selectedBoxMode === "exact"
                        ? formatBoxAndPcs(coverage.boxesExact, pcsPerBox)
                        : `${coverage.recommendedBoxes} Boxes`}{" "}
                      ({activeSqft} Sq.Ft) to Cart
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Calculate by Pcs */}
          {calcMode === "pcs" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Total Pieces Needed (প্রয়োজনীয় টাইলসের পিস সংখ্যা)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={pcsInput}
                    onChange={(e) => setPcsInput(e.target.value)}
                    placeholder="e.g. 15 or 50 Pieces"
                    className="w-full h-[44px] pl-3.5 pr-14 rounded-xl bg-white dark:bg-slate-800/90 text-sm font-extrabold text-slate-900 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    Pieces
                  </span>
                </div>
              </div>

              {pcsNum > 0 && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-slate-900/40 border border-blue-200 dark:border-blue-900 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Box Breakdown:</span>
                      <strong className="text-sm font-black text-slate-800 dark:text-white">
                        {pcsCalc.formattedText}
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-400 block">Total Coverage:</span>
                      <strong className="text-sm font-black text-slate-800 dark:text-white">
                        {pcsCalc.totalSqft} Sq.Ft
                      </strong>
                    </div>
                  </div>

                  {/* Financial & Coverage Summary Card */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Calculated Quantity:
                      </span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">
                        {pcsCalc.formattedText}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Covering {pcsCalc.totalSqft} Sq.Ft ({pcsNum} Pcs total)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                        Total Price:
                      </span>
                      <span className="text-base font-black text-rose-700 dark:text-rose-400">
                        {formatBdCurrency(pcsCalc.totalBoxes * currentBoxPrice)}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        @ {formatBdCurrency(currentBoxPrice)}/Box
                      </span>
                    </div>
                  </div>

                  {/* Apply Action Button */}
                  <button
                    type="button"
                    onClick={handleApplyPcs}
                    className="w-full h-[40px] rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>
                      Apply {pcsCalc.formattedText} ({pcsCalc.totalSqft} Sq.Ft) to Cart
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Calculate by Box Quantity */}
          {calcMode === "box" && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Boxes (বক্সের সংখ্যা)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={boxesInput}
                    onChange={(e) => setBoxesInput(e.target.value)}
                    placeholder="e.g. 10 or 75 Boxes"
                    className="w-full h-[44px] pl-3.5 pr-14 rounded-xl bg-white dark:bg-slate-800/90 text-sm font-extrabold text-slate-900 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                  />
                  <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">
                    Boxes
                  </span>
                </div>
              </div>

              {/* Box Details Card */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Total Coverage:</span>
                    <strong className="text-sm font-black text-slate-800 dark:text-white">
                      {totalSqftFromBoxes} Sq.Ft
                    </strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Total Pieces:</span>
                    <strong className="text-sm font-black text-slate-800 dark:text-white">
                      {totalPcs} Pieces
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    Total Line Price:
                  </span>
                  <span className="text-base font-black text-rose-700 dark:text-rose-400">
                    {formatBdCurrency(boxesNum * currentBoxPrice)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleApplyBoxes}
                  className="w-full h-[40px] rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm mt-2 transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Apply {formatBoxAndPcs(boxesNum, pcsPerBox)} ({totalSqftFromBoxes} Sq.Ft) to Cart
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Pricing Rate Dual Editor (Box ⇄ Sq.Ft) */}
          <div className="p-3.5 rounded-2xl border border-dashed border-[#cbd5e1] dark:border-[#334155] space-y-2">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Unit Rate Conversion (Auto-synchronizing)</span>
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Price per Box (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={boxPriceInput}
                  onChange={(e) => handleBoxPriceChange(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 text-xs font-black text-[#1E65A0] dark:text-blue-400 border border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">
                  Equivalent Rate per Sq.Ft (৳)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={sqftPriceInput}
                  onChange={(e) => handleSqftPriceChange(e.target.value)}
                  className="w-full h-[38px] px-3 rounded-xl bg-white dark:bg-slate-800 text-xs font-black text-rose-700 dark:text-rose-400 border border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Rule 6.4) */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
