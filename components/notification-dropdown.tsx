"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Bell,
  Package,
  AlertTriangle,
  ShoppingBag,
  DollarSign,
  Clock,
  ExternalLink,
  RefreshCw,
  X,
  CheckCheck,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "stock" | "sale" | "due";
  title: string;
  description: string;
  badge: string;
  badgeColor: "rose" | "amber" | "emerald" | "blue";
  link: string;
  timestamp: string;
}

interface NotificationData {
  totalCount: number;
  lowStockCount: number;
  dueCount: number;
  salesCount: number;
  items: NotificationItem[];
}

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "stock" | "due" | "sale">("all");
  const [data, setData] = useState<NotificationData>({
    totalCount: 0,
    lowStockCount: 0,
    dueCount: 0,
    salesCount: 0,
    items: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.status === "success" && json.data) {
        setData(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnread(false);
      fetchNotifications();
    }
  };

  const filteredItems = data.items.filter((item) => {
    if (activeTab === "all") return true;
    return item.type === activeTab;
  });

  const getBadgeStyle = (color: string) => {
    switch (color) {
      case "rose":
        return "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50";
      case "amber":
        return "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50";
      case "emerald":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50";
      default:
        return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50";
    }
  };

  const getIcon = (type: string, color: string) => {
    switch (type) {
      case "stock":
        return color === "rose" ? (
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
        ) : (
          <Package className="w-4 h-4 text-amber-500 shrink-0" />
        );
      case "due":
        return <DollarSign className="w-4 h-4 text-rose-500 shrink-0" />;
      case "sale":
        return <ShoppingBag className="w-4 h-4 text-emerald-500 shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500 shrink-0" />;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={toggleDropdown}
        aria-label="Notifications"
        title="View Notifications & Stock Alerts"
        className={`w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:border-rose-600 dark:hover:border-rose-500 flex items-center justify-center transition-all cursor-pointer relative ${
          isOpen ? "ring-2 ring-rose-500/30 border-rose-600 dark:border-rose-500 text-rose-600" : ""
        }`}
      >
        <Bell className="w-4 h-4" />
        {data.totalCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-rose-600 text-white text-[9px] font-extrabold rounded-full shadow-xs flex items-center justify-center min-w-[17px] h-[17px] border-2 border-white dark:border-slate-900 animate-in zoom-in-50">
            {data.totalCount > 99 ? "99+" : data.totalCount}
          </span>
        )}
      </button>

      {/* Notification Modal / Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[390px] rounded-2xl bg-white dark:bg-slate-900 border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight tracking-wide">NOTIFICATIONS & ALERTS</h3>
                <p className="text-[10px] text-rose-100/80">Real-time store alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={fetchNotifications}
                title="Refresh notifications"
                className="p-1 rounded-lg hover:bg-white/15 text-rose-100 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1 rounded-lg hover:bg-white/15 text-rose-100 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-3 pt-2.5 pb-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "all"
                  ? "bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              All ({data.totalCount})
            </button>
            <button
              onClick={() => setActiveTab("stock")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "stock"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Stock ({data.lowStockCount})
            </button>
            <button
              onClick={() => setActiveTab("due")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "due"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Dues ({data.dueCount})
            </button>
            <button
              onClick={() => setActiveTab("sale")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "sale"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
              }`}
            >
              Sales ({data.salesCount})
            </button>
          </div>

          {/* List of Notification Items */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading && data.items.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                <span>Loading store alerts...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-10 text-center px-4">
                <CheckCheck className="w-8 h-8 mx-auto text-emerald-500/80 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All clear! No alerts</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Everything is running smoothly.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.link}
                  onClick={() => setIsOpen(false)}
                  className="p-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group block"
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:scale-105 transition-transform">
                    {getIcon(item.type, item.badgeColor)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md uppercase shrink-0 ${getBadgeStyle(item.badgeColor)}`}>
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(item.timestamp)}
                      </span>
                      <span className="text-rose-600 dark:text-rose-400 font-semibold group-hover:underline flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Quick Footer Links */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-2 text-center text-[11px] font-bold">
            <Link
              href="/inventory"
              onClick={() => setIsOpen(false)}
              className="py-1.5 px-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-rose-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            >
              Inventory Stock
            </Link>
            <Link
              href="/invoices"
              onClick={() => setIsOpen(false)}
              className="py-1.5 px-2 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white transition-colors shadow-2xs"
            >
              All Invoices
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
