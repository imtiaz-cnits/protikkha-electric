export type ReportDatePreset = "" | "today" | "yesterday" | "7days" | "month";

export function formatLocalYmd(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getPresetDateRange(
  preset: Exclude<ReportDatePreset, "">
): { startDate: string; endDate: string } {
  const now = new Date();
  const todayStr = formatLocalYmd(now);

  if (preset === "today") {
    return { startDate: todayStr, endDate: todayStr };
  }

  if (preset === "yesterday") {
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yStr = formatLocalYmd(y);
    return { startDate: yStr, endDate: yStr };
  }

  if (preset === "7days") {
    const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    return { startDate: formatLocalYmd(past), endDate: todayStr };
  }

  // "month" -> This Month (1st of current month to today)
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: formatLocalYmd(firstDay), endDate: todayStr };
}

export function detectMatchingPreset(
  startDate: string,
  endDate: string
): ReportDatePreset {
  if (!startDate || !endDate) return "";
  const presets: Exclude<ReportDatePreset, "">[] = [
    "today",
    "yesterday",
    "7days",
    "month",
  ];
  for (const p of presets) {
    const range = getPresetDateRange(p);
    if (range.startDate === startDate && range.endDate === endDate) {
      return p;
    }
  }
  return "";
}

export function parseLocalStartOfDay(ymd?: string | null): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return undefined;
  const [y, m, d] = ymd.trim().split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export function parseLocalEndOfDay(ymd?: string | null): Date | undefined {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd.trim())) return undefined;
  const [y, m, d] = ymd.trim().split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999);
}

export function buildDateRangeFilter(
  startDateStr?: string | null,
  endDateStr?: string | null
): { gte?: Date; lte?: Date } | undefined {
  const start = parseLocalStartOfDay(startDateStr);
  const end = parseLocalEndOfDay(endDateStr);
  if (!start && !end) return undefined;
  const filter: { gte?: Date; lte?: Date } = {};
  if (start) filter.gte = start;
  if (end) filter.lte = end;
  return filter;
}

