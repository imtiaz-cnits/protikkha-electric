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

interface ChallanModalProps {
  orderId: number;
  isOpen: boolean;
  onClose: () => void;
  onChallanGenerated?: () => void;
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
  const [itemDispatchQty, setItemDispatchQty] = useState<Record<number, number>>({});

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
        const initialQty: Record<number, number> = {};
        const items = result.data.items || result.data.tiles_items || [];
        items.forEach((it: any) => {
          initialQty[it.order_detail_id] = Number(it.quantity) || 0;
        });
        setItemDispatchQty(initialQty);
      } else {
        setError(result.message || "Failed to check invoice eligibility");
      }
    } catch (err: any) {
      setError(err?.message || "Network error checking invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChallan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId) return;

    setSubmitting(true);
    setError(null);

    try {
      const items = invoiceData?.items || invoiceData?.tiles_items || [];
      const customItems = items.map((it: any) => ({
        order_detail_id: it.order_detail_id,
        quantity: itemDispatchQty[it.order_detail_id] !== undefined ? itemDispatchQty[it.order_detail_id] : Number(it.quantity),
      }));

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
        const challanRes = await fetch(`/api/challans/${result.challan_id}`);
        const challanData = await challanRes.json();
        if (challanData.status === "success") {
          setPrintChallanData(challanData.data);
        }

        if (onChallanGenerated) {
          onChallanGenerated();
        }
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

  if (!isOpen) return null;

  const items = invoiceData?.items || invoiceData?.tiles_items || [];

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white dark:bg-[#0f172a] text-slate-900 dark:text-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-300 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="h-14 px-5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide leading-tight">
                  Delivery Challan Dispatch
                </h3>
                <p className="text-[11px] text-blue-100 leading-none mt-0.5">
                  Order Invoice: {invoiceData?.order_no || `ID #${orderId}`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading Skeleton */}
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#1E65A0]" />
              <p className="text-xs font-semibold">Checking invoice eligibility...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-rose-600">{error}</p>
              <button
                onClick={loadInvoiceEligibility}
                className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : !invoiceData?.is_eligible ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Challan Not Required or Already Issued
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
                {invoiceData?.eligibility_reason || "This invoice has already been fully delivered or dispatched."}
              </p>
              {invoiceData?.has_existing_challan && invoiceData?.existing_challan && (
                <div className="pt-2">
                  <span className="font-mono text-xs font-bold text-blue-600">
                    Challan No: {invoiceData.existing_challan.challan_no}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleGenerateChallan} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Invoice Summary */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Invoice Ref
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
                          Ready for Delivery
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

                {/* Line Items List */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Items for Dispatch ({items.length}) • Specify Quantity
                  </label>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {items.map((item: any) => {
                      const maxQty = Number(item.quantity) || 0;
                      const curQty = itemDispatchQty[item.order_detail_id] ?? maxQty;
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
                              Invoiced: {maxQty} {item.unit || "Pcs"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700 shadow-xs">
                              <span className="text-[10px] font-bold text-slate-500 uppercase px-1">Dispatch</span>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                max={maxQty}
                                title="Dispatch Quantity"
                                value={curQty}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  setItemDispatchQty((prev) => ({
                                    ...prev,
                                    [item.order_detail_id]: isNaN(val) ? 0 : Math.min(maxQty, Math.max(0, val)),
                                  }));
                                }}
                                className="w-20 h-7 text-center font-bold text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                              />
                              <span className="text-[10px] font-medium text-slate-500 pr-1">{item.unit || "Pcs"}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Logistics */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Delivery Destination Address
                    </label>
                    <input
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="e.g. Site Road, Ataikula, Pabna"
                      className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Driver / Courier Name
                      </label>
                      <input
                        type="text"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. Md. Karim"
                        className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Driver Phone No
                      </label>
                      <input
                        type="text"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="e.g. 01711-000000"
                        className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Dispatch Note
                    </label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Electric project site dispatch, handle carefully"
                      className="h-[42px] w-full px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
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
                      <span>Generating Challan...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      <span>Generate &amp; Print Challan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {printChallanData && (
        <ChallanPrintReceipt
          challan={printChallanData}
          onClose={() => setPrintChallanData(null)}
        />
      )}
    </>
  );
}
