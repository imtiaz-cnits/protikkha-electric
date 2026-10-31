"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  Moon,
  Sun,
  Maximize,
  Minimize,
  Bell,
  LogOut,
  User as UserIcon,
  ShoppingCart,
  ChevronDown,
} from "lucide-react";
import { getInitialTheme, applyTheme } from "@/lib/theme";
import { NotificationDropdown } from "@/components/notification-dropdown";

interface TopbarProps {
  onToggleSidebar: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [userName, setUserName] = useState("Admin");
  const [userRole, setUserRole] = useState("admin");

  useEffect(() => {
    // Load saved dark mode state
    setIsDark(getInitialTheme());

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<{ isDark: boolean }>;
      if (custom.detail !== undefined) {
        setIsDark(custom.detail.isDark);
      }
    };
    window.addEventListener("theme-change", handleThemeChange);

    // Load user info from localStorage if available
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name) setUserName(parsed.name);
        if (parsed.role) setUserRole(parsed.role);
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);

  function toggleDarkMode() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
      }
      setIsFullscreen(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
      window.location.replace("/login");
    }
  }

  return (
    <header className="sticky top-0 z-30 h-[60px] bg-white/95 dark:bg-[#0b0f19]/95 backdrop-blur-md border-b border-[#cbd5e1] dark:border-[#334155] px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Sidebar Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Toggle Sidebar"
          className="w-[38px] h-[38px] rounded-xl border border-[#1E65A0] dark:border-[#1E65A0] hover:border-[#0B3D91] bg-white dark:bg-slate-900 text-[#1E65A0] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105 shrink-0"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        <span className="hidden sm:inline-block font-extrabold text-sm sm:text-base text-slate-800 dark:text-white tracking-tight">
          PROTIKKHA ELECTRIC
        </span>
      </div>

      {/* Right: POS Quick Button, Mode, Fullscreen, User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Launch POS Button */}
        <Link
          href="/pos"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold shadow-xs hover:shadow-sm transition-all"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>POS</span>
        </Link>

        {/* Low Stock & Store Notifications */}
        <NotificationDropdown />

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          aria-label="Toggle Fullscreen"
          className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] flex items-center justify-center transition-colors cursor-pointer hidden sm:flex"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle Dark Mode"
          className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] flex items-center justify-center transition-colors cursor-pointer"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdown(!userDropdown)}
            className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 hover:border-[#1E65A0] transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden md:block text-left text-xs">
              <p className="font-bold text-slate-800 dark:text-white leading-none">
                {userName}
              </p>
              <p className="text-[10px] text-slate-400 capitalize mt-0.5">{userRole}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userDropdown && (
            <div
              onClick={() => setUserDropdown(false)}
              className="absolute right-0 mt-2 w-48 rounded-xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1"
            >
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-800 dark:text-white">{userName}</p>
                <p className="text-[11px] text-slate-400 capitalize">{userRole}</p>
              </div>

              <Link
                href="/profile"
                className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-[#0B3D91] dark:hover:text-blue-300 transition-colors"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>My Profile</span>
              </Link>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
