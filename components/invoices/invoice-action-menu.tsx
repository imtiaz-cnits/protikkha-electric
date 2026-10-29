"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MoreVertical,
  Eye,
  Printer,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";

export interface InvoiceActionDetail {
  id: number;
  product_name: string;
  product_code?: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  category?: string | null;
  quantity: number;
  selling_price: number;
  unit: string;
  line_total: number;
  is_tiles?: boolean;
}

export interface InvoiceActionData {
  id: number;
  order_no: string;
  customer_name: string;
  customer_mobile: string;
  net_payable: number;
  paid_amount: number;
  due_amount: number;
  details: InvoiceActionDetail[];
}

interface InvoiceActionMenuProps<T = any> {
  invoice: T;
  onPrintReceipt: (invoice: T) => void;
  onCollectDue: (invoice: T) => void;
}

export function InvoiceActionMenu<T extends Record<string, any>>({
  invoice,
  onPrintReceipt,
  onCollectDue,
}: InvoiceActionMenuProps<T>) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    placement: "bottom" | "top";
  }>({
    top: 0,
    left: 0,
    placement: "bottom",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 200;
    const menuHeight = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = 0;
    let left = rect.right - menuWidth;
    let placement: "bottom" | "top" = "bottom";

    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
      top = rect.top - menuHeight - 6;
      placement = "top";
    } else {
      top = rect.bottom + 6;
      placement = "bottom";
    }

    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setCoords({ top, left, placement });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      updatePosition();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (callback: () => void) => {
    setIsOpen(false);
    callback();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="w-[30px] h-[30px] rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] hover:text-[#1E65A0] dark:hover:text-blue-400 flex items-center justify-center transition-all shadow-2xs cursor-pointer"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: "200px",
              zIndex: 9999,
            }}
            className="rounded-2xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Invoice Actions</span>
              <span className="text-slate-600 dark:text-slate-300 font-mono">
                #{invoice.order_no}
              </span>
            </div>

            {/* 1. View Invoice Bill */}
            <button
              type="button"
              onClick={() => handleAction(() => router.push(`/invoices/${invoice.id}`))}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1">View Bill</span>
            </button>

            {/* 2. Print Thermal Cash Receipt */}
            <button
              type="button"
              onClick={() => handleAction(() => onPrintReceipt(invoice))}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1">Print Receipt</span>
            </button>

            {/* 3. Sales Return */}
            <button
              type="button"
              onClick={() =>
                handleAction(() =>
                  router.push(
                    `/returns?tab=sales&order_no=${encodeURIComponent(invoice.order_no)}`
                  )
                )
              }
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer"
            >
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-3.5 h-3.5" />
              </div>
              <span className="flex-1">Sales Return</span>
            </button>

            {/* 4. Collect Due Payment (If Due > 0) */}
            {invoice.due_amount > 0 && (
              <button
                type="button"
                onClick={() => handleAction(() => onCollectDue(invoice))}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors text-left cursor-pointer"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span>Collect Due</span>
                  <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-400">
                    Due: ৳{invoice.due_amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </button>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
