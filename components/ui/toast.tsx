"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", title?: string, duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, message, type, title };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string, duration?: number) =>
      showToast(message, "success", title, duration),
    error: (message: string, title?: string, duration?: number) =>
      showToast(message, "error", title, duration),
    info: (message: string, title?: string, duration?: number) =>
      showToast(message, "info", title, duration),
  };

  return (
    <ToastContext.Provider value={{ showToast, toast }}>
      {children}
      {/* Toast Notification Container: Pinned to Bottom-Right */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none p-3 sm:p-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 py-2.5 px-4 min-h-[46px] rounded-2xl bg-[#090d16]/95 text-white shadow-2xl shadow-black/70 border backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
              t.type === "success"
                ? "border-emerald-500/40 border-l-4 border-l-emerald-500 shadow-emerald-950/20"
                : t.type === "error"
                ? "border-rose-500/40 border-l-4 border-l-rose-500 shadow-rose-950/20"
                : "border-sky-500/40 border-l-4 border-l-sky-500 shadow-sky-950/20"
            }`}
          >
            {/* Status Icon Badge */}
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                t.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : t.type === "error"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-sky-500/20 text-sky-400 border border-sky-500/30"
              }`}
            >
              {t.type === "success" && <CheckCircle2 className="w-4 h-4" />}
              {t.type === "error" && <AlertCircle className="w-4 h-4" />}
              {t.type === "info" && <Info className="w-4 h-4" />}
            </div>

            {/* Message Content */}
            <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
              {t.title && (
                <h5 className="text-xs font-bold tracking-tight mb-0.5 text-white">
                  {t.title}
                </h5>
              )}
              <p className="text-[13px] font-semibold leading-tight text-white m-0">
                {t.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 self-center"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
