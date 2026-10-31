"use client";

export interface PrintTableColumn {
  header: string;
  align?: "left" | "center" | "right";
  width?: string;
}

export type PrintCellColor = "default" | "emerald" | "rose" | "amber" | "navy" | "muted";

export interface PrintTableCellObject {
  text: string;
  subText?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  mono?: boolean;
  color?: PrintCellColor;
}

export type PrintTableCell = string | number | PrintTableCellObject;

export interface PrintMetaItem {
  label: string;
  value: string;
}

export interface PrintReportPayload {
  title: string;
  subtitle?: string;
  metaItems?: PrintMetaItem[];
  columns: PrintTableColumn[];
  rows: PrintTableCell[][];
  totalRow?: PrintTableCell[];
  filename?: string;
}

export function normalizePrintCell(
  cell: PrintTableCell,
  colAlign: "left" | "center" | "right" = "left"
): Required<Omit<PrintTableCellObject, "subText">> & { subText?: string } {
  if (typeof cell === "object" && cell !== null) {
    return {
      text: cell.text ?? "",
      subText: cell.subText,
      align: cell.align ?? colAlign,
      bold: Boolean(cell.bold),
      mono: Boolean(cell.mono),
      color: cell.color ?? "default",
    };
  }
  return {
    text: String(cell ?? ""),
    align: colAlign,
    bold: false,
    mono: false,
    color: "default",
  };
}

function getHexTextColor(color: PrintCellColor): string {
  switch (color) {
    case "emerald":
      return "#047857";
    case "rose":
      return "#be123c";
    case "amber":
      return "#b45309";
    case "navy":
      return "#0B3D91";
    case "muted":
      return "#64748b";
    default:
      return "#0f172a";
  }
}

