"use client";

import { useState, useEffect } from "react";
import {
  X,
  Truck,
  Printer,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { ChallanPrintReceipt, ChallanPrintData } from "./challan-print-receipt";
import { formatBoxAndPcs, parseBoxAndPcs } from "@/lib/tiles-calculator";

interface ChallanModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
  onChallanGenerated?: () => void;
}

interface ChallanItemQty {
  boxes: number;
  pcs: number;
}

export function ChallanModal({
  orderId,
  isOpen,
  onClose,
  onChallanGenerated,
}: ChallanModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Delivery form fields
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [note, setNote] = useState("");
  const [itemBoxPcs, setItemBoxPcs] = useState<Record<number, ChallanItemQty>>({});

  // Printable Challan State
  const [printChallanData, setPrintChallanData] = useState<ChallanPrintData | null>(null);

  useEffect(() => {
    if (isOpen && orderId) {
      loadInvoiceEligibility();
    }
  }, [isOpen, orderId]);

  const loadInvoiceEligibility = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/challans/eligible-invoice/${orderId}`);
      const result = await res.json();
      if (result.status === "success") {
        setInvoiceData(result.data);
        if (result.data.customer?.address) {
          setDeliveryAddress(result.data.customer.address);
        }
        // Initialize editable quantities from invoice items
        const initialBoxPcs: Record<number, ChallanItemQty> = {};
        result.data.tiles_items?.forEach((it: any) => {
          const pcsPerBox = it.pcs_per_box ? parseInt(it.pcs_per_box, 10) : 1;
          const { fullBoxes, pcs } = parseBoxAndPcs(it.quantity, pcsPerBox, it.tile_size);
          initialBoxPcs[it.order_detail_id] = {
            boxes: fullBoxes,
            pcs: pcs,
          };
        });
        setItemBoxPcs(initialBoxPcs);
      } else {
        setError(result.message || "Failed to check invoice eligibility");
      }
    } catch (err: any) {
      setError(err?.message || "Network error checking invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleChallanBoxChange = (
    detailId: number,
    val: number,
    maxTotalPcs: number,
    pcsPerBox: number
  ) => {
    const safeBoxes = Math.max(0, val);
    setItemBoxPcs((prev) => {
      const curPcs = prev[detailId]?.pcs || 0;
      const proposedTotalPcs = safeBoxes * pcsPerBox + curPcs;
      if (proposedTotalPcs > maxTotalPcs) {
        const cappedBoxes = Math.floor(maxTotalPcs / pcsPerBox);
        const cappedPcs = Math.min(curPcs, maxTotalPcs - cappedBoxes * pcsPerBox);
        return { ...prev, [detailId]: { boxes: cappedBoxes, pcs: cappedPcs } };
      }
      return { ...prev, [detailId]: { boxes: safeBoxes, pcs: curPcs } };
    });
  };

  const handleChallanPcsChange = (
    detailId: number,
    val: number,
    maxTotalPcs: number,
    pcsPerBox: number
  ) => {
    const safePcs = Math.max(0, val);
    setItemBoxPcs((prev) => {
      const curBoxes = prev[detailId]?.boxes || 0;
      const proposedTotalPcs = curBoxes * pcsPerBox + safePcs;
      if (proposedTotalPcs > maxTotalPcs) {
        const allowedPcs = Math.max(0, maxTotalPcs - curBoxes * pcsPerBox);
        return { ...prev, [detailId]: { boxes: curBoxes, pcs: allowedPcs } };
      }
      return { ...prev, [detailId]: { boxes: curBoxes, pcs: safePcs } };
    });
  };

  const handleGenerateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setSubmitting(true);
    setError(null);

    try {
      const customItems =
        invoiceData?.tiles_items?.map((it: any) => {
          const pcsPerBox = it.pcs_per_box ? parseInt(it.pcs_per_box, 10) : 1;
          const bp = itemBoxPcs[it.order_detail_id] || { boxes: 0, pcs: 0 };
          const decQty = bp.boxes + bp.pcs / pcsPerBox;
          return {
            order_detail_id: it.order_detail_id,
            quantity: decQty > 0 ? decQty : Number(it.quantity),
          };
        }) || [];

      const res = await fetch("/api/challans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          delivery_address: deliveryAddress,
          driver_name: driverName,
          driver_phone: driverPhone,
          note: note,
          items: customItems,
        }),
      });

      const result = await res.json();
      if (result.status === "success") {
        // Fetch saved Challan details to immediately show printable receipt
        const challanRes = await fetch(`/api/challans/${result.challan_id}`);
        const challanData = await challanRes.json();
        if (challanData.status === "success") {
          setPrintChallanData(challanData.data);
        }

        if (onChallanGenerated) {
          onChallanGenerated();
        }
        // Refresh eligibility state
        loadInvoiceEligibility();
      } else {
        setError(result.message || "Failed to generate Challan");
      }
    } catch (err: any) {
      setError(err?.message || "Error generating Challan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewExistingChallan = async () => {
    if (!invoiceData?.existing_challan?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/challans/${invoiceData.existing_challan.id}`);
      const data = await res.json();
      if (data.status === "success") {
        setPrintChallanData(data.data);
      } else {
        setError(data.message || "Failed to load Challan");
      }
    } catch (err: any) {
      setError("Error opening Challan");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#cbd5e1] dark:border-[#334155]/60 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="h-[52px] px-5 bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center font-bold">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide leading-none m-0">
                  Delivery Challan Management
                </h2>
                <p className="text-[11px] text-rose-100/80 mt-0.5 m-0">
                  Tiles Warehousing & Logistics Dispatch
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-red-700 hover:bg-red-800 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content Body */}
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
              <p className="text-xs font-semibold">Verifying invoice eligibility...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-600 font-bold">{error}</p>
              <button
                onClick={loadInvoiceEligibility}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : invoiceData?.has_existing_challan ? (
            /* Already Dispatched: Show Existing Challan status */
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invoice Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Invoice Reference
                    </span>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {invoiceData?.order_no}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <div className="mt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                        Challan Already Issued
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    Customer: <span className="font-bold text-slate-900 dark:text-white">{invoiceData?.customer?.name}</span>
                  </div>
                  {invoiceData?.customer?.mobile && (
                    <div>
                      Mobile: <span className="font-mono">{invoiceData.customer.mobile}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Already Delivered Card */}
              <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                    Challan #{invoiceData?.existing_challan?.challan_no} Dispatched
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Stock was already deducted upon Challan generation. You can view or reprint the document safely without mutating stock.
                  </p>
                </div>
                <button
                  onClick={handleViewExistingChallan}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs inline-flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>View & Reprint Challan</span>
                </button>
              </div>
            </div>
          ) : !invoiceData?.is_eligible ? (
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Invoice Summary Card */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Invoice Reference
                    </span>
                    <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {invoiceData?.order_no}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </span>
                    <div className="mt-0.5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {invoiceData?.eligibility_reason || "Challan Not Required"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    Customer: <span className="font-bold text-slate-900 dark:text-white">{invoiceData?.customer?.name}</span>
                  </div>
                  {invoiceData?.customer?.mobile && (
                    <div>
                      Mobile: <span className="font-mono">{invoiceData.customer.mobile}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ineligible Notice */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2">
                <Package className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  {invoiceData?.eligibility_reason || "Challan Not Required"}
                </p>
                <p className="text-[11px] text-slate-500">
                  This invoice either contains only non-tiles items (fulfilled immediately at POS checkout) or is a completed historical invoice.
                </p>
              </div>
            </div>
          ) : (
            /* Eligible Form: Dispatch Tiles items with Scrollable Body & Sticky Bottom Buttons */
            <form onSubmit={handleGenerateChallan} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Invoice Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Invoice Reference
                      </span>
                      <p className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                        {invoiceData?.order_no}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Status
                      </span>
                      <div className="mt-0.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                          Pending Challan Dispatch
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                    <div>
                      Customer: <span className="font-bold text-slate-900 dark:text-white">{invoiceData?.customer?.name}</span>
                    </div>
                    {invoiceData?.customer?.mobile && (
                      <div>
                        Mobile: <span className="font-mono">{invoiceData.customer.mobile}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tiles Line Items Preview */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Eligible Tiles Items ({invoiceData?.tiles_items?.length || 0}) • Editable Box & Pcs
                  </label>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {invoiceData?.tiles_items?.map((item: any) => {
                      const pcsPerBox = item.pcs_per_box ? parseInt(item.pcs_per_box, 10) : 1;
                      const maxTotalPcs = Math.round(Number(item.quantity) * pcsPerBox);
                      const currentBoxPcs = itemBoxPcs[item.order_detail_id] || {
                        boxes: Math.floor(Number(item.quantity)),
                        pcs: 0,
                      };
                      const currentTotalPcs = currentBoxPcs.boxes * pcsPerBox + currentBoxPcs.pcs;
                      const currentDecimalBoxes = currentTotalPcs / pcsPerBox;
                      const formattedQty = formatBoxAndPcs(currentDecimalBoxes, pcsPerBox, item.tile_size);

                      return (
                        <div
                          key={item.order_detail_id}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-900 dark:text-white truncate">
                              {item.product_name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Size: {item.tile_size || "Standard"} {item.grade ? `• Grade: ${item.grade}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-sm block">
                                {formattedQty}
                              </span>
                              <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-semibold">
                                Pending Dispatch
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Box</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={Math.floor(maxTotalPcs / pcsPerBox)}
                                  title="Dispatch Boxes"
                                  value={currentBoxPcs.boxes}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    handleChallanBoxChange(
                                      item.order_detail_id,
                                      isNaN(val) ? 0 : val,
                                      maxTotalPcs,
                                      pcsPerBox
                                    );
                                  }}
                                  className="w-13 h-[32px] px-1 text-center font-mono font-bold text-xs text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Pcs</span>
                                <input
                                  type="number"
                                  min="0"
                                  max={pcsPerBox - 1}
                                  title="Dispatch Pieces"
                                  value={currentBoxPcs.pcs}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    handleChallanPcsChange(
                                      item.order_detail_id,
                                      isNaN(val) ? 0 : val,
                                      maxTotalPcs,
                                      pcsPerBox
                                    );
                                  }}
                                  className="w-13 h-[32px] px-1 text-center font-mono font-bold text-xs text-rose-700 dark:text-rose-400 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-rose-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Logistics Inputs */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Destination Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Construction Site, Road 4, Pabna"
                      className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E65A0] focus:border-[#1E65A0]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Driver Name <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Md. Karim"
                        className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E65A0] focus:border-[#1E65A0]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Driver Phone No <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="e.g. 01700-123456"
                        className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E65A0] focus:border-[#1E65A0]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dispatch Note <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Handle with care, offload ground floor"
                      className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#1E65A0] focus:border-[#1E65A0]"
                    />
                  </div>
                </div>

                {/* Stock Alert Notice */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Generating this Challan will permanently decrement physical warehouse stock for the listed Tiles items and mark this invoice as Delivered.
                  </span>
                </div>
              </div>

              {/* Sticky Footer Action Buttons (Header-like sticky pinned to bottom) */}
              <div className="shrink-0 px-5 py-3.5 bg-slate-50 dark:bg-[#1e293b]/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5 shadow-xs">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-[42px] px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[42px] px-6 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing & Deducting Stock...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Generate & Dispatch Challan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Printable Receipt Overlay when printChallanData is active */}
      {printChallanData && (
        <ChallanPrintReceipt
          challan={printChallanData}
          onClose={() => setPrintChallanData(null)}
        />
      )}
    </>
  );
}
