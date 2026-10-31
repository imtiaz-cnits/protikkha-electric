"use client";

import React from "react";
import { CustomSelect } from "./custom-select";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  showPageSizeSelector?: boolean;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100, 200, 500],
  className = "",
  showPageSizeSelector = true,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / (pageSize || 20)));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== safeCurrentPage) {
      onPageChange(page);
    }
  };

  return (
    <div
      className={`px-4 py-3 bg-white dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs ${className}`}
    >
      {/* Left side: Showing X to Y of Z & Page Size dropdown */}
      <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300 w-full md:w-auto justify-between md:justify-start">
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Show
            </span>
            <div className="w-[78px]">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  const newSize = Number(val);
                  onPageSizeChange(newSize);
                  onPageChange(1); // Reset to page 1 on page size change
                }}
                options={pageSizeOptions.map((opt) => ({
                  value: String(opt),
                  label: String(opt),
                }))}
                searchThreshold={99}
                matchTriggerWidth={true}
                placement="auto"
                className="[&_button]:!h-[32px] [&_button]:!min-h-[32px] [&_button]:!py-0 [&_button]:!px-2.5 [&_button]:!rounded-lg [&_button]:!text-xs [&_button]:!font-bold [&_button]:!bg-slate-50 dark:[&_button]:!bg-slate-800/90 [&_button]:!border-slate-300 dark:[&_button]:!border-slate-700 shadow-2xs"
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              entries
            </span>
          </div>
        )}

        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startItem}</span> to{" "}
          <span className="font-bold text-slate-800 dark:text-slate-200">{endItem}</span> of{" "}
          <span className="font-bold text-slate-900 dark:text-white">{totalItems}</span> entries
        </div>
      </div>

      {/* Right side: Pagination Navigation Buttons */}
      <div className="flex items-center gap-1 w-full md:w-auto justify-center md:justify-end overflow-x-auto py-0.5">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={safeCurrentPage <= 1}
          title="First Page"
          className="h-[32px] w-[32px] rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          title="Previous Page"
          className="h-[32px] px-2.5 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer font-bold text-xs shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1 mx-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-7 text-center text-slate-400 select-none font-bold text-xs"
                >
                  &hellip;
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => handlePageClick(pageNum)}
                className={`h-[32px] min-w-[32px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isActive
                    ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white shadow-xs font-extrabold border border-blue-700"
                    : "border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 shadow-2xs"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          title="Next Page"
          className="h-[32px] px-2.5 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer font-bold text-xs shadow-2xs"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          title="Last Page"
          className="h-[32px] w-[32px] rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

