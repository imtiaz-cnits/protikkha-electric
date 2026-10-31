"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, ArrowLeft, Loader2 } from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { formatElectricalQty } from "@/lib/electrical-unit-service";

interface InvoiceDetail {
  id: number;
  product_name: string;
  spec_type?: string | null;
  cable_size?: string | null;
  current_rating?: string | null;
  voltage_grade?: string | null;
  wattage?: string | null;
  gang_module?: string | null;
  tile_size?: string | null;
  category?: string | null;
  unit?: string | null;
  packaging_unit?: string | null;
  conversion_ratio?: number | null;
  quantity: number;
  selling_price: number;
  line_total: number;
}

interface InvoiceData {
  id: number;
  order_no: string;
  invoice_date: string | null;
  created_at: string;
  sub_total: number;
  delivery_charge: number;
  discount_amount: number;
  return_adjustment_amount: number;
  net_payable: number;
  paid_amount: number;
  due_amount: number;
  previous_due_amount: number;
  order_note?: string | null;
  cashier: string;
  customer?: {
    id: number;
    customer_id?: string;
    customer_name: string;
    mobile: string;
    address_details?: string | null;
  } | null;
  challan?: {
    id: number;
    challan_no: string;
    challan_date: string;
    status: string;
  } | null;
  details: InvoiceDetail[];
}

