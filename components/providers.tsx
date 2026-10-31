"use client";

import React from "react";
import { ToastProvider } from "@/components/ui/toast";
import { ModalScrollLock } from "@/components/ui/modal-scroll-lock";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ModalScrollLock />
      {children}
    </ToastProvider>
  );
}
