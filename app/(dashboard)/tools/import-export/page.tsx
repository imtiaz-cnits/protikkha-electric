"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  Layers,
  Users,
  Tag,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function ImportExportHubPage() {
  const { toast } = useToast();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  function downloadTemplate(type: string) {
    let headers: string[] = [];
    let sampleRow: string[] = [];
    let filename = "";

    if (type === "products") {
      filename = "protikkha_products_template.csv";
      headers = [
        "product_name",
        "barcode",
        "category",
        "brand",
        "unit",
        "sell_price",
        "wholesale_price",
        "cost_price",
        "quantity",
        "spec_type",
        "cable_size",
        "current_rating",
        "wattage",
      ];
      sampleRow = [
        '"BBS 2.5 RM BYA Red Wire"',
        '"89411002001"',
        '"Wires & Cables"',
        '"BBS Cables"',
        '"Meter"',
        "48",
        "45",
        "42",
        "500",
        "CABLE",
        '"2.5 RM BYA"',
        '""',
        '""',
      ];
    } else if (type === "price-lists") {
      filename = "protikkha_price_lists_template.csv";
      headers = ["product_code", "product_name", "cost_price", "retail_price", "wholesale_price"];
      sampleRow = ['"PE-00019"', '"BBS 1.5 RM BYA Red Wire"', "42", "48", "45"];
    } else {
      filename = "protikkha_contractors_template.csv";
      headers = ["name", "mobile", "specialization", "commission_percent"];
      sampleRow = ['"Md. Rafiqul Islam"', '"01712334455"', '"House Wiring Specialist"', "5.0"];
    }

    const content = "\uFEFF" + [headers.join(","), sampleRow.join(",")].join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloaded ${filename}`);
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!importFile) {
      toast.error("Please select a CSV file to upload");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", importFile);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        setImportResult(data);
        toast.success(data.message || "Import processed successfully!");
      } else {
        toast.error(data.message || "Import encountered errors");
      }
    } catch {
      toast.error("Network error during file upload");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
            Data Import & Export Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Batch import product catalogs, price lists, contractor directories, and export structured sheets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upload Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4 text-[#1E65A0]" />
            Upload Catalog CSV
          </h3>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-2 hover:border-[#1E65A0] transition cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-xs text-slate-600 dark:text-slate-300">
                <label className="font-bold text-[#1E65A0] cursor-pointer hover:underline">
                  Click to select CSV file
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">UTF-8 comma separated (.csv) up to 10MB</p>
              </div>
              {importFile && (
                <span className="inline-block px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-mono font-bold">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={importing || !importFile}
              className="w-full h-[42px] rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>Process Batch Import</span>
            </button>
          </form>

          {importResult && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {importResult.message || "Import finished successfully!"}
              </span>
              {importResult.createdCount !== undefined && (
                <p className="text-slate-500">
                  Added: {importResult.createdCount} products • Skipped: {importResult.skippedCount || 0}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Download Templates Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-[#0B3D91] dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-600" />
            Download Import Templates
          </h3>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-[#1E65A0]" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">Electrical Products Template</h4>
                  <p className="text-[10px] text-slate-400">Includes cable gauges, current ratings, and units</p>
                </div>
              </div>
              <button
                onClick={() => downloadTemplate("products")}
                className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E65A0]"
              >
                CSV
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-2.5">
                <Tag className="w-5 h-5 text-amber-500" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">Price List Batch Template</h4>
                  <p className="text-[10px] text-slate-400">Retail rates and contractor wholesale prices</p>
                </div>
              </div>
              <button
                onClick={() => downloadTemplate("price-lists")}
                className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E65A0]"
              >
                CSV
              </button>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white">Contractors Directory Template</h4>
                  <p className="text-[10px] text-slate-400">Electrician contact details and commission %</p>
                </div>
              </div>
              <button
                onClick={() => downloadTemplate("contractors")}
                className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-[#1E65A0]"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
