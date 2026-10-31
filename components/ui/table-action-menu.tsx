"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

export interface TableActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  hidden?: boolean;
}

interface TableActionMenuProps {
  actions: TableActionItem[];
  headerLabel?: string;
}

export function TableActionMenu({ actions, headerLabel }: TableActionMenuProps) {
  const visibleActions = actions.filter((a) => !a.hidden);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; placeTop: boolean }>({
    top: 0,
    left: 0,
    placeTop: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 188;
    const menuHeight = visibleActions.length * 38 + (headerLabel ? 32 : 12);
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeTop = spaceBelow < menuHeight && rect.top > menuHeight;

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }

    setCoords({
      top: placeTop ? rect.top - 6 : rect.bottom + 6,
      left,
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
  }, [isOpen, visibleActions.length]);

  if (visibleActions.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!isOpen) updatePosition();
          setIsOpen((prev) => !prev);
        }}
        className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all shadow-2xs cursor-pointer mx-auto ${
          isOpen
            ? "border-[#1E65A0] bg-blue-50 dark:bg-blue-950/50 text-[#0B3D91] dark:text-blue-300 ring-2 ring-[#1E65A0]/20"
            : "border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] hover:text-[#1E65A0] dark:hover:text-blue-400"
        }`}
        title="Actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              transform: coords.placeTop ? "translateY(-100%)" : undefined,
              width: "188px",
              zIndex: 99999,
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          >
            {headerLabel && (
              <div className="px-2.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                {headerLabel}
              </div>
            )}

            {visibleActions.map((act, idx) => {
              const isDanger = act.variant === "danger";
              const isPrimary = act.variant === "primary";
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    act.onClick();
                  }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                    isDanger
                      ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      : isPrimary
                      ? "text-[#0B3D91] dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80"
                  }`}
                >
                  {act.icon && (
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        isDanger
                          ? "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400"
                          : "bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400"
                      }`}
                    >
                      {act.icon}
                    </span>
                  )}
                  <span className="truncate">{act.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

