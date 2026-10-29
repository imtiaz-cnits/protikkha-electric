"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  const [year, setYear] = useState<number>(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // Strict Rule: POS screen fills 100vh without bottom copyright footer; all other pages show footer.
  if (pathname === "/pos" || pathname?.startsWith("/pos/")) {
    return null;
  }

  return (
    <footer className="mt-auto py-3 text-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
      &copy; {year} PROTIKKHA ELECTRIC | Software By:{" "}
      <a
        href="https://www.codenextit.com"
        target="_blank"
        rel="noreferrer"
        className="text-[#1E65A0] hover:text-[#0B3D91] dark:text-blue-400 font-bold hover:underline transition-colors"
      >
        CodeNext IT
      </a>
    </footer>
  );
}
