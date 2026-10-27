"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Ban,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { formatBoxAndPcs, parseBoxAndPcs } from "@/lib/tiles-calculator";
import { InvoiceActionData, InvoiceActionDetail } from "./invoice-action-menu";

interface CancelTilesModalProps {
  invoice: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CancelItemQuantity {
  boxes: number;
  pcs: number;
}

export function CancelTilesModal({
  invoice,
  isOpen,
  onClose,
  onSuccess,
}: CancelTilesModalProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [cancelQuantities, setCancelQuantities] = useState<Record<number, CancelItemQuantity>>({});
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract tiles products from the invoice details
  const tilesItems = useMemo<InvoiceActionDetail[]>(() => {
    if (!invoice || !Array.isArray(invoice.details)) return [];
    return invoice.details.filter((d: any) => {
      if (typeof d.is_tiles === "boolean") return d.is_tiles;
      return Boolean(
        d.tile_size ||
          d.sqft_per_box ||
          (d.pcs_per_box && d.pcs_per_box > 0) ||
          (d.product_name && d.product_name.toLowerCase().includes("tile")) ||
          (d.category && d.category.toLowerCase().includes("tile"))
      );
    });
  }, [invoice]);

  // When modal opens or invoice changes, auto-select all tiles items and initialize box/pcs quantities
  useEffect(() => {
    if (isOpen && tilesItems.length > 0) {
      setSelectedIds(tilesItems.map((item) => item.id));
      const initialQty: Record<number, CancelItemQuantity> = {};
      tilesItems.forEach((it) => {
        const pcsPerBox = it.pcs_per_box || 1;
        const { fullBoxes, pcs } = parseBoxAndPcs(it.quantity, pcsPerBox, it.tile_size);
        initialQty[it.id] = {
          boxes: fullBoxes,
          pcs: pcs,
        };
      });
      setCancelQuantities(initialQty);
      setReason("");
      setError(null);
    } else {
      setSelectedIds([]);
      setCancelQuantities({});
      setReason("");
      setError(null);
    }
  }, [isOpen, tilesItems]);

  if (!isOpen || !invoice) return null;

  // Toggle single item
  const toggleItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle all items
  const isAllSelected =
    tilesItems.length > 0 && selectedIds.length === tilesItems.length;

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tilesItems.map((it) => it.id));
    }
  };

  // Helper to compute item cancel figures
  const getItemCancelData = (item: InvoiceActionDetail) => {
    const pcsPerBox = item.pcs_per_box || 1;
    const maxTotalPcs = Math.round(Number(item.quantity) * pcsPerBox);
    const qty = cancelQuantities[item.id] || { boxes: 0, pcs: 0 };
    const currentTotalPcs = Math.min(
      maxTotalPcs,
      Math.max(0, qty.boxes * pcsPerBox + qty.pcs)
    );
    const currentBoxes = Math.floor(currentTotalPcs / pcsPerBox);
    const currentPcs = currentTotalPcs % pcsPerBox;
    const cancelDecimalBoxes = currentTotalPcs / pcsPerBox;
    const unitPrice = item.selling_price;
    const pricePerPc = unitPrice / pcsPerBox;
    const itemCancelAmount =
      Math.round((qty.boxes * unitPrice + qty.pcs * pricePerPc) * 100) / 100;

    return {
      boxes: qty.boxes,
      pcs: qty.pcs,
      maxTotalPcs,
      pcsPerBox,
      itemCancelAmount,
      cancelDecimalBoxes,
    };
  };

  const handleBoxChange = (
    id: number,
    val: number,
    maxTotalPcs: number,
    pcsPerBox: number
  ) => {
    const safeBoxes = Math.max(0, val);
    setCancelQuantities((prev) => {
      const curPcs = prev[id]?.pcs || 0;
      const proposedPcs = safeBoxes * pcsPerBox + curPcs;
      if (proposedPcs > maxTotalPcs) {
        const cappedBoxes = Math.floor(maxTotalPcs / pcsPerBox);
        const cappedPcs = Math.min(curPcs, maxTotalPcs - cappedBoxes * pcsPerBox);
        return { ...prev, [id]: { boxes: cappedBoxes, pcs: cappedPcs } };
      }
      return { ...prev, [id]: { boxes: safeBoxes, pcs: curPcs } };
    });
  };

  const handlePcsChange = (
    id: number,
    val: number,
    maxTotalPcs: number,
    pcsPerBox: number
  ) => {
    const safePcs = Math.max(0, val);
    setCancelQuantities((prev) => {
      const curBoxes = prev[id]?.boxes || 0;
      const proposedPcs = curBoxes * pcsPerBox + safePcs;
      if (proposedPcs > maxTotalPcs) {
        const allowedPcs = Math.max(0, maxTotalPcs - curBoxes * pcsPerBox);
        return { ...prev, [id]: { boxes: curBoxes, pcs: allowedPcs } };
      }
      return { ...prev, [id]: { boxes: curBoxes, pcs: safePcs } };
    });
  };

  // Financial calculations preview
  const selectedItems = tilesItems.filter((it) => selectedIds.includes(it.id));
  const cancelAmount = selectedItems.reduce((sum, it) => {
    const data = getItemCancelData(it);
    return sum + data.itemCancelAmount;
  }, 0);

  const curSubtotal = invoice.net_payable;
  const projectedNet = Math.max(0, curSubtotal - cancelAmount);
  const curPaid = invoice.paid_amount;
  const projectedDue = Math.max(0, Math.round((projectedNet - curPaid) * 100) / 100);
  const dueReduction = Math.max(0, Math.round((invoice.due_amount - projectedDue) * 100) / 100);

  const handleConfirmCancel = async () => {
    if (selectedIds.length === 0) {
      setError("Please select at least one tiles item to cancel.");
      return;
    }

    const itemsPayload = selectedItems.map((it) => {
      const data = getItemCancelData(it);
      return {
        order_detail_id: it.id,
        cancel_boxes: data.boxes,
        cancel_pcs: data.pcs,
      };
    });

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/invoices/cancel-tiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: invoice.id,
          order_detail_ids: selectedIds,
          items: itemsPayload,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        onSuccess();
        onClose();
      } else {
        setError(data.message || "Failed to cancel tiles products.");
      }
    } catch (err: any) {
      setError(err?.message || "Communication error while cancelling items.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#cbd5e1] dark:border-[#334155]/60 animate-in fade-in zoom-in-95 duration-150">
        {/* Sticky Header: Red / Rose Brand Gradient */}
        <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold">
              <Ban className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide leading-none m-0">
                Cancel Tiles Items
              </h2>
              <p className="text-[11px] text-rose-100/80 mt-0.5 m-0">
                Invoice #{invoice.order_no} • {invoice.customer_name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Stock Guarantee Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <p className="font-bold text-emerald-800 dark:text-emerald-200 m-0 leading-tight">
                Stock & Finance Synchronization Guarantee:
              </p>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 m-0">
                Cancelled boxes and pieces will be deducted from this invoice. The invoice total and customer balance will be reduced accordingly. Any dispatched physical stock will automatically return to warehouse stock.
              </p>
            </div>
          </div>

          {/* Invoice Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Customer
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate block mt-0.5">
                {invoice.customer_name}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono">
                {invoice.customer_mobile || "N/A"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Invoice Total
              </span>
              <span className="font-black text-slate-900 dark:text-white block mt-0.5">
                {formatBdCurrency(invoice.net_payable)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Paid: {formatBdCurrency(invoice.paid_amount)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">
                Current Due
              </span>
              <span
                className={`font-black block mt-0.5 ${
                  invoice.due_amount > 0 ? "text-rose-600" : "text-emerald-600"
                }`}
              >
                {formatBdCurrency(invoice.due_amount)}
              </span>
              <span className="text-[10px] text-slate-400 block">
                Status: {invoice.due_amount > 0 ? "Due" : "Paid"}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 block uppercase font-bold">
                Cancel Amount
              </span>
              <span className="font-black text-rose-700 dark:text-rose-300 block mt-0.5">
                - {formatBdCurrency(cancelAmount)}
              </span>
              <span className="text-[10px] text-rose-500 block">
                {selectedIds.length} item(s) selected
              </span>
            </div>
          </div>

          {/* Tiles Item Selection Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className="w-5 h-5 rounded-md border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] flex items-center justify-center cursor-pointer hover:border-rose-500 transition-colors"
                >
                  {isAllSelected && (
                    <Check className="w-3.5 h-3.5 text-rose-600 stroke-[3]" />
                  )}
                  {!isAllSelected && selectedIds.length > 0 && (
                    <div className="w-2 h-2 rounded-xs bg-rose-600" />
                  )}
                </button>
                <label
                  onClick={toggleAll}
                  className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none"
                >
                  Select All Tiles ({selectedIds.length}/{tilesItems.length})
                </label>
              </div>

              <span className="text-[11px] text-slate-400">
                Click checkbox or row to toggle • Edit Box & Pcs
              </span>
            </div>

            {/* Items Table / Cards */}
            <div className="rounded-xl border border-[#cbd5e1] dark:border-[#334155] divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden bg-white dark:bg-[#0f172a]">
              {tilesItems.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs font-medium">
                  No tiles products found in this invoice.
                </div>
              ) : (
                tilesItems.map((item) => {
                  const isChecked = selectedIds.includes(item.id);
                  const itemData = getItemCancelData(item);
                  const pcsPerBox = item.pcs_per_box || 1;

                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors select-none ${
                        isChecked
                          ? "bg-rose-50/40 dark:bg-rose-950/20"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.id);
                          }}
                          className={`w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center shrink-0 cursor-pointer transition-all ${
                            isChecked
                              ? "bg-rose-600 border-rose-600 text-white"
                              : "border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-rose-400"
                          }`}
                        >
                          {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              {item.product_name}
                            </span>
                            {item.product_code && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.product_code}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {item.tile_size && (
                              <span>
                                Size: <strong className="text-slate-600 dark:text-slate-300">{item.tile_size}</strong>
                              </span>
                            )}
                            {item.grade && (
                              <span>
                                • Grade: <strong className="text-slate-600 dark:text-slate-300">{item.grade}</strong>
                              </span>
                            )}
                            <span>
                              • Qty:{" "}
                              <strong className="text-slate-700 dark:text-slate-200">
                                {formatBoxAndPcs(item.quantity, pcsPerBox, item.tile_size)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Editable Box & Pcs Inputs */}
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-2 shrink-0 px-2.5 py-1.5 rounded-xl border transition-all ${
                          isChecked
                            ? "bg-white dark:bg-slate-800/90 border-rose-200 dark:border-rose-900/60 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Box
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={Math.floor(itemData.maxTotalPcs / itemData.pcsPerBox)}
                            disabled={!isChecked}
                            value={itemData.boxes}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handleBoxChange(
                                item.id,
                                isNaN(val) ? 0 : val,
                                itemData.maxTotalPcs,
                                itemData.pcsPerBox
                              );
                            }}
                            className="w-12 h-7 px-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                            Pcs
                          </span>
                          <input
                            type="number"
                            min="0"
                            max={itemData.pcsPerBox - 1}
                            disabled={!isChecked}
                            value={itemData.pcs}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              handlePcsChange(
                                item.id,
                                isNaN(val) ? 0 : val,
                                itemData.maxTotalPcs,
                                itemData.pcsPerBox
                              );
                            }}
                            className="w-12 h-7 px-1 text-center font-mono font-bold text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-50"
                          />
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="text-right shrink-0">
                        <div className="text-xs font-black text-rose-600 dark:text-rose-400">
                          - {formatBdCurrency(itemData.itemCancelAmount)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          @{formatBdCurrency(item.selling_price)} / {item.unit || "Box"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Optional Reason / Note Input */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-1">
              Cancellation Reason (Optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer cancelled tiles items before challan delivery..."
              className="w-full h-[42px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
            />
          </div>

          {/* Live Financial Projection Preview */}
          {selectedIds.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Post-Cancellation Projection
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">New Net Payable:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    {formatBdCurrency(projectedNet)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">New Due Amount:</span>
                  <span
                    className={`font-bold ${
                      projectedDue > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {formatBdCurrency(projectedDue)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Customer Due Reduction:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    - {formatBdCurrency(dueReduction)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer: Red / Cancel themed button matching AGENTS.md rule */}
        <div className="h-[60px] px-5 bg-slate-50 dark:bg-[#0f172a] border-t border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-[42px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            Keep Items / Close
          </button>

          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting || selectedIds.length === 0}
            className="h-[42px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Cancelling Items...</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>
                  Confirm Cancellation ({selectedIds.length} Item
                  {selectedIds.length > 1 ? "s" : ""})
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
