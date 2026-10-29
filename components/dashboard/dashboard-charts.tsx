"use client";

import { useState } from "react";
import { formatBdCurrency } from "@/lib/utils";
import { Sparkles, PieChart, TrendingUp, Info } from "lucide-react";

interface TrendPoint {
  date: string;
  sales: number;
  profit: number;
}

interface FinancialDist {
  monthlyCollection: number;
  customerDues: number;
  monthlyExpenses: number;
  netProfit: number;
  totalVolume: number;
}

interface DashboardChartsProps {
  trendData: TrendPoint[];
  financialDistribution: FinancialDist;
}

export function DashboardCharts({
  trendData,
  financialDistribution,
}: DashboardChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // 1. Calculate scales for Trend Chart (SVG)
  const width = 680;
  const height = 280;
  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(
    ...trendData.map((d) => Math.max(d.sales, d.profit)),
    50000
  );
  // Round up to nice number
  const roundMax = Math.ceil(maxVal / 50000) * 50000;
  const minVal = 0;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(val, roundMax));
    return paddingTop + chartHeight - ((clamped - minVal) / (roundMax - minVal)) * chartHeight;
  };

  const getX = (index: number) => {
    if (trendData.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (trendData.length - 1)) * chartWidth;
  };

  // Generate smooth cubic bezier SVG path
  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;

      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const salesPts = trendData.map((d, i) => ({ x: getX(i), y: getY(d.sales) }));
  const profitPts = trendData.map((d, i) => ({ x: getX(i), y: getY(d.profit) }));

  const salesLinePath = generateSmoothPath(salesPts);
  const profitLinePath = generateSmoothPath(profitPts);

  // Closed area for Sales
  const baseY = paddingTop + chartHeight;
  const salesAreaPath = salesPts.length > 0
    ? `${salesLinePath} L ${salesPts[salesPts.length - 1].x} ${baseY} L ${salesPts[0].x} ${baseY} Z`
    : "";

  // Y-axis ticks (5 ticks)
  const yTicks = [
    roundMax,
    roundMax * 0.75,
    roundMax * 0.5,
    roundMax * 0.25,
    0,
  ];

  // 2. Donut Chart Calculations
  const {
    monthlyCollection = 0,
    customerDues = 0,
    monthlyExpenses = 0,
    netProfit = 0,
    totalVolume = 1,
  } = financialDistribution;

  const validTotal = Math.max(1, monthlyCollection + customerDues + monthlyExpenses + netProfit);

  const segments = [
    { id: "collection", label: "Monthly Collection", value: monthlyCollection, color: "#8b5cf6" }, // Purple
    { id: "dues", label: "Customer Dues", value: customerDues, color: "#ef4444" }, // Red
    { id: "expenses", label: "Monthly Expenses", value: monthlyExpenses, color: "#f59e0b" }, // Amber/Orange
    { id: "profit", label: "Net Profit", value: netProfit, color: "#10b981" }, // Green
  ];

  // Donut geometry
  const radius = 95;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: Sales & Profit Trend (7 cols on LG) */}
      <div className="lg:col-span-7 bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        {/* Header & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white m-0 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Sales &amp; Profit Trend (Last 15 Days Sales &amp; Net Profit)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
              Daily sales revenue vs actual net profit
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Live Analytics Badge */}
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live Analytics
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-4 text-xs font-bold pt-2">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#10b981]" />
            <span className="text-slate-700 dark:text-slate-300">Total Sales</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#0284c7]" />
            <span className="text-slate-700 dark:text-slate-300">Net Profit</span>
          </div>
        </div>

        {/* SVG Curve Chart */}
        <div className="relative w-full overflow-hidden mt-1 select-none">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[300px] overflow-visible"
          >
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Ticks */}
            {yTicks.map((val, idx) => {
              const y = getY(val);
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    strokeDasharray="4 4"
                    className="text-slate-200 dark:text-slate-800"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-bold fill-slate-400 dark:fill-slate-500 font-mono"
                  >
                    ৳{val >= 1000 ? `${(val / 1000).toLocaleString("en-IN")}k` : val}
                  </text>
                </g>
              );
            })}

            {/* Area Fill for Total Sales */}
            {salesAreaPath && (
              <path d={salesAreaPath} fill="url(#salesGradient)" />
            )}

            {/* Total Sales Line (Green) */}
            {salesLinePath && (
              <path
                d={salesLinePath}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Net Profit Line (Blue) */}
            {profitLinePath && (
              <path
                d={profitLinePath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data Points on Hover */}
            {trendData.map((d, i) => {
              const sx = getX(i);
              const sy = getY(d.sales);
              const py = getY(d.profit);
              const isHovered = hoveredPoint === i;

              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Invisible wide column for easy hover */}
                  <rect
                    x={sx - chartWidth / (trendData.length * 2)}
                    y={paddingTop}
                    width={chartWidth / trendData.length}
                    height={chartHeight}
                    fill="transparent"
                  />

                  {/* Active vertical guide line */}
                  {isHovered && (
                    <line
                      x1={sx}
                      y1={paddingTop}
                      x2={sx}
                      y2={baseY}
                      stroke="#1E65A0"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      opacity="0.7"
                    />
                  )}

                  {/* Sales Dot */}
                  <circle
                    cx={sx}
                    cy={sy}
                    r={isHovered ? 5.5 : 3}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-all"
                  />

                  {/* Profit Dot */}
                  <circle
                    cx={sx}
                    cy={py}
                    r={isHovered ? 5.5 : 3}
                    fill="#0284c7"
                    stroke="#ffffff"
                    strokeWidth={isHovered ? 2 : 1}
                    className="transition-all"
                  />

                  {/* X-Axis Day Label */}
                  <text
                    x={sx}
                    y={baseY + 18}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${
                      isHovered
                        ? "fill-[#0B3D91] dark:fill-blue-400 font-black"
                        : "fill-slate-400 dark:fill-slate-500"
                    }`}
                  >
                    {d.date}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip popup */}
          {hoveredPoint !== null && trendData[hoveredPoint] && (
            <div
              style={{
                position: "absolute",
                top: "10px",
                left: `${Math.min(
                  width - 150,
                  Math.max(80, getX(hoveredPoint) * 0.95)
                )}px`,
              }}
              className="bg-slate-900/95 dark:bg-black/95 text-white p-2.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 z-20 pointer-events-none backdrop-blur-sm"
            >
              <div className="font-bold text-slate-300 border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
                <span>{trendData[hoveredPoint].date}</span>
                <span className="text-[10px] text-amber-400 font-mono">Daily Report</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-emerald-400 font-bold">
                <span>Sales:</span>
                <span>{formatBdCurrency(trendData[hoveredPoint].sales)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-blue-400 font-bold">
                <span>Profit:</span>
                <span>{formatBdCurrency(trendData[hoveredPoint].profit)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Financial Distribution Donut Chart (5 cols on LG) */}
      <div className="lg:col-span-5 bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
        {/* Header */}
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white m-0 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#1E65A0]" />
            Financial Distribution
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 m-0 mt-0.5">
            Breakdown of collections, dues &amp; profit
          </p>
        </div>

        {/* Circular Donut Diagram */}
        <div className="relative flex items-center justify-center my-3">
          <svg width="240" height="240" viewBox="0 0 240 240" className="transform -rotate-90">
            {/* Background Track */}
            <circle
              cx="120"
              cy="120"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              className="text-slate-100 dark:text-slate-800/80"
              strokeWidth={strokeWidth}
            />

            {/* Dynamic Segments */}
            {segments.map((seg) => {
              const fraction = Math.max(0, seg.value) / validTotal;
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedPercent * circumference);
              accumulatedPercent += fraction;

              return (
                <circle
                  key={seg.id}
                  cx="120"
                  cy="120"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={hoveredSegment === seg.id ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredSegment(seg.id)}
                  onMouseLeave={() => setHoveredSegment(null)}
                />
              );
            })}
          </svg>

          {/* Donut Center: Total Volume */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Total Volume
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {formatBdCurrency(validTotal)}
            </span>
          </div>
        </div>

        {/* Legend (Matching Image 1) */}
        <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2 border-t border-slate-100 dark:border-slate-800">
          {segments.map((seg) => {
            const pct = ((Math.max(0, seg.value) / validTotal) * 100).toFixed(1);
            return (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredSegment(seg.id)}
                onMouseLeave={() => setHoveredSegment(null)}
                className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                  hoveredSegment === seg.id
                    ? "bg-slate-100 dark:bg-slate-800 shadow-2xs"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="text-slate-700 dark:text-slate-300 truncate text-[11px]">
                    {seg.label}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-black text-slate-900 dark:text-white shrink-0 ml-1">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

