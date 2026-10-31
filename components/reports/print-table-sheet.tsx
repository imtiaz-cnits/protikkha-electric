"use client";

import React, { useState } from "react";
import { Printer, FileDown, Loader2 } from "lucide-react";
import {
  PrintReportPayload,
  normalizePrintCell,
  downloadReportPdf,
  PrintCellColor,
} from "@/lib/report-pdf";

function colorClass(color: PrintCellColor): string {
  switch (color) {
    case "emerald":
      return "text-emerald-700";
    case "rose":
      return "text-rose-700";
    case "amber":
      return "text-amber-700";
    case "navy":
      return "text-[#0B3D91]";
    case "muted":
      return "text-slate-500";
    default:
      return "text-slate-900";
  }
}

/**
 * Clean Print-Only Sheet rendered inside printable pages.
 * Hidden on screen (`@media screen`); in `@media print` displays ONLY:
 * 1) Details block above the table
 * 2) Full unpaginated table with repeating `<thead>` across pages and 10px margin all around.
 */
export function PrintTableSheet({
  title,
  subtitle,
  metaItems,
  columns,
  rows,
  totalRow,
}: PrintReportPayload) {
  const printedAt = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="erp-print-sheet" aria-hidden="true">
      {/* 1. Details Above Table */}
      <div className="erp-print-header">
        <div className="erp-print-header-top">
          <div>
            <div className="erp-print-brand">PROTIKKHA ELECTRIC</div>
            <div className="erp-print-title">{title}</div>
            {subtitle && <div className="erp-print-subtitle">{subtitle}</div>}
          </div>
          <div className="erp-print-stamp">
            <div>
              <strong>Print Date:</strong> {printedAt}
            </div>
            <div>
              <strong>Total Rows:</strong> {rows.length}
            </div>
          </div>
        </div>

        {metaItems && metaItems.length > 0 && (
          <div className="erp-print-meta">
            {metaItems.map((m, idx) => (
              <span key={idx}>
                <strong>{m.label}:</strong> {m.value}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Multi-Page Table (thead repeats automatically on every printed page) */}
      <table className="erp-print-table">
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{
                  textAlign: col.align || "left",
                  width: col.width,
                }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: "center", padding: "14px", color: "#64748b" }}
              >
                No records found matching the current filter.
              </td>
            </tr>
          ) : (
            rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {columns.map((col, cIdx) => {
                  const cell = normalizePrintCell(row[cIdx] ?? "", col.align || "left");
                  return (
                    <td
                      key={cIdx}
                      className={`${colorClass(cell.color)} ${cell.bold ? "font-bold" : ""} ${
                        cell.mono ? "font-mono" : ""
                      }`}
                      style={{ textAlign: cell.align }}
                    >
                      <div>{cell.text}</div>
                      {cell.subText && <div className="erp-print-subtext">{cell.subText}</div>}
                    </td>
                  );
                })}
              </tr>
            ))
          )}

          {totalRow && rows.length > 0 && (
            <tr className="erp-print-total-row">
              {columns.map((col, cIdx) => {
                const cell = normalizePrintCell(totalRow[cIdx] ?? "", col.align || "left");
                return (
                  <td
                    key={cIdx}
                    className={`${colorClass(cell.color)} font-bold ${
                      cell.mono ? "font-mono" : ""
                    }`}
                    style={{ textAlign: cell.align }}
                  >
                    <div>{cell.text}</div>
                    {cell.subText && <div className="erp-print-subtext">{cell.subText}</div>}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Unified Print + Direct PDF Download Action Buttons for Reports & Analytics pages.
 */
export function ReportExportActions({
  payload,
}: {
  payload: PrintReportPayload;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      await downloadReportPdf(payload);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="no-print flex items-center gap-2 self-start sm:self-auto shrink-0">
      <button
        type="button"
        onClick={() => window.print()}
        title="Print Report"
        className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-[#1E65A0] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
      >
        <Printer className="w-4 h-4 text-[#1E65A0] dark:text-blue-400" />
        <span>Print</span>
      </button>

      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={downloading}
        title="Download PDF"
        className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <FileDown className="w-4 h-4" />
        )}
        <span>{downloading ? "Generating..." : "PDF"}</span>
      </button>
    </div>
  );
}

