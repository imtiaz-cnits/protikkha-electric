"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Layers,
  Tag,
  Boxes,
  Truck,
  Users,
  Receipt,
  RotateCcw,
  Wallet,
  FileSpreadsheet,
  Settings,
  Barcode,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  User,
  Ban,
  Egg,
  Fish,
  Wheat,
  Feather,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";

interface NavSubItem {
  label: string;
  href: string;
  icon: any;
}

interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon: any;
  children?: NavSubItem[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    id: "pos",
    label: "Point of Sale",
    href: "/pos",
    icon: ShoppingCart,
  },
  {
    id: "poultry",
    label: "Poultry Management",
    icon: Feather,
    children: [
      { label: "Poultry Flocks", href: "/poultry", icon: Feather },
      { label: "Flock Records", href: "/poultry/records", icon: FileSpreadsheet },
      { label: "Batch Costing", href: "/poultry/costing", icon: Wallet },
    ],
  },
  {
    id: "eggs",
    label: "Egg Production",
    icon: Egg,
    children: [
      { label: "Daily Egg Collection", href: "/eggs", icon: Egg },
      { label: "Egg Grading", href: "/eggs/grading", icon: Layers },
      { label: "Egg Stock & Reports", href: "/eggs/reports", icon: Boxes },
    ],
  },
  {
    id: "fish",
    label: "Fish Farming",
    icon: Fish,
    children: [
      { label: "Fish Ponds & Batches", href: "/fish", icon: Fish },
      { label: "Sampling & Biomass", href: "/fish/sampling", icon: FileSpreadsheet },
      { label: "Harvest & Sales", href: "/fish/harvest", icon: Boxes },
    ],
  },
  {
    id: "feed",
    label: "Feed Trading & Issues",
    icon: Wheat,
    children: [
      { label: "Feed Inventory", href: "/feed", icon: Wheat },
      { label: "Internal Issues", href: "/feed/internal-issue", icon: Boxes },
      { label: "Feed Sales", href: "/feed/sales", icon: ShoppingCart },
      { label: "Feed Purchases", href: "/feed/purchases", icon: Truck },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
    children: [
      { label: "Stock Overview", href: "/inventory", icon: Boxes },
      { label: "Product List", href: "/products", icon: Package },
      { label: "Categories", href: "/categories", icon: Layers },
      { label: "Brands", href: "/brands", icon: Tag },
      { label: "Units", href: "/units", icon: Boxes },
      { label: "Barcode Print", href: "/barcode-print", icon: Barcode },
    ],
  },
  {
    id: "sales",
    label: "Sales & Invoices",
    icon: Receipt,
    children: [
      { label: "Invoices List", href: "/invoices", icon: Receipt },
      { label: "Challan List", href: "/challans", icon: FileSpreadsheet },
      { label: "Sales Return", href: "/returns", icon: RotateCcw },
    ],
  },
  {
    id: "purchases",
    label: "Purchases",
    icon: Truck,
    children: [
      { label: "Purchase List", href: "/purchases", icon: ShoppingCart },
      { label: "Purchase Return", href: "/purchase-returns", icon: RotateCcw },
      { label: "Suppliers", href: "/suppliers", icon: Users },
      { label: "Supplier Due Pay", href: "/supplier-dues", icon: Wallet },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    children: [
      { label: "Customer List", href: "/customers", icon: Users },
      { label: "Customer Due", href: "/customer-dues", icon: Wallet },
    ],
  },
  {
    id: "expenses",
    label: "Expenses & Staff",
    icon: Wallet,
    children: [
      { label: "Daily Expenses", href: "/expenses", icon: Wallet },
      { label: "Expense Categories", href: "/expense-types", icon: Layers },
      { label: "Staff & Payroll", href: "/staff", icon: Users },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileSpreadsheet,
    children: [
      { label: "Sales Report", href: "/reports/sales", icon: FileSpreadsheet },
      { label: "Daily Ledger", href: "/reports/daily-ledger", icon: FileSpreadsheet },
      { label: "Income & Expense", href: "/reports/income-expense", icon: Wallet },
      { label: "Stock-Out Report", href: "/reports/stock-out", icon: AlertTriangle },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    children: [
      { label: "User List & Roles", href: "/users", icon: Users },
      { label: "Profile", href: "/profile", icon: User },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  isCollapsed = false,
}: SidebarProps) {
  const pathname = usePathname();

  // Find active parent ID dynamically from current pathname
  const activeParentId = useMemo(() => {
    for (const item of NAV_ITEMS) {
      if (item.children) {
        if (
          item.children.some(
            (c) => pathname === c.href || pathname.startsWith(c.href + "/")
          )
        ) {
          return item.id;
        }
      }
    }
    return null;
  }, [pathname]);

  // Expanded Drilling navigation state
  const [drilledParent, setDrilledParent] = useState<string | null>(null);

  // Sync drilled parent on route change
  useEffect(() => {
    if (activeParentId) {
      setDrilledParent(activeParentId);
    } else {
      setDrilledParent(null);
    }
  }, [pathname, activeParentId]);

  // Collapsed Mode Flyout state
  const [hoveredFlyoutId, setHoveredFlyoutId] = useState<string | null>(null);
  const [pinnedFlyoutId, setPinnedFlyoutId] = useState<string | null>(null);
  const [flyoutTop, setFlyoutTop] = useState<number>(0);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Close flyouts on outside click or Escape
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-flyout-container]")) {
        setPinnedFlyoutId(null);
        setHoveredFlyoutId(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinnedFlyoutId(null);
        setHoveredFlyoutId(null);
      }
    };

    document.addEventListener("click", handleGlobalClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Compute smart vertical position for floating flyout
  const handleTriggerHover = (id: string) => {
    if (!isCollapsed) return;
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);

    const el = triggerRefs.current[id];
    if (el) {
      const rect = el.getBoundingClientRect();
      const parentItem = NAV_ITEMS.find((n) => n.id === id);
      const isSingle = !parentItem?.children || parentItem.children.length === 0;
      const childCount = parentItem?.children ? parentItem.children.length : 0;
      const flyoutHeight = isSingle ? 48 : (childCount * 36 + 60);
      let top = rect.top;

      if (top + flyoutHeight > window.innerHeight - 15) {
        top = Math.max(10, window.innerHeight - flyoutHeight - 15);
      }
      setFlyoutTop(top);
    }
    setHoveredFlyoutId(id);
  };

  const handleTriggerLeave = (id: string) => {
    if (!isCollapsed) return;
    hoverTimerRef.current = setTimeout(() => {
      setHoveredFlyoutId((cur) => (cur === id ? null : cur));
    }, 160);
  };

  const handleFlyoutEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handleFlyoutLeave = (id: string) => {
    hoverTimerRef.current = setTimeout(() => {
      setHoveredFlyoutId((cur) => (cur === id ? null : cur));
    }, 160);
  };

  const handleTriggerClick = (id: string) => {
    if (isCollapsed) {
      setPinnedFlyoutId((cur) => (cur === id ? null : id));
      handleTriggerHover(id);
    } else {
      setDrilledParent(id);
    }
  };

  // Check if a path is active
  const isActive = (path?: string) => path && pathname === path;

  // Active flyout menu object
  const activeFlyoutMenuId = pinnedFlyoutId || hoveredFlyoutId;
  const activeFlyoutItem = NAV_ITEMS.find((n) => n.id === activeFlyoutMenuId);

  // Main scrollable items (Dashboard through Reports)
  const scrollableItems = NAV_ITEMS.filter((item) => item.id !== "settings");
  const settingsItem = NAV_ITEMS.find((item) => item.id === "settings")!;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-gradient-to-b from-[#0B3D91] via-[#0e3271] to-[#08224d] text-white flex flex-col transition-all duration-300 ease-in-out border-r border-white/10 shadow-2xl select-none ${isCollapsed
          ? "w-[70px] -translate-x-full lg:translate-x-0"
          : "w-[215px] " +
          (isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0")
          }`}
      >
        {/* Brand Header */}
        <div className="h-[60px] px-3 flex items-center justify-between border-b border-white/10 shrink-0">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 ${isCollapsed ? "justify-center w-full" : ""
              }`}
          >
            {isCollapsed ? (
              <img
                src="/fav.png"
                alt="Protikkha Electric"
                className="w-10 h-10 rounded-xl object-contain shadow-xs shrink-0"
              />
            ) : (
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src="/fav.png"
                  alt="Protikkha Electric"
                  className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-black tracking-wider text-white leading-tight uppercase truncate">
                    ARAFAT POULTRY
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold tracking-tight leading-tight truncate">
                    & Fisheries ERP
                  </span>
                </div>
              </div>
            )}
          </Link>
          {!isCollapsed && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-blue-200 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ============================================================ */}
        {/* EXPANDED VIEW: Drilling Navigation Panels                    */}
        {/* ============================================================ */}
        {!isCollapsed && (
          <div className="relative flex-1 overflow-hidden w-full">
            {/* 1. Main Navigation Panel (Slides Left when drilled) */}
            <div
              className={`absolute inset-0 w-full h-full overflow-y-auto px-2 py-2.5 space-y-1 text-xs transition-transform duration-300 ease-in-out scrollbar-thin ${drilledParent !== null
                ? "-translate-x-full pointer-events-none"
                : "translate-x-0 pointer-events-auto"
                }`}
            >
              {scrollableItems.map((item) => {
                const Icon = item.icon;
                const isSingleActive = isActive(item.href);
                const isParentActive = activeParentId === item.id;

                // A. Menu with children (Drilldown trigger)
                if (item.children && item.children.length > 0) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTriggerClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 cursor-pointer group text-start ${isParentActive
                        ? "bg-white/15 text-white font-bold border-l-[3px] border-[#F59E0B] shadow-xs"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 opacity-90 group-hover:scale-110 transition-transform" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span className="shrink-0 w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-white/70 group-hover:text-white group-hover:bg-white/20 transition-all">
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </button>
                  );
                }

                // B. Single Item (Dashboard, POS, Customers, etc.)
                // Point of Sale now renders exactly like other normal menus without special border/bg
                return (
                  <Link
                    key={item.id}
                    href={item.href || "#"}
                    onClick={() => {
                      if (isOpen) onClose();
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all ${isSingleActive
                      ? "bg-white text-[#0B3D91] shadow-md font-bold"
                      : "text-blue-100 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 opacity-90" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.id === "pos" && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${isSingleActive
                          ? "bg-[#0B3D91] text-white"
                          : "bg-[#F59E0B] text-slate-950 shadow-xs"
                          }`}
                      >
                        POS
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* 2. Submenu Drilldown Panels (Slide In from Right) */}
            {NAV_ITEMS.filter((item) => item.children).map((parent) => (
              <div
                key={parent.id}
                className={`absolute inset-0 w-full h-full overflow-y-auto px-2 py-2.5 space-y-1 text-xs transition-transform duration-300 ease-in-out scrollbar-thin ${drilledParent === parent.id
                  ? "translate-x-0 pointer-events-auto"
                  : "translate-x-full pointer-events-none"
                  }`}
              >
                {/* Back Button matching MARSS reference layout */}
                <button
                  type="button"
                  onClick={() => setDrilledParent(null)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-blue-100 bg-white/10 hover:bg-white/20 border border-white/15 font-bold text-xs transition-all shadow-xs mb-2 cursor-pointer group"
                >
                  <ChevronLeft className="w-4 h-4 text-blue-200 group-hover:text-white transition-transform group-hover:-translate-x-0.5" />
                  <span className="truncate">{parent.label}</span>
                </button>

                {/* Submenu Item List */}
                <div className="space-y-1 pt-0.5">
                  {parent.children?.map((child) => {
                    const ChildIcon = child.icon;
                    const isChildActive = isActive(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => {
                          if (isOpen) onClose();
                        }}
                        className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all ${isChildActive
                          ? "bg-white text-[#0B3D91] font-bold shadow-md"
                          : "text-blue-100/90 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* COLLAPSED VIEW: Icon Rail (No native tooltips, uses flyout)  */}
        {/* ============================================================ */}
        {isCollapsed && (
          <div
            className="flex-1 overflow-y-auto px-2 py-3 space-y-2 scrollbar-none"
            data-flyout-container
          >
            {scrollableItems.map((item) => {
              const Icon = item.icon;
              const hasSubmenu = Boolean(item.children && item.children.length > 0);
              const isParentActive = activeParentId === item.id;
              const isSingleActive = isActive(item.href);
              const isFlyoutOpen = activeFlyoutMenuId === item.id;

              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    triggerRefs.current[item.id] = el;
                  }}
                  onMouseEnter={() => handleTriggerHover(item.id)}
                  onMouseLeave={() => handleTriggerLeave(item.id)}
                  className="relative flex justify-center"
                >
                  {hasSubmenu ? (
                    // Menu with Submenu -> Trigger button
                    <button
                      type="button"
                      onClick={() => handleTriggerClick(item.id)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${isFlyoutOpen || isParentActive
                        ? "bg-white text-[#0B3D91] shadow-md font-bold"
                        : "text-blue-100 hover:bg-white/15 hover:text-white"
                        }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </button>
                  ) : (
                    // Single Item (Dashboard, POS, Customers) -> Direct link
                    <Link
                      href={item.href || "#"}
                      onClick={() => {
                        if (isOpen) onClose();
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSingleActive
                        ? "bg-white text-[#0B3D91] shadow-md font-bold"
                        : "text-blue-100 hover:bg-white/15 hover:text-white"
                        }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================ */}
        {/* SIDEBAR FOOTER: Settings Menu Only (No version text)         */}
        {/* ============================================================ */}
        <div
          data-flyout-container
          className="p-2 border-t border-white/10 shrink-0"
        >
          <div
            ref={(el) => {
              triggerRefs.current["settings"] = el;
            }}
            onMouseEnter={() => handleTriggerHover("settings")}
            onMouseLeave={() => handleTriggerLeave("settings")}
            className="relative"
          >
            <Link
              href={settingsItem.href || "/users"}
              onClick={() => {
                if (isOpen) onClose();
              }}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-semibold transition-all text-xs cursor-pointer ${isActive(settingsItem.href)
                ? "bg-white text-[#0B3D91] shadow-md font-bold"
                : "text-blue-100 hover:bg-white/10 hover:text-white"
                } ${isCollapsed ? "justify-center w-10 h-10 mx-auto px-0" : "w-full"}`}
            >
              <Settings className={`shrink-0 ${isCollapsed ? "w-5 h-5" : "w-4 h-4 opacity-90"}`} />
              {!isCollapsed && <span>{settingsItem.label}</span>}
            </Link>
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/* FLOATING DRILLING FLYOUT / TOOLTIP POPOVER (For Collapsed)   */}
      {/* ============================================================ */}
      {isCollapsed && activeFlyoutItem && (
        <div
          data-flyout-container
          style={{ top: flyoutTop }}
          onMouseEnter={handleFlyoutEnter}
          onMouseLeave={() => handleFlyoutLeave(activeFlyoutItem.id)}
          className={`fixed left-[72px] z-[99999] p-2 rounded-2xl bg-gradient-to-b from-[#0B3D91] via-[#0e3271] to-[#08224d] dark:from-[#0a1a33] dark:via-[#071326] dark:to-[#040b17] border border-blue-400/35 shadow-2xl shadow-black/60 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 ${activeFlyoutItem.children && activeFlyoutItem.children.length > 0
            ? "w-56"
            : "min-w-[150px] w-auto max-w-[210px]"
            }`}
        >
          {/* Invisible Hover Bridge between Sidebar rail and Popover */}
          <div className="absolute -left-3 top-0 bottom-0 w-3.5 pointer-events-auto" />

          {/* Caret Pointer Arrow pointing back to icon */}
          <div className="absolute -left-1.5 top-3.5 w-3 h-3 bg-[#0B3D91] dark:bg-[#0a1a33] border-l border-b border-blue-400/35 rotate-45 pointer-events-none" />

          {/* If item has children: Render Full Submenu List */}
          {activeFlyoutItem.children && activeFlyoutItem.children.length > 0 ? (
            <>
              {/* Flyout Header */}
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-blue-400/25 mb-1.5">
                <span className="text-[10px] font-bold tracking-wider text-blue-200 uppercase flex items-center gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shadow-[0_0_6px_#f59e0b] shrink-0" />
                  {activeFlyoutItem.label}
                </span>
                <span className="text-[9px] font-semibold text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-400/30 shrink-0">
                  Menu
                </span>
              </div>

              {/* Flyout Submenu List */}
              <ul className="space-y-0.5">
                {activeFlyoutItem.children.map((child) => {
                  const ChildIcon = child.icon;
                  const isChildActive = isActive(child.href);
                  return (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        onClick={() => {
                          setPinnedFlyoutId(null);
                          setHoveredFlyoutId(null);
                          if (isOpen) onClose();
                        }}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${isChildActive
                          ? "bg-white/20 text-white font-bold"
                          : "text-blue-100/90 hover:text-white hover:bg-white/10"
                          }`}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                        <span className="truncate">{child.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            /* Single Menu Item (Dashboard, POS, Customers, Settings): Sleek Floating Card */
            <Link
              href={activeFlyoutItem.href || "#"}
              onClick={() => {
                setPinnedFlyoutId(null);
                setHoveredFlyoutId(null);
                if (isOpen) onClose();
              }}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${isActive(activeFlyoutItem.href)
                ? "bg-white text-[#0B3D91] shadow-md font-bold"
                : "text-blue-100 hover:text-white hover:bg-white/15"
                }`}
            >
              <activeFlyoutItem.icon className="w-4 h-4 shrink-0 text-blue-200" />
              <span className="whitespace-nowrap">{activeFlyoutItem.label}</span>
            </Link>
          )}
        </div>
      )}
    </>
  );
}