export default function InvoiceBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true);
        const res = await fetch(`/api/invoices/${id}`);
        const data = await res.json();
        if (res.ok && data.status === "success") {
          setInvoice(data.data);
        } else {
          setError(data.message || "Failed to load invoice bill");
        }
      } catch (err: any) {
        setError(err?.message || "Communication error loading invoice");
      } finally {
        setLoading(false);
      }
    }
    loadInvoice();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Convert number to Bangladeshi Taka words
  const numberToWords = (num: number): string => {
    const a = [
      "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
      "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ",
      "Seventeen ", "Eighteen ", "Nineteen "
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    const inWords = (n: number): string => {
      let str = "";
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + "Crore ";
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + "Lakh ";
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + "Thousand ";
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + "Hundred ";
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + " " + a[n % 10];
      } else {
        str += a[n];
      }
      return str;
    };

    const whole = Math.floor(Math.abs(num));
    if (whole === 0) return "Zero";
    return inWords(whole).trim();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600 mb-2" />
        <p className="text-sm font-semibold">Loading invoice bill details...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 text-center">
        <h2 className="text-lg font-bold text-rose-600 mb-2">Invoice Not Found</h2>
        <p className="text-xs text-slate-500 mb-4">{error || "Unable to display this invoice bill."}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const totalBill = invoice.sub_total;
  const netAmount = invoice.net_payable;
  const paidAmount = invoice.paid_amount;
  const todayDue = invoice.due_amount;
  const prevDue = invoice.previous_due_amount || 0;
  const grandTotalDue = todayDue + prevDue;

  return (
    <div className="font-sans">
      {/* 1. TOP ACTION BAR (Hidden when printing) */}
      <div className="no-print mb-4 flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-[#475569] hover:bg-[#334155] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoice List</span>
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-sm transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Print Bill</span>
        </button>
      </div>

      {/* 2. INVOICE SHEET PAPER (Full width) */}
      <div
        id="invoicePrintSheet"
        className="invoice-paper bg-white text-black p-4 sm:p-8 border border-slate-300 w-full shadow-md relative flex flex-col justify-between overflow-hidden"
        style={{
          fontFamily: "'Valley Sans', Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div className="sheet-top-content">
          {/* Header: Responsive on Mobile, Horizontal on Desktop & Print */}
          <div className="flex flex-col sm:flex-row print:flex-row justify-between items-center sm:items-start print:items-start gap-3 sm:gap-2 print:gap-0 pb-2 border-b border-slate-200">
            {/* Brand Logo & Name */}
            <div className="flex items-start gap-2.5">
              <img
                src="/logo.png"
                alt="Protikkha Electric"
                className="h-10 w-auto max-w-[170px] object-contain shrink-0"
              />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl print:text-2xl font-black tracking-wide text-[#0B3D91] m-0 leading-tight">
                  PROTIKKHA ELECTRIC
                </h1>
                <div className="text-[10px] sm:text-[11px] print:text-[11px] font-bold text-[#1E65A0] border-t border-[#0B3D91] pt-0.5 mt-0.5 whitespace-normal sm:whitespace-nowrap print:whitespace-nowrap">
                  Electrical Retail POS &amp; Inventory Management
                </div>
              </div>
            </div>

            {/* Middle "Bill" Badge */}
            <div className="self-center">
              <span className="px-4 sm:px-5 py-0.5 sm:py-1 print:py-1 rounded bg-[#0B3D91] text-white font-serif font-black text-base sm:text-lg print:text-lg tracking-wider">
                Bill
              </span>
            </div>

            {/* Office Info */}
            <div className="text-center sm:text-right print:text-right text-[11px] text-slate-800 leading-tight max-w-[240px]">
              <div><strong>Office:</strong> Success Super Market,</div>
              <div>Sadar Police Fari, Ataikula Road, Pabna.</div>
              <div><strong>Mobile:</strong> 01975-703216, 01715-842083</div>
              <div><strong>E-mail:</strong> info@protikkhaelectric.com</div>
            </div>
          </div>

          {/* Form Metadata Rows (Two-Column Dotted Grid matching MARSS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-x-6 gap-y-1.5 sm:gap-y-1 print:gap-y-1 my-3 text-[12px] text-black">
            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Bill No:</span>
              <span className="flex-1 border-b border-dotted border-black font-bold font-mono pl-1">
                #{invoice.order_no}
              </span>
            </div>

            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Bill Date:</span>
              <span className="flex-1 border-b border-dotted border-black font-semibold pl-1">
                {formatDate(invoice.invoice_date || invoice.created_at)}
              </span>
            </div>

            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Challan No:</span>
              <span className="flex-1 border-b border-dotted border-black font-semibold pl-1">
                {invoice.challan?.challan_no || "Cash In Hand"}
              </span>
            </div>

            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Delivery Date:</span>
              <span className="flex-1 border-b border-dotted border-black font-semibold pl-1">
                {formatDate(invoice.challan?.challan_date || invoice.invoice_date || invoice.created_at)}
              </span>
            </div>

            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Name of Customer:</span>
              <span className="flex-1 border-b border-dotted border-black font-bold pl-1 truncate">
                {invoice.customer?.customer_name || "General Customer"}
              </span>
            </div>

            <div className="flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Mob:</span>
              <span className="flex-1 border-b border-dotted border-black font-bold font-mono pl-1">
                {invoice.customer?.mobile || "N/A"}
              </span>
            </div>

            <div className="col-span-1 sm:col-span-2 print:col-span-2 flex items-end">
              <span className="font-semibold whitespace-nowrap mr-1">Address:</span>
              <span className="flex-1 border-b border-dotted border-black pl-1 truncate">
                {invoice.customer?.address_details || "N/A"}
              </span>
            </div>
          </div>

          {/* Items Table (Bordered 1px solid black matching screenshot 5) */}
          <div className="mt-2 mb-4 overflow-x-auto">
            <table className="w-full text-left border-collapse border border-black text-[12px] min-w-[500px] sm:min-w-0 print:min-w-0">
              <thead>
                <tr className="bg-slate-50 text-black font-bold text-center border-b border-black">
                  <th className="border border-black py-1 px-2 w-[50px]">Sl.No.</th>
                  <th className="border border-black py-1 px-3 text-left">Description</th>
                  <th className="border border-black py-1 px-2 w-[110px] text-right">Rate</th>
                  <th className="border border-black py-1 px-2 w-[70px] text-center">Qty.</th>
                  <th className="border border-black py-1 px-3 w-[120px] text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.details.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b border-black">
                    <td className="border border-black py-1 px-2 text-center font-medium">
                      {idx + 1}
                    </td>
                    <td className="border border-black py-1 px-3 font-semibold">
                      {item.product_name}
                      {(item.cable_size || item.current_rating || item.voltage_grade || item.wattage || item.gang_module) && (
                        <div className="flex flex-wrap gap-1 text-[10px] text-slate-700 mt-0.5">
                          {item.cable_size && <span>Size: {item.cable_size}</span>}
                          {item.voltage_grade && <span>| {item.voltage_grade}</span>}
                          {item.current_rating && <span>| {item.current_rating}</span>}
                          {item.wattage && <span>| {item.wattage}</span>}
                          {item.gang_module && <span>| {item.gang_module}</span>}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono">
                      {item.selling_price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="border border-black py-1 px-2 text-center font-bold whitespace-nowrap">
                      {formatElectricalQty(item.quantity, item)}
                    </td>
                    <td className="border border-black py-1 px-3 text-right font-mono font-bold">
                      {item.line_total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. BOTTOM SUMMARY SECTION */}
        <div className="sheet-bottom-content mt-auto pt-2">
          <div className="flex flex-col sm:flex-row print:flex-row items-start sm:items-end print:items-end justify-between gap-4 mb-6">
            {/* In Words */}
            <div className="w-full sm:w-[58%] print:w-[58%] text-[12px]">
              <div className="flex items-end">
                <span className="font-semibold whitespace-nowrap mr-1">In Words:</span>
                <span className="flex-1 border-b border-dotted border-black font-bold pl-1 italic">
                  {numberToWords(netAmount)} Taka Only
                </span>
              </div>
              {invoice.order_note && (
                <div className="mt-2 text-[11px] text-slate-700">
                  <strong>Note:</strong> {invoice.order_note}
                </div>
              )}
            </div>

            {/* Totals Table matching screenshot 5 */}
            <div className="w-full sm:w-[40%] print:w-[40%]">
              <table className="w-full border-collapse border border-black text-[12px]">
                <tbody>
                  <tr className="border-b border-black">
                    <td className="border border-black py-1 px-2 font-bold bg-slate-50 w-1/2">
                      Total Bill
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold w-1/2">
                      {totalBill.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black py-1 px-2 font-bold bg-slate-50">
                      Net Amount
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                      {netAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black py-1 px-2 font-bold bg-slate-50">
                      Paid Amount
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold text-emerald-800">
                      {paidAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black py-1 px-2 font-bold bg-slate-50">
                      Today Due
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold text-rose-700">
                      {todayDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black py-1 px-2 font-bold bg-slate-50">
                      Previous Due
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-bold">
                      {prevDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black py-1 px-2 font-black bg-slate-100">
                      Total Due
                    </td>
                    <td className="border border-black py-1 px-2 text-right font-mono font-black text-rose-800 text-[13px]">
                      {grandTotalDue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex justify-between items-end pt-8 pb-3 text-[12px] font-semibold text-black gap-4">
            <div className="w-36 sm:w-40 print:w-40 text-center border-t border-dotted border-black pt-1">
              Customer&apos;s Signature
            </div>
            <div className="w-36 sm:w-40 print:w-40 text-center border-t border-dotted border-black pt-1">
              Authorized Signature
            </div>
          </div>

          {/* Bottom Dual Color Accent Bar matching MARSS screenshot 5 */}
          <div className="flex h-3 w-[calc(100%+2rem)] sm:w-[calc(100%+4rem)] -mx-4 sm:-mx-8 -mb-4 sm:-mb-8 mt-4">
            <div className="w-1/2 bg-[#dc2626]"></div>
            <div className="w-1/2 bg-[#15803d]"></div>
          </div>
        </div>
      </div>

      {/* PRINT-SPECIFIC CSS */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          header,
          aside,
          nav,
          .no-print,
          footer,
          .dashboard-header,
          [data-sidebar] {
            display: none !important;
          }
          #invoicePrintSheet {
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
          }
          #invoicePrintSheet table thead {
            display: table-header-group !important;
          }
          #invoicePrintSheet table tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
