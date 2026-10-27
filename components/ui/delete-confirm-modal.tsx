"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Trash2, Loader2, X } from "lucide-react";

export interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  recordIdentifier?: string | null;
  itemName?: string | null;
  warningMessage?: string;
  description?: string;
  isLoading?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  error?: string | null;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  recordIdentifier,
  itemName,
  warningMessage,
  description,
  isLoading,
  loading,
  errorMessage,
  error,
}: DeleteConfirmModalProps) {
  const displayIdentifier = recordIdentifier ?? itemName;
  const displayWarning = warningMessage ?? description ?? "Are you sure you want to delete this record? This action cannot be undone.";
  const displayLoading = isLoading ?? loading ?? false;
  const displayError = errorMessage ?? error ?? null;

  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  // Sync external error message
  useEffect(() => {
    setInternalError(displayError);
  }, [displayError]);

  // Reset internal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInternalLoading(false);
      setInternalError(displayError || null);
    }
  }, [isOpen, displayError]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading && !internalLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, internalLoading, onClose]);

  if (!isOpen) return null;

  const busy = displayLoading || internalLoading;

  const handleConfirm = async () => {
    if (busy) return;
    try {
      setInternalLoading(true);
      setInternalError(null);
      await onConfirm();
    } catch (err: any) {
      setInternalError(err?.message || "Failed to delete record. Please try again.");
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-rose-200 dark:border-rose-900/50 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        {/* Sticky Header with Red / Burgundy Accent */}
        <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#7f1d1d] px-5 py-3.5 flex items-center justify-between text-white shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Trash2 className="w-4 h-4 text-rose-200" />
            <h3 id="delete-dialog-title" className="tracking-tight text-white m-0">
              {title}
            </h3>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 text-center">
          {/* Warning Icon Badge */}
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
            <AlertTriangle className="w-7 h-7 animate-pulse" />
          </div>

          {/* Record Identifier */}
          {displayIdentifier && (
            <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 truncate inline-block max-w-full">
              {displayIdentifier}
            </div>
          )}

          {/* Primary Prompt */}
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
            Are you sure?
          </h4>

          {/* Warning Message */}
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4 max-w-xs mx-auto">
            {displayWarning}
          </p>

          {/* Error Message Alert (if deletion fails, keeps modal open with error) */}
          {internalError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-semibold text-left flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-snug">{internalError}</div>
            </div>
          )}

          {/* Action Buttons: Explicit "No, Cancel" and "Yes, Delete" */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="w-full h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              No, Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleConfirm}
              className="w-full h-10 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-700 to-red-700 hover:from-red-700 hover:to-rose-800 text-white text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {busy ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Yes, Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
