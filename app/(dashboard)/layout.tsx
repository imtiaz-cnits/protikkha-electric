"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem("sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }

    const verifySession = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch("/api/auth/me", {
          headers,
          cache: "no-store",
        });
        if (!res.ok) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");
          window.location.replace("/login");
          return;
        }
        const json = await res.json().catch(() => null);
        if (json?.user) {
          localStorage.setItem("user", JSON.stringify(json.user));
          if (json.user.role) localStorage.setItem("role", json.user.role);
        }
        if (active) setAuthReady(true);
      } catch {
        window.location.replace("/login");
      }
    };

    verifySession();
    return () => {
      active = false;
    };
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem("sidebar_collapsed", String(next));
        } catch {
          // ignore
        }
        return next;
      });
    }
  };

  if (!authReady) {
    return <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0b0f19]" />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#0b0f19] transition-colors">
      {/* Sidebar: Expanded (228px) or Collapsed (70px) + Mobile Drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => {
          setIsCollapsed((prev) => {
            const next = !prev;
            try {
              localStorage.setItem("sidebar_collapsed", String(next));
            } catch {
              // ignore
            }
            return next;
          });
        }}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out print:!ml-0 print:!w-full ${
          isCollapsed ? "lg:ml-[70px]" : "lg:ml-[228px]"
        }`}
      >
        {/* Sticky Topbar */}
        <Topbar onToggleSidebar={handleToggleSidebar} />

        {/* Page Content Viewport */}
        <main className="flex-1 p-2.5 sm:p-3.5 lg:p-4 min-w-0 transition-all print:!p-0 print:!m-0">
          {children}
        </main>
      </div>
    </div>
  );
}
