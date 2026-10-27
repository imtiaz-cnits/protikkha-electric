"use client";

import { Trash2, FolderOpen, ArrowRight, X, Clock, ShoppingCart } from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CartItem, Customer } from "@/lib/pos-store";

export interface HeldInvoice {
  id: string;
  timestamp: string;
  customer: Customer | null;
  cart: CartItem[];
  subTotal: number;
  grandTotal: number;
  discount: number;
  discountType: "flat" | "percent";
  deliveryCharge: number;
  note: string;
}

interface HeldInvoicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldList: HeldInvoice[];
  onRestore: (invoice: HeldInvoice) => void;
  onDelete: (id: string) => void;
}

export function HeldInvoicesModal({
  isOpen,
  onClose,
  heldList,
  onRestore,
  onDelete,
}: HeldInvoicesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
        {/* Sticky Header */}
        <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-white" />
            <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
              Held Invoices ({heldList.length})
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
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {heldList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <ShoppingCart className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
              <p className="text-sm font-bold">No Held Invoices</p>
              <p className="text-xs text-slate-500">
                You can hold the current active cart anytime by clicking the Hold button.
              </p>
            </div>
          ) : (
            heldList.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-rose-500 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                      {item.customer?.customer_name || "Walk-in Customer"}
                    </span>
                    {item.customer?.mobile && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({item.customer.mobile})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {item.timestamp}
                    </span>
                    <span>&bull;</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      {item.cart.length} item(s)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    Total Amount:{" "}
                    <strong className="text-slate-900 dark:text-white font-bold text-xs">
                      {formatBdCurrency(item.grandTotal)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestore(item)}
                    className="h-[36px] px-3.5 rounded-lg bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Load Cart</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="h-[36px] w-[36px] rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete held invoice"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Footer */}
        <div className="bg-white dark:bg-[#0f172a] px-4 py-3 border-t border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Loaded orders will overwrite the current cart.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-[36px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
