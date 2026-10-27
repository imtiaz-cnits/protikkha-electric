"use client";

import { useState, useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { formatBdCurrency } from "@/lib/utils";
import { Barcode, Printer, Search, RefreshCw } from "lucide-react";
import { CustomSelect } from "@/components/ui/custom-select";

interface ProductOption {
  id: number;
  product_name: string;
  primary_code: string;
  all_codes: string[];
  sell_price: number;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  grade?: string | null;
}

export default function BarcodePrintPage() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [quantity, setQuantity] = useState(12);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.status === "success" && data.data) {
          setProducts(data.data);
          if (data.data.length > 0) {
            const first = data.data[0];
            setSelectedProduct(first);
            setBarcodeValue(first.primary_code || `PRD-${first.id}`);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    if (!barcodeValue) return;
    // Render barcodes across all SVG elements
    const svgs = document.querySelectorAll<SVGSVGElement>(".barcode-svg");
    svgs.forEach((svg) => {
      try {
        JsBarcode(svg, barcodeValue, {
          format: "CODE128",
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 11,
          font: "Valley Sans",
          margin: 4,
        });
      } catch {
        // fallback
      }
    });
  }, [barcodeValue, quantity, selectedProduct]);

  function handleSelectProduct(idStr: string) {
    const p = products.find((x) => String(x.id) === idStr);
    if (p) {
      setSelectedProduct(p);
      setBarcodeValue(p.primary_code || `PRD-${p.id}`);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-4">
      {/* Top Header - No print */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-slate-800 shadow-xs shrink-0">
            <Barcode className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white tracking-tight leading-none m-0 p-0">
              Product Barcode Sticker Print
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generate and print crisp barcode stickers for thermal label roll or A4 sticker sheets
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Stickers Now</span>
        </button>
      </div>

      {/* Control Card - No print */}
      <div className="print:hidden card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Product Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Product
            </label>
            <CustomSelect
              value={selectedProduct ? String(selectedProduct.id) : ""}
              onChange={(val) => handleSelectProduct(val)}
              options={products.map((p) => ({
                value: String(p.id),
                label: `${p.product_name} - ${p.primary_code}`,
              }))}
              placeholder="Search or Select Product..."
            />
          </div>

          {/* Barcode Code Override */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Barcode Value / Code
            </label>
            <input
              type="text"
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 font-mono"
            />
          </div>

          {/* Quantity of stickers */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Stickers Quantity
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600"
            />
          </div>
        </div>
      </div>

      {/* Printable Sheet Viewport */}
      <div
        ref={containerRef}
        className="card bg-white dark:bg-slate-900 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] p-6 shadow-xs print:p-0 print:border-none print:shadow-none"
      >
        <div className="print:hidden text-xs text-slate-400 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span>Sticker Sheet Live Preview ({quantity} labels)</span>
          <span className="text-emerald-600 font-bold">Label Size: ~50mm × 30mm</span>
        </div>

        {/* Labels Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 print:grid print:grid-cols-4 print:gap-2">
          {Array.from({ length: quantity }).map((_, i) => (
            <div
              key={i}
              className="border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white text-black text-center flex flex-col items-center justify-between shadow-2xs print:border-black print:shadow-none"
            >
              {/* Store Name Header */}
              <p className="text-[10px] font-black tracking-wider text-slate-900 uppercase leading-none">
                RUNA TRADERS
              </p>

              {/* Product Name */}
              <p className="text-[11px] font-bold text-slate-800 truncate max-w-full my-0.5">
                {selectedProduct?.product_name || "Product Item"}
              </p>
              {selectedProduct?.tile_size && (
                <p className="text-[9px] font-black text-rose-700 leading-none">
                  Size: {selectedProduct.tile_size} {selectedProduct.grade ? `(${selectedProduct.grade})` : ""}
                </p>
              )}

              {/* Barcode SVG */}
              <div className="my-0.5 flex justify-center">
                <svg className="barcode-svg max-w-full" />
              </div>

              {/* Price */}
              <p className="text-xs font-black text-emerald-800 leading-none">
                Price: {formatBdCurrency(selectedProduct?.sell_price || 0)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Print Specific CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .card,
          .card * {
            visibility: visible;
          }
          .card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
