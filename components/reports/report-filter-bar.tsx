"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, Check, ChevronDown, RotateCcw, Search, X } from "lucide-react";
import { CustomDatePicker } from "@/components/ui/date-picker";
import {
  ReportDatePreset,
  detectMatchingPreset,
  getPresetDateRange,
} from "@/lib/report-date-utils";

const PRESET_OPTIONS: { value: Exclude<ReportDatePreset, "">; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "7 Days" },
  { value: "month", label: "This Month" },
];

interface ReportFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  searchPlaceholder?: string;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  onClear: () => void;
  hasExtraActiveFilter?: boolean;
  extraFilters?: React.ReactNode;
}

export function ReportFilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search report records...",
  startDate,
  endDate,
  onDateRangeChange,
  onClear,
  hasExtraActiveFilter = false,
  extraFilters,
}: ReportFilterBarProps) {
  const [selectedPreset, setSelectedPreset] = useState<ReportDatePreset>(() =>
    detectMatchingPreset(startDate, endDate)
  );
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placeTop: boolean }>({
    top: 0,
    left: 0,
    width: 156,
    placeTop: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep preset badge synced whenever startDate / endDate change externally or via calendar
  useEffect(() => {
    setSelectedPreset(detectMatchingPreset(startDate, endDate));
  }, [startDate, endDate]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 160);
    const menuHeight = 184;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeTop = spaceBelow < menuHeight && rect.top > menuHeight;

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    if (left < 10) left = 10;

    setCoords({
      top: placeTop ? rect.top - 6 : rect.bottom + 6,
      left,
      width: menuWidth,
      placeTop,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScroll = () => updatePosition();
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
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

  const handleSelectPreset = (preset: Exclude<ReportDatePreset, "">) => {
    const { startDate: nextStart, endDate: nextEnd } = getPresetDateRange(preset);
    setSelectedPreset(preset);
    onDateRangeChange(nextStart, nextEnd);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    setSelectedPreset("");
    setIsOpen(false);
    onClear();
  };

  const activeOption = PRESET_OPTIONS.find((o) => o.value === selectedPreset);
  const isPresetActive = Boolean(activeOption);
  const hasAnyFilter = Boolean(search.trim() || startDate || endDate || hasExtraActiveFilter);

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs">
      {/* Left: Search + Optional Module Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-[38px] pl-9 pr-8 rounded-xl bg-slate-50 dark:bg-[#1e293b] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#1E65A0] focus:ring-2 focus:ring-[#1E65A0]/20 font-medium transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {extraFilters && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {extraFilters}
          </div>
        )}
      </div>

      {/* Right: From Date to To Date + Custom Preset Dropdown (Active Blue) + Clear Button */}
      <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
        <div className="flex items-center gap-1.5">
          <div className="w-[132px]">
            <CustomDatePicker
              value={startDate}
              onChange={(d) => onDateRangeChange(d, endDate)}
              placeholder="From Date"
            />
          </div>
          <span className="text-xs font-semibold text-slate-400 select-none">to</span>
          <div className="w-[132px]">
            <CustomDatePicker
              value={endDate}
              onChange={(d) => onDateRangeChange(startDate, d)}
              placeholder="To Date"
            />
          </div>
        </div>

        {/* Custom Preset Dropdown + Clear Button on Right */}
        <div className="flex items-center gap-1.5">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => {
              if (!isOpen) updatePosition();
              setIsOpen((prev) => !prev);
            }}
            className={`h-[38px] min-w-[136px] px-3 rounded-xl border-[1.5px] text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${isPresetActive
                ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white border-[#0B3D91] shadow-xs"
                : isOpen
                  ? "bg-white dark:bg-[#1e293b] text-[#0B3D91] dark:text-blue-300 border-[#1E65A0] ring-2 ring-[#1E65A0]/20"
                  : "bg-white dark:bg-[#1e293b] text-slate-700 dark:text-slate-200 border-[#cbd5e1] dark:border-[#334155] hover:border-[#1E65A0]"
              }`}
          >
            <span className="flex items-center gap-1.5 truncate">
              <Calendar
                className={`w-3.5 h-3.5 shrink-0 ${isPresetActive ? "text-white" : "text-[#1E65A0] dark:text-blue-400"
                  }`}
              />
              <span className="truncate">{activeOption ? activeOption.label : "Quick Filter"}</span>
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""
                } ${isPresetActive ? "text-white/90" : "text-slate-400"}`}
            />
          </button>

          {/* Clear Button immediately to the right of the dropdown */}
          <button
            type="button"
            onClick={handleClearAll}
            title="Reset date & search filters"
            className={`h-[38px] px-3 rounded-xl border-[1.5px] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${hasAnyFilter
                ? "border-[#cbd5e1] dark:border-[#334155] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] hover:text-[#0B3D91] dark:hover:text-blue-300 shadow-2xs"
                : "border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] text-slate-400 dark:text-slate-500 hover:border-[#1E65A0] hover:text-slate-700 dark:hover:text-slate-300"
              }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              transform: coords.placeTop ? "translateY(-100%)" : undefined,
              zIndex: 99999,
            }}
            className="rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100"
          >
            {PRESET_OPTIONS.map((opt) => {
              const active = selectedPreset === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelectPreset(opt.value)}
                  className={`w-full h-[34px] px-3 rounded-xl text-xs flex items-center justify-between transition-all cursor-pointer ${active
                      ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold shadow-2xs"
                      : "text-slate-700 dark:text-slate-200 font-semibold hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#0B3D91] dark:hover:text-blue-300"
                    }`}
                >
                  <span>{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}

