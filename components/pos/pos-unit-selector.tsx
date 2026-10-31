"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
import type { ProductUnitOption } from "@/lib/electrical-units";

interface PosUnitSelectorProps {
  selectedUnit: string;
  baseSellPrice: number;
  options: ProductUnitOption[];
  onSelect: (unit: string, ratio: number) => void;
}

export function PosUnitSelector({
  selectedUnit,
  baseSellPrice,
  options,
  onSelect,
}: PosUnitSelectorProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placeTop: boolean }>({
    top: 0,
    left: 0,
    placeTop: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePos = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuWidth = 152;
    const estHeight = Math.min(options.length * 30 + 12, 210);
    const placeTop = window.innerHeight - rect.bottom < estHeight && rect.top > estHeight;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    const top = placeTop ? rect.top - 4 : rect.bottom + 4;
    setPos({ top, left, placeTop });
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const handleOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const handleScrollResize = () => updatePos();
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("scroll", handleScrollResize, true);
    window.addEventListener("resize", handleScrollResize);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("scroll", handleScrollResize, true);
      window.removeEventListener("resize", handleScrollResize);
    };
  }, [open, options.length]);

  if (!options || options.length <= 1) {
    return (
      <span className="h-[24px] px-1.5 rounded-md border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-[10px] font-bold text-[#0B3D91] dark:text-blue-300 inline-flex items-center shrink-0">
        {selectedUnit || "Pcs"}
      </span>
    );
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          if (!open) updatePos();
          setOpen((v) => !v);
        }}
        title="Change measurement unit"
        className={`h-[24px] px-1.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-0.5 shrink-0 transition-all cursor-pointer select-none ${
          open
            ? "border-[#1E65A0] bg-blue-50 dark:bg-blue-950/50 text-[#0B3D91] dark:text-blue-300 ring-1 ring-[#1E65A0]/25"
            : "border-[#cbd5e1] dark:border-[#334155] hover:border-[#1E65A0] bg-blue-50/50 dark:bg-slate-800 text-[#0B3D91] dark:text-blue-300"
        }`}
      >
        <span>{selectedUnit}</span>
        <ChevronDown className={`w-2.5 h-2.5 opacity-80 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              transform: pos.placeTop ? "translateY(-100%)" : undefined,
              width: "152px",
              zIndex: 99999,
            }}
            className="bg-white dark:bg-[#0f172a] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xl p-1 max-h-[210px] overflow-y-auto custom-select-scrollbar animate-in fade-in zoom-in-95 duration-100"
          >
            {options.map((opt) => {
              const active = opt.unit.toLowerCase() === selectedUnit.toLowerCase();
              const estRate = +(baseSellPrice * opt.ratio).toFixed(2);
              return (
                <button
                  key={opt.unit}
                  type="button"
                  onClick={() => {
                    onSelect(opt.unit, opt.ratio);
                    setOpen(false);
                  }}
                  className={`w-full px-2 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-colors cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  <span className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                    <span className={active ? "text-blue-100" : "text-slate-400"}>৳{estRate}</span>
                    {active && <Check className="w-3 h-3 stroke-[2.5]" />}
                  </span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

