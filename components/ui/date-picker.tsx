"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

export interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  hideChevron?: boolean;
  placement?: "auto" | "top" | "bottom";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Select Date",
  className = "",
  disabled = false,
  allowClear = false,
  hideChevron = false,
  placement = "auto",
}: DatePickerProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    placement: "top" | "bottom";
  }>({
    top: 0,
    bottom: 0,
    left: 0,
    placement: "bottom",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse currently selected date safely
  const parsedSelected = value ? new Date(value + "T00:00:00") : new Date();
  const isValidDate = !isNaN(parsedSelected.getTime());

  // Navigation view state (Month & Year)
  const [viewYear, setViewYear] = useState<number>(
    isValidDate ? parsedSelected.getFullYear() : new Date().getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isValidDate ? parsedSelected.getMonth() : new Date().getMonth()
  );

  // Mode: "days" | "months" | "years"
  const [viewMode, setViewMode] = useState<"days" | "months" | "years">("days");

  // Keep view aligned with value when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + "T00:00:00");
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Calculate precise floating viewport position
  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let targetPlacement: "top" | "bottom" = "bottom";
    if (placement === "top") {
      targetPlacement = "top";
    } else if (placement === "bottom") {
      targetPlacement = "bottom";
    } else {
      // Calendar height is ~340px. Open upwards if space below is limited and space above is greater
      targetPlacement = spaceBelow < 340 && spaceAbove > spaceBelow ? "top" : "bottom";
    }

    const popupWidth = 295;
    // Align with trigger button:
    // If trigger button is narrow (like 140px in POS), right-align to button
    // If trigger button is wide (like full-width modal input), left-align to input
    let safeLeft = rect.width < popupWidth ? rect.right - popupWidth : rect.left;
    // Clamp within viewport boundaries with 10px margin
    safeLeft = Math.max(10, Math.min(safeLeft, viewportWidth - popupWidth - 10));

    setCoords({
      top: rect.bottom + 6,
      bottom: viewportHeight - rect.top + 6,
      left: safeLeft,
      placement: targetPlacement,
    });
  };

  // Recalculate on window resize / scroll (capture phase catches modal scroll)
  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        setIsOpen(false);
        setViewMode("days");
        return;
      }
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, placement]);

  // Close on outside click (checks both container button and portal popup)
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
      setViewMode("days");
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const today = new Date();
  const todayStr = formatDate(today);

  function formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function formatDisplayDate(dateStr: string): string {
    if (!dateStr) return placeholder;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }

  function handlePrev() {
    if (viewMode === "days") {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    } else if (viewMode === "months") {
      setViewYear((y) => y - 1);
    } else if (viewMode === "years") {
      setViewYear((y) => y - 12);
    }
  }

  function handleNext() {
    if (viewMode === "days") {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    } else if (viewMode === "months") {
      setViewYear((y) => y + 1);
    } else if (viewMode === "years") {
      setViewYear((y) => y + 12);
    }
  }

  function handleSelectDate(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    const formatted = `${viewYear}-${m}-${d}`;
    onChange(formatted);
    setIsOpen(false);
    setViewMode("days");
  }

  function handleSelectToday() {
    onChange(todayStr);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
    setViewMode("days");
  }

  function handleSelectYesterday() {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    onChange(formatDate(yest));
    setViewYear(yest.getFullYear());
    setViewMonth(yest.getMonth());
    setIsOpen(false);
    setViewMode("days");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setIsOpen(false);
  }

  // Days in month calculation
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const prevMonthDays = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDays.push(daysInPrevMonth - i);
  }

  const currentMonthDays = [];
  for (let i = 1; i <= daysInCurrentMonth; i++) {
    currentMonthDays.push(i);
  }

  const remainingSlots = 42 - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = [];
  for (let i = 1; i <= remainingSlots; i++) {
    nextMonthDays.push(i);
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* TRIGGER BUTTON - CLICK ANYWHERE TO OPEN */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              updatePosition();
            }
            setIsOpen(!isOpen);
            setViewMode("days");
          }
        }}
        className={`w-full min-h-[38px] ${hideChevron ? "px-2.5" : "px-3"} rounded-xl border-[1.5px] flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-2xs select-none text-left ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-[#cbd5e1] dark:border-[#334155]"
            : isOpen
            ? "border-rose-600 ring-2 ring-rose-600/20 bg-rose-50/20 dark:bg-rose-950/20"
            : "border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        }`}
        title="Click anywhere to pick date"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <CalendarIcon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span
            className={`text-[11px] font-bold tracking-tight whitespace-nowrap ${
              value
                ? "text-slate-800 dark:text-slate-100 font-mono"
                : "text-slate-400 font-normal"
            }`}
          >
            {formatDisplayDate(value)}
          </span>
        </div>

        {allowClear && value && !disabled && (
          <span
            onClick={handleClear}
            className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer mr-0.5 shrink-0"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* CALENDAR POPUP VIA PORTAL - NEVER CLIPPED BY MODAL, NEVER CUT OFF */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: "295px",
              ...(coords.placement === "top"
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              zIndex: 99999,
            }}
            className={`bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl p-3.5 select-none animate-in fade-in zoom-in-95 duration-100 ${
              coords.placement === "top" ? "origin-bottom" : "origin-top"
            }`}
          >
            {/* Header Controls */}
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrev}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month & Year Title Button */}
              <button
                type="button"
                onClick={() => {
                  if (viewMode === "days") setViewMode("months");
                  else if (viewMode === "months") setViewMode("years");
                  else setViewMode("days");
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {viewMode === "years"
                    ? `${viewYear - 6} - ${viewYear + 5}`
                    : `${MONTH_NAMES[viewMonth]} ${viewYear}`}
                </span>
                <span className="text-[10px] text-rose-600 font-mono">▼</span>
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Mode 1: Month Grid View */}
            {viewMode === "months" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {MONTH_NAMES.map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setViewMonth(idx);
                      setViewMode("days");
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      viewMonth === idx
                        ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white shadow-xs"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {m.slice(0, 3)}
                  </button>
                ))}
              </div>
            )}

            {/* Mode 2: Years Grid View */}
            {viewMode === "years" && (
              <div className="grid grid-cols-3 gap-2 py-2">
                {Array.from({ length: 12 }, (_, i) => viewYear - 6 + i).map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setViewYear(y);
                      setViewMode("months");
                    }}
                    className={`py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      viewYear === y
                        ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white shadow-xs"
                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* Mode 3: Normal Calendar Days View */}
            {viewMode === "days" && (
              <>
                {/* Week Day Labels */}
                <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                  {WEEK_DAYS.map((w, idx) => (
                    <span
                      key={w}
                      className={`text-[10px] font-bold ${
                        idx === 5 || idx === 6
                          ? "text-rose-500"
                          : "text-slate-400 dark:text-slate-400"
                      }`}
                    >
                      {w}
                    </span>
                  ))}
                </div>

                {/* Day Numbers Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {/* Prev Month Days */}
                  {prevMonthDays.map((d) => (
                    <button
                      key={`prev-${d}`}
                      type="button"
                      disabled
                      className="h-7 w-7 mx-auto rounded-lg text-[11px] font-medium text-slate-300 dark:text-slate-600 flex items-center justify-center cursor-not-allowed opacity-50"
                    >
                      {d}
                    </button>
                  ))}

                  {/* Current Month Days */}
                  {currentMonthDays.map((d) => {
                    const mStr = String(viewMonth + 1).padStart(2, "0");
                    const dStr = String(d).padStart(2, "0");
                    const dateFullStr = `${viewYear}-${mStr}-${dStr}`;
                    const isSelected = dateFullStr === value;
                    const isToday = dateFullStr === todayStr;

                    return (
                      <button
                        key={`curr-${d}`}
                        type="button"
                        onClick={() => handleSelectDate(d)}
                        className={`h-7 w-7 mx-auto rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white font-bold shadow-xs scale-105"
                            : isToday
                            ? "border border-rose-500 text-rose-600 font-bold bg-rose-50/50 dark:bg-rose-950/30"
                            : "hover:bg-rose-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}

                  {/* Next Month Days */}
                  {nextMonthDays.map((d) => (
                    <button
                      key={`next-${d}`}
                      type="button"
                      disabled
                      className="h-7 w-7 mx-auto rounded-lg text-[11px] font-medium text-slate-300 dark:text-slate-600 flex items-center justify-center cursor-not-allowed opacity-50"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Quick Actions Footer */}
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectToday}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold border border-rose-200/60 dark:border-rose-900/60 transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleSelectYesterday}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                >
                  Yesterday
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setViewMode("days");
                }}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