function escapeHtml(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHeaderHtml(payload: PrintReportPayload, printedAt: string): string {
  const metaHtml =
    payload.metaItems && payload.metaItems.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:6px;padding-top:6px;border-top:1px dashed #cbd5e1;font-size:10.5px;color:#334155;">
          ${payload.metaItems
            .map(
              (m) =>
                `<span><strong style="color:#0f172a;">${escapeHtml(m.label)}:</strong> ${escapeHtml(
                  m.value
                )}</span>`
            )
            .join("")}
        </div>`
      : "";

  return `
    <div style="margin-bottom:8px;padding-bottom:7px;border-bottom:2px solid #0B3D91;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <div style="font-size:15px;font-weight:800;color:#0B3D91;letter-spacing:0.02em;line-height:1.2;">
            PROTIKKHA ELECTRIC
          </div>
          <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:2px;line-height:1.25;">
            ${escapeHtml(payload.title)}
          </div>
          ${
            payload.subtitle
              ? `<div style="font-size:10px;color:#475569;margin-top:1px;">${escapeHtml(
                  payload.subtitle
                )}</div>`
              : ""
          }
        </div>
        <div style="text-align:right;font-size:9.5px;color:#475569;line-height:1.4;white-space:nowrap;">
          <div><strong style="color:#0f172a;">Date:</strong> ${escapeHtml(printedAt)}</div>
          <div>Total Rows: <strong style="color:#0f172a;">${payload.rows.length}</strong></div>
        </div>
      </div>
      ${metaHtml}
    </div>
  `;
}

function buildTheadHtml(columns: PrintTableColumn[]): string {
  return `
    <thead>
      <tr style="background:#0B3D91;color:#ffffff;">
        ${columns
          .map(
            (col) => `
          <th style="padding:6px 7px;border:1px solid #0B3D91;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;text-align:${
            col.align || "left"
          };${col.width ? `width:${col.width};` : ""}">
            ${escapeHtml(col.header)}
          </th>`
          )
          .join("")}
      </tr>
    </thead>
  `;
}

function buildRowHtml(
  row: PrintTableCell[],
  columns: PrintTableColumn[],
  isTotal = false,
  stripe = false
): string {
  const bg = isTotal ? "#f1f5f9" : stripe ? "#f8fafc" : "#ffffff";
  const topBorder = isTotal ? "2px solid #0B3D91" : "1px solid #cbd5e1";

  return `
    <tr style="background:${bg};">
      ${columns
        .map((col, idx) => {
          const cell = normalizePrintCell(row[idx] ?? "", col.align || "left");
          const color = getHexTextColor(cell.color);
          const weight = isTotal || cell.bold ? 700 : 500;
          const fontFam = cell.mono
            ? "'Valley Sans', ui-monospace, SFMono-Regular, Menlo, monospace"
            : "'Valley Sans', 'Baloo Da 2', sans-serif";
          return `
            <td style="padding:5px 7px;border:1px solid #cbd5e1;border-top:${topBorder};font-size:10px;line-height:1.3;text-align:${
            cell.align
          };color:${color};font-weight:${weight};font-family:${fontFam};vertical-align:middle;word-break:break-word;">
              <div>${escapeHtml(cell.text)}</div>
              ${
                cell.subText
                  ? `<div style="font-size:8.8px;color:#64748b;font-weight:500;margin-top:1px;">${escapeHtml(
                      cell.subText
                    )}</div>`
                  : ""
              }
            </td>
          `;
        })
        .join("")}
    </tr>
  `;
}

/**
 * Directly generates & downloads a multi-page A4 PDF matching the exact Print layout:
 * - 10px margin all around every page
 * - Details header above the table on Page 1
 * - Repeating table heading (`<thead>`) automatically at the top of Page 2, 3, ...
 * - Full native browser shaping for Bangla (`Baloo Da 2`), `Valley Sans`, and `৳` symbol
 */
export async function downloadReportPdf(payload: PrintReportPayload): Promise<void> {
  const [{ toJpeg, toPng }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);

  const PAGE_W = 794; // A4 width at 96 DPI
  const PAGE_H = 1123; // A4 height at 96 DPI
  const PAD = 10; // Exact 10px gap on all 4 sides
  const USABLE_H = PAGE_H - PAD * 2;

  const printedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Offscreen pure-hex measurement & rendering stage (zero Tailwind oklch interference)
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;color:#0f172a;z-index:-9999;pointer-events:none;font-family:'Valley Sans','Baloo Da 2',sans-serif;";
  document.body.appendChild(host);

  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }

    const allRowEntries: { cells: PrintTableCell[]; isTotal: boolean }[] =
      payload.rows.length > 0
        ? payload.rows.map((cells) => ({ cells, isTotal: false }))
        : [
            {
              cells: payload.columns.map((_, idx) =>
                idx === 0 ? "No records found for the selected filter." : ""
              ),
              isTotal: false,
            },
          ];

    if (payload.totalRow && payload.rows.length > 0) {
      allRowEntries.push({ cells: payload.totalRow, isTotal: true });
    }

    const headerHtml = buildHeaderHtml(payload, printedAt);
    const theadHtml = buildTheadHtml(payload.columns);

    // Measure exact heights in the real browser layout engine
    const measureBox = document.createElement("div");
    measureBox.style.cssText = `width:${PAGE_W}px;padding:${PAD}px;box-sizing:border-box;background:#ffffff;`;
    measureBox.innerHTML = `
      <div id="m-header">${headerHtml}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        ${theadHtml}
        <tbody id="m-tbody">
          ${allRowEntries
            .map((entry, idx) =>
              buildRowHtml(entry.cells, payload.columns, entry.isTotal, idx % 2 === 1)
            )
            .join("")}
        </tbody>
      </table>
    `;
    host.appendChild(measureBox);

    const headerEl = measureBox.querySelector("#m-header") as HTMLElement;
    const theadEl = measureBox.querySelector("thead") as HTMLElement;
    const trEls = Array.from(measureBox.querySelectorAll("#m-tbody > tr")) as HTMLElement[];

    const headerH = (headerEl?.offsetHeight || 64) + 8;
    const theadH = theadEl?.offsetHeight || 28;
    const contBarH = 20;
    const rowHeights = trEls.map((tr) => Math.max(22, tr.offsetHeight || 26));

    // Paginate rows cleanly so no row clips at the bottom and thead repeats on every new page
    const pages: { items: { cells: PrintTableCell[]; isTotal: boolean; globalIdx: number }[] }[] = [];
    let cursor = 0;

    while (cursor < allRowEntries.length) {
      const isFirstPage = pages.length === 0;
      const budget = USABLE_H - (isFirstPage ? headerH : contBarH) - theadH - 4;
      let used = 0;
      const bucket: { cells: PrintTableCell[]; isTotal: boolean; globalIdx: number }[] = [];

      while (cursor < allRowEntries.length) {
        const rh = rowHeights[cursor];
        if (bucket.length > 0 && used + rh > budget) {
          break;
        }
        bucket.push({ ...allRowEntries[cursor], globalIdx: cursor });
        used += rh;
        cursor++;
      }

      pages.push({ items: bucket });
    }

    host.removeChild(measureBox);

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [PAGE_W, PAGE_H],
      hotfixes: ["px_scaling"],
    });

    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const pageSheet = document.createElement("div");
      pageSheet.style.cssText = `width:${PAGE_W}px;height:${PAGE_H}px;padding:${PAD}px;box-sizing:border-box;background:#ffffff;color:#0f172a;font-family:'Valley Sans','Baloo Da 2',sans-serif;overflow:hidden;`;

      const topSection =
        pIdx === 0
          ? headerHtml
          : `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;padding-bottom:3px;border-bottom:1px solid #cbd5e1;font-size:9.5px;color:#475569;">
              <span><strong style="color:#0B3D91;">PROTIKKHA ELECTRIC</strong> — ${escapeHtml(
                payload.title
              )}</span>
              <span>Page ${pIdx + 1} of ${pages.length}</span>
            </div>`;

      pageSheet.innerHTML = `
        ${topSection}
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          ${theadHtml}
          <tbody>
            ${pages[pIdx].items
              .map((item) =>
                buildRowHtml(
                  item.cells,
                  payload.columns,
                  item.isTotal,
                  item.globalIdx % 2 === 1
                )
              )
              .join("")}
          </tbody>
        </table>
      `;

      host.appendChild(pageSheet);

      let dataUrl: string;
      const renderOptions = {
        quality: 0.96,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: PAGE_W,
        height: PAGE_H,
        cacheBust: false,
        skipFonts: true,
        fontEmbedCSS: "",
      };

      try {
        dataUrl = await toJpeg(pageSheet, renderOptions);
      } catch (jpegErr) {
        dataUrl = await toPng(pageSheet, renderOptions);
      }

      if (pIdx > 0) {
        pdf.addPage([PAGE_W, PAGE_H], "portrait");
      }
      pdf.addImage(dataUrl, "JPEG", 0, 0, PAGE_W, PAGE_H);

      host.removeChild(pageSheet);
    }

    const safeFile =
      (payload.filename || payload.title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "protikkha-report";

    const todayStr = new Date().toISOString().slice(0, 10);
    pdf.save(`${safeFile}-${todayStr}.pdf`);
  } finally {
    if (host.parentNode) {
      host.parentNode.removeChild(host);
    }
  }
}

