"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X, Check } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface CustomSelectProps {
  options: Array<SelectOption | string>;
  value: string | number | undefined;
  onChange: (value: any) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  searchThreshold?: number; // default 5: if options > 5, show search; else hide
  name?: string;
  placement?: "auto" | "top" | "bottom"; // auto flips upwards near bottom
  matchTriggerWidth?: boolean; // match exact trigger width
  minPopoverWidth?: number;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option",
  className = "",
  disabled = false,
  required = false,
  searchThreshold = 8,
  name,
  placement = "auto",
  matchTriggerWidth = false,
  minPopoverWidth,
}: CustomSelectProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: "top" | "bottom";
  }>({
    top: 0,
    bottom: 0,
    left: 0,
    width: 0,
    maxHeight: 280,
    placement: "bottom",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      // Auto: if space below is less than 260px and there is more space above, flip to top
      targetPlacement = spaceBelow < 260 && spaceAbove > spaceBelow ? "top" : "bottom";
    }

    const maxPopoverHeight = 360;
    const availableHeight =
      targetPlacement === "top"
        ? Math.min(spaceAbove - 14, maxPopoverHeight)
        : Math.min(spaceBelow - 14, maxPopoverHeight);

    // Calculate popover width
    const minW = matchTriggerWidth ? 116 : (minPopoverWidth ?? 210);
    const popoverWidth = matchTriggerWidth ? Math.max(rect.width, 116) : Math.max(rect.width, minW);
    // Keep horizontally within viewport boundaries with 8px margin
    const safeLeft = matchTriggerWidth
      ? rect.left
      : Math.max(8, Math.min(rect.left, viewportWidth - popoverWidth - 8));

    setCoords({
      top: rect.bottom + 6,
      bottom: viewportHeight - rect.top + 6,
      left: safeLeft,
      width: popoverWidth,
      maxHeight: Math.max(availableHeight, 180),
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
      // If trigger is scrolled completely out of viewport, close smoothly
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        setIsOpen(false);
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

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => String(opt.value) === String(value));
  }, [normalizedOptions, value]);

  // Determine whether search box should be shown (more than searchThreshold items)
  const showSearch = normalizedOptions.length > searchThreshold;

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    );
  }, [normalizedOptions, searchQuery, showSearch]);

  // Close on click outside (checks both container button and portal popup)
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
      setSearchQuery("");
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Auto-focus search input when opened and search is enabled
  useEffect(() => {
    if (isOpen && showSearch) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, showSearch]);

  function handleSelect(optValue: string | number) {
    onChange(optValue);
    setIsOpen(false);
    setSearchQuery("");
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form submission compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value !== undefined ? String(value) : ""}
          required={required}
        />
      )}

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
            setSearchQuery("");
          }
        }}
        className={`w-full min-h-[42px] px-3.5 rounded-xl border-[1.5px] flex items-center justify-between gap-2 transition-all cursor-pointer shadow-2xs select-none text-left ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-[#cbd5e1] dark:border-[#334155]"
            : isOpen
            ? "border-rose-600 ring-2 ring-rose-600/20 bg-rose-50/20 dark:bg-rose-950/20"
            : "border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:border-rose-500 hover:bg-slate-50 dark:hover:bg-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 truncate">
          {selectedOption ? (
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {selectedOption.label}
              </span>
              {selectedOption.subLabel && (
                <span className="text-[11px] text-slate-400 dark:text-slate-400 ml-1.5">
                  ({selectedOption.subLabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-slate-400 font-normal truncate">
              {placeholder}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-rose-600" : ""
          }`}
        />
      </button>

      {/* DROPDOWN POPOVER VIA PORTAL - NEVER CLIPPED BY MODAL, NEVER CREATES SCROLLBAR */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              ...(coords.placement === "top"
                ? { bottom: `${coords.bottom}px` }
                : { top: `${coords.top}px` }),
              maxHeight: `${coords.maxHeight}px`,
              zIndex: 99999,
            }}
            className={`bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl p-2 flex flex-col select-none animate-in fade-in zoom-in-95 duration-100 ${
              coords.placement === "top" ? "origin-bottom" : "origin-top"
            }`}
          >
            {/* Scoped Scrollbar Styling to completely eliminate native OS stepper arrows */}
            <style>{`
              .custom-select-scrollbar::-webkit-scrollbar {
                width: 5px !important;
                height: 5px !important;
              }
              .custom-select-scrollbar::-webkit-scrollbar-track {
                background: transparent !important;
                margin: 4px 0 !important;
              }
              .custom-select-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1 !important;
                border-radius: 9999px !important;
              }
              .custom-select-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #94a3b8 !important;
              }
              .dark .custom-select-scrollbar::-webkit-scrollbar-thumb {
                background: #334155 !important;
              }
              .dark .custom-select-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #475569 !important;
              }
              .custom-select-scrollbar::-webkit-scrollbar-button {
                display: none !important;
                width: 0 !important;
                height: 0 !important;
              }
              @supports (-moz-appearance: none) {
                .custom-select-scrollbar {
                  scrollbar-width: thin !important;
                  scrollbar-color: #cbd5e1 transparent !important;
                }
                .dark .custom-select-scrollbar {
                  scrollbar-color: #334155 transparent !important;
                }
              }
            `}</style>

            {/* SEARCH SYSTEM - STRICTLY SHOWN ONLY IF OPTIONS > 8 */}
            {showSearch && (
              <div className="relative mb-2 shrink-0 px-0.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[34px] pl-8.5 pr-8 text-xs font-medium rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/30 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="w-4 h-4 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            {/* OPTIONS LIST WITH SLEEK CUSTOM SCROLLBAR */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1.5 custom-select-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="py-5 text-center text-xs text-slate-400 font-medium">
                  No matching options found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = String(opt.value) === String(value);
                  return (
                    <div
                      key={String(opt.value)}
                      onClick={() => handleSelect(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white font-bold shadow-xs"
                          : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="whitespace-nowrap font-medium">
                          {opt.label}
                        </span>
                        {opt.subLabel && (
                          <span
                            className={`text-[10px] whitespace-nowrap overflow-hidden text-ellipsis ${
                              isSelected ? "text-white/80" : "text-slate-400"
                            }`}
                          >
                            ({opt.subLabel})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {opt.badge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
