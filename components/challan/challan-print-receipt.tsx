"use client";

import { Printer, X, Truck, Calendar, User, MapPin } from "lucide-react";
import { parseBoxAndPcs } from "@/lib/tiles-calculator";

interface ChallanItem {
  id: number;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
}

export interface ChallanPrintData {
  id: number;
  challan_no: string;
  order_no: string;
  challan_date: string;
  customer_name: string;
  customer_code?: string;
  customer_mobile: string;
  customer_address: string;
  delivery_address?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_no?: string;
  status: string;
  note?: string;
  created_by?: string;
  items: ChallanItem[];
}

interface ChallanPrintProps {
  challan: ChallanPrintData;
  onClose: () => void;
}

export function ChallanPrintReceipt({ challan, onClose }: ChallanPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  let totalBoxes = 0;
  let totalPcs = 0;
  challan.items.forEach((it) => {
    const { fullBoxes, pcs } = parseBoxAndPcs(it.quantity, it.pcs_per_box, it.tile_size);
    totalBoxes += fullBoxes;
    totalPcs += pcs;
  });

  const formattedTotalDispatch =
    totalBoxes > 0 && totalPcs > 0
      ? `${totalBoxes} Boxes ${totalPcs} Pcs`
      : totalBoxes > 0
      ? `${totalBoxes} Boxes`
      : totalPcs > 0
      ? `${totalPcs} Pcs`
      : "0 Box";

  const formattedDate = challan.challan_date
    ? new Date(challan.challan_date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="fixed inset-0 z-[90] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Container: Wider modal (max-w-xl) with single unified container */}
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-xl w-full max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-300 print:border-none print:shadow-none print:max-w-none print:m-0 print:p-0">
        {/* Modal Top Actions (Hidden on Print) */}
        <div className="print:hidden h-13 px-4 sm:px-5 bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs tracking-wide leading-tight truncate">
                Delivery Challan &bull; {challan.challan_no}
              </h3>
              <p className="text-[10px] text-rose-100/80 leading-none mt-0.5 truncate">
                Ref Inv: {challan.order_no}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="h-8 px-3.5 rounded-lg bg-white text-rose-900 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Print Challan Slip"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span className="whitespace-nowrap">Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-red-700 hover:bg-red-800 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 font-sans text-xs print:p-0 print:overflow-visible print:m-0 flex flex-col">
          <style jsx global>{`
            @media print {
              @page {
                size: auto;
                margin: 10mm;
              }
              html, body {
                height: 100% !important;
                background: white !important;
              }
              body * {
                visibility: hidden;
              }
              /* Strictly hide invoice receipt when printing challan */
              .thermal-sheet,
              #printable-invoice {
                display: none !important;
                visibility: hidden !important;
              }
              #printable-challan,
              #printable-challan * {
                visibility: visible;
              }
              #printable-challan {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 80mm !important;
                max-width: 80mm !important;
                min-height: calc(100vh - 20px) !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: space-between !important;
                margin: 0 !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                box-sizing: border-box !important;
                font-size: 11px !important;
              }
              .challan-footer-wrapper {
                margin-top: auto !important;
                padding-top: 20px !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          `}</style>

          <div id="printable-challan" className="space-y-3.5 font-sans text-slate-800 flex-1 flex flex-col justify-between">
            {/* Top Main Section */}
            <div className="space-y-3.5 flex-1">
              {/* Header */}
              <div className="text-center border-b-2 border-red-700 pb-2.5">
                <h1 className="text-lg font-black text-rose-900 tracking-wider uppercase leading-tight">
                  RUNA TRADERS
                </h1>
                <p className="text-[10px] text-slate-600 font-medium">
                  Tiles, Sanitary Ware & Bath Fittings
                </p>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Bus Terminal Main Road, Pabna | 01711-968720
                </p>
                <div className="mt-2 inline-block px-3 py-0.5 rounded-md bg-[#991b1b] text-white font-bold text-[10px] tracking-wider uppercase">
                  DELIVERY CHALLAN / চালান
                </div>
              </div>

              {/* Challan & Customer Info */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Challan No:</span>
                  <span className="font-mono text-rose-900">{challan.challan_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice Ref:</span>
                  <span className="font-mono font-medium">{challan.order_no}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{formattedDate}</span>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <span className="font-bold text-slate-900 truncate max-w-[240px]">{challan.customer_name}</span>
                  </div>
                  {challan.customer_mobile && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phone:</span>
                      <span>{challan.customer_mobile}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-1 text-slate-600 pt-0.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">{challan.delivery_address || challan.customer_address || "Showroom Handover"}</span>
                  </div>
                </div>

                {(challan.vehicle_no || challan.driver_name) && (
                  <div className="pt-1 border-t border-slate-200 text-[10px] text-slate-700">
                    <span className="font-medium text-slate-500">Vehicle:</span> {challan.vehicle_no || "N/A"} {challan.driver_name ? `(${challan.driver_name})` : ""}
                  </div>
                )}
              </div>

              {/* Tiles Line Items Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#991b1b] text-white font-bold text-[10px]">
                      <th className="py-1.5 px-2 w-7 text-center">#</th>
                      <th className="py-1.5 px-2">Description</th>
                      <th className="py-1.5 px-1.5 text-center">Size</th>
                      <th className="py-1.5 px-2 text-right">Qty</th>
                      <th className="py-1.5 px-1.5 text-center">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {challan.items.map((item, idx) => {
                      const isTile = Boolean(
                        item.tile_size ||
                        item.pcs_per_box ||
                        (item.unit && item.unit.toLowerCase().includes("box"))
                      );
                      const { fullBoxes, pcs, formatted } = parseBoxAndPcs(
                        item.quantity,
                        item.pcs_per_box,
                        item.tile_size
                      );
                      const displayQty = isTile ? formatted : `${item.quantity} Pcs`;
                      const displayUnit = isTile
                        ? fullBoxes > 0 && pcs > 0
                          ? "Box, Pcs"
                          : fullBoxes > 0
                          ? "Box"
                          : "Pcs"
                        : item.unit || "Pcs";
                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-2 text-center text-slate-500 font-mono text-[10px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2 font-semibold text-slate-900 leading-tight">
                            {item.product_name}
                          </td>
                          <td className="py-1.5 px-1.5 text-center text-slate-600 text-[10px]">
                            {item.tile_size || "-"}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                            {displayQty}
                          </td>
                          <td className="py-1.5 px-1.5 text-center text-slate-600 text-[10px] whitespace-nowrap">
                            {displayUnit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-[11px]">
                      <td colSpan={3} className="py-1.5 px-2 text-right uppercase text-[10px]">
                        Total Dispatch:
                      </td>
                      <td colSpan={2} className="py-1.5 px-2 text-right font-mono font-black text-rose-900 whitespace-nowrap">
                        {formattedTotalDispatch}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Note & Inspection Notice */}
              <div className="p-2 bg-amber-50/80 rounded-lg border border-amber-200 text-[10px] text-amber-900">
                <span className="font-bold">Notice:</span> Inspect tiles boxes for breakage before delivery handover.
                {challan.note && (
                  <p className="mt-0.5 text-slate-800 font-medium">
                    <strong>Note:</strong> {challan.note}
                  </p>
                )}
              </div>
            </div>

            {/* Signature Protocol & Footer (Always pinned at bottom in print) */}
            <div className="challan-footer-wrapper mt-auto pt-6 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-center text-[9px] font-semibold text-slate-600 uppercase tracking-wider">
                <div>
                  <div className="border-t border-slate-400 pt-1 w-4/5 mx-auto font-bold text-slate-800">
                    Delivered By
                  </div>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-1 w-4/5 mx-auto font-bold text-slate-800">
                    Customer Received
                  </div>
                </div>
              </div>

              {/* Footer Brand */}
              <div className="pt-2 text-center text-[9px] text-slate-400 border-t border-slate-200">
                RUNA TRADERS &bull; Software By CodeNext IT
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
