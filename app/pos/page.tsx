"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Camera,
  Plus,
  Trash2,
  Minus,
  CheckCircle,
  PauseCircle,
  FolderOpen,
  Send,
  Moon,
  Sun,
  Maximize,
  Minimize,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Banknote,
  Smartphone,
  Building,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePosStore, CartItem, Customer } from "@/lib/pos-store";
import { getProductUnitOptions, allowsDecimalQty } from "@/lib/electrical-units";
import { PosUnitSelector } from "@/components/pos/pos-unit-selector";
import { formatBdCurrency } from "@/lib/utils";
import { ThermalReceiptModal } from "@/components/pos/thermal-receipt";
import { CameraScannerModal } from "@/components/pos/camera-scanner";
import { CustomerModal } from "@/components/pos/customer-modal";
import { HeldInvoicesModal, HeldInvoice } from "@/components/pos/held-invoices-modal";
import { PosDatePicker } from "@/components/pos/date-picker";
import { QuickProductModal } from "@/components/pos/quick-product-modal";
import { getInitialTheme, applyTheme } from "@/lib/theme";
import { useToast } from "@/components/ui/toast";

interface ElectricalSpec {
  id?: number;
  spec_type: string;
  cable_size?: string | null;
  voltage_grade?: string | null;
  current_rating?: string | null;
  wattage?: string | null;
  gang_module?: string | null;
}

interface PackagingConversion {
  id?: number;
  packaging_unit: string;
  base_unit: string;
  conversion_ratio: number;
  is_default?: boolean;
}

interface Product {
  id: number;
  name: string;
  product_name: string;
  primary_code: string;
  display_codes: string;
  all_codes: string[];
  cost_price: number;
  sell_price: number;
  quantity: number;
  category_id: number;
  category: string;
  brand: string;
  unit: string;
  electrical_spec?: ElectricalSpec | null;
  packaging_conversions?: PackagingConversion[];
  img_url?: string | null;
  // Legacy compatibility
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  surface_finish?: string | null;
}

interface Category {
  id: number;
  category_name: string;
}

interface Brand {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  unit_name: string;
}

type ProductFilterOption = "all" | "in_stock" | "out_of_stock" | "a_to_z";

const FILTER_OPTIONS: { id: ProductFilterOption; label: string }[] = [
  { id: "all", label: "All Items" },
  { id: "in_stock", label: "In Stock" },
  { id: "out_of_stock", label: "Out of Stock" },
  { id: "a_to_z", label: "A to Z" },
];

export default function PosPage() {
  const { showToast: triggerGlobalToast } = useToast();
  // Store
  const {
    cart,
    selectedCustomer,
    discount,
    discountType,
    deliveryCharge,
    returnAdjustment,
    paidAmount,
    paymentMethod,
    transactionId,
    orderNote,
    addItem,
    updateQty,
    updatePrice,
    updateItemUnit,
    updateTileCalculation,
    removeItem,
    clearCart,
    setCustomer,
    setDiscount,
    setDiscountType,
    setDeliveryCharge,
    setReturnAdjustment,
    setPaidAmount,
    setPaymentMethod,
    setTransactionId,
    setOrderNote,
    getSubTotal,
    getCalculatedDiscount,
    getGrandTotal,
    getDueAmount,
    getTotalDueWithPrevious,
  } = usePosStore();

  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Customer dropdown
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

  // Product Sort & Filter dropdown
  const [filterOption, setFilterOption] = useState<ProductFilterOption>("all");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isHeldModalOpen, setIsHeldModalOpen] = useState(false);
  const [isQuickProductModalOpen, setIsQuickProductModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Held invoices
  const [heldInvoices, setHeldInvoices] = useState<HeldInvoice[]>([]);

  // Mobile tab switch ('catalog' | 'cart')
  const [mobileTab, setMobileTab] = useState<"catalog" | "cart">("catalog");

  // Dark mode & Fullscreen
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Smooth Horizontal Category Slider Scroll
  const scrollCategories = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 260;
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Show notification banner
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    triggerGlobalToast(message, type);
  }, [triggerGlobalToast]);


  // Synchronize Theme state & strict session check (zero unauthenticated flash)
  useEffect(() => {
    let active = true;
    const checkSession = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch("/api/auth/me", { headers, cache: "no-store" });
        if (!res.ok) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("role");
          window.location.replace("/login");
          return;
        }
        if (active) setAuthReady(true);
      } catch {
        window.location.replace("/login");
      }
    };
    checkSession();
    setIsDarkMode(getInitialTheme());

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<{ isDark: boolean }>;
      if (custom.detail !== undefined) {
        setIsDarkMode(custom.detail.isDark);
      }
    };
    window.addEventListener("theme-change", handleThemeChange);
    return () => {
      active = false;
      window.removeEventListener("theme-change", handleThemeChange);
    };
  }, []);

  // 1. Initial Data Fetching
  const loadData = useCallback(async () => {
    try {
      const [prodRes, catRes, brandRes, unitRes, custRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
        fetch("/api/brands"),
        fetch("/api/units"),
        fetch("/api/customers"),
      ]);

      const [prodData, catData, brandData, unitData, custData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        brandRes.json(),
        unitRes.json(),
        custRes.json(),
      ]);

      if (prodData.status === "success") setProducts(prodData.data);
      if (catData.status === "success") setCategories(catData.data);
      if (brandData.status === "success") setBrands(brandData.data);
      if (unitData.status === "success") setUnits(unitData.data);
      if (custData.status === "success") {
        setCustomers(custData.data);
        // Auto select first customer if none selected
        if (!selectedCustomer && custData.data.length > 0) {
          setCustomer(custData.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load POS data:", err);
    }
  }, [selectedCustomer, setCustomer]);

  useEffect(() => {
    loadData();

    // Load held invoices from localStorage
    try {
      const stored = localStorage.getItem("protikkha_held_invoices");
      if (stored) {
        setHeldInvoices(JSON.parse(stored));
      }
    } catch {}

    // Check dark mode
    if (typeof window !== "undefined") {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, []);

  // Save held invoices
  const saveHeldInvoices = (list: HeldInvoice[]) => {
    setHeldInvoices(list);
    try {
      localStorage.setItem("protikkha_held_invoices", JSON.stringify(list));
    } catch {}
  };

  // Close customer & filter dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 2. Barcode Scanner Gun Buffer Detection (Global Listener)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Shortcuts
      if (e.key === "F4") {
        e.preventDefault();
        handleSubmitOrder();
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === "F8") {
        e.preventDefault();
        handleHoldInvoice();
        return;
      }

      // Scanner Gun Buffer Detection:
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === "Enter") {
        if (barcodeBufferRef.current.length >= 3 && timeDiff < 100) {
          e.preventDefault();
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = "";
          handleScanCode(scannedCode);
        } else {
          barcodeBufferRef.current = "";
        }
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 120) {
          barcodeBufferRef.current = ""; // Reset buffer if user is typing manually with pauses
        }
        barcodeBufferRef.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart]);

  // Handle scanned barcode (from gun or camera)
  const handleScanCode = async (code: string) => {
    if (!code) return;
    const trimmed = code.trim().toLowerCase();

    // Check in existing state first
    const matched = products.find((p) => {
      if (String(p.id) === trimmed) return true;
      if (p.primary_code.toLowerCase() === trimmed) return true;
      return p.all_codes?.some((c) => c.toLowerCase() === trimmed);
    });

    if (matched) {
      ringProduct(matched);
      showToast(`Added: ${matched.name}`, "success");
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    // Try server search
    try {
      const res = await fetch(`/api/product-search?query=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (res.ok && data.status === "success" && data.product) {
        const prod = data.product;
        const formatted: Product = {
          id: prod.id,
          name: prod.name,
          product_name: prod.product_name,
          primary_code: prod.product_code?.[0] || "",
          display_codes: Array.isArray(prod.product_code) ? prod.product_code.join(", ") : "",
          all_codes: Array.isArray(prod.product_code) ? prod.product_code : [],
          cost_price: prod.cost_price || 0,
          sell_price: prod.sell_price || 0,
          quantity: prod.quantity || 0,
          category_id: prod.category_id,
          category: prod.categories?.category_name || "N/A",
          brand: prod.brands?.name || "N/A",
          unit: prod.units?.unit_name || "Pcs",
          tile_size: prod.tile_size || null,
          sqft_per_box: prod.sqft_per_box ? parseFloat(prod.sqft_per_box) : null,
          pcs_per_box: prod.pcs_per_box ? parseInt(prod.pcs_per_box) : null,
          grade: prod.grade || null,
          surface_finish: prod.surface_finish || null,
          img_url: prod.img_url,
        };
        ringProduct(formatted);
        showToast(`Added: ${formatted.name}`, "success");
        setSearchQuery("");
        setSearchResults([]);
      } else {
        showToast(`Product with code "${code}" not found!`, "error");
      }
    } catch {
      showToast(`Search error for barcode "${code}"`, "error");
    }
  };

  // Live text search in POS catalog
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    const q = val.trim().toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        p.display_codes.toLowerCase().includes(q) ||
        String(p.id) === q
    );
    setSearchResults(filtered.slice(0, 10));
  };

  // Ring product into cart with full per-product multi-unit options
  const ringProduct = (p: Product) => {
    const baseUnit = p.unit || "Pcs";
    const unitOptions = getProductUnitOptions(baseUnit, p.packaging_conversions);
    addItem({
      product_id: p.id,
      product_name: p.name || p.product_name,
      barcode: p.primary_code,
      cost_price: p.cost_price,
      selling_price: p.sell_price,
      base_cost_price: p.cost_price,
      base_sell_price: p.sell_price,
      stock: p.quantity,
      unit: baseUnit,
      base_unit: baseUnit,
      selected_unit: baseUnit,
      conversion_ratio: 1,
      unit_options: unitOptions,
      category: p.category,
      brand: p.brand,
      spec_type: p.electrical_spec?.spec_type,
      cable_size: p.electrical_spec?.cable_size,
      voltage_grade: p.electrical_spec?.voltage_grade,
      current_rating: p.electrical_spec?.current_rating,
      wattage: p.electrical_spec?.wattage,
      gang_module: p.electrical_spec?.gang_module,
      packaging_unit: baseUnit,
    });
  };

  // Hold current invoice
  const handleHoldInvoice = () => {
    if (cart.length === 0) {
      showToast("Cannot hold an empty cart!", "error");
      return;
    }

    const newHeld: HeldInvoice = {
      id: "HOLD-" + Date.now(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      customer: selectedCustomer,
      cart: [...cart],
      subTotal: getSubTotal(),
      grandTotal: getGrandTotal(),
      discount,
      discountType,
      deliveryCharge,
      note: orderNote,
    };

    saveHeldInvoices([newHeld, ...heldInvoices]);
    clearCart();
    showToast("Invoice saved to Held list!", "success");
  };

  // Restore held invoice
  const handleRestoreHeld = (held: HeldInvoice) => {
    clearCart();
    held.cart.forEach((item) => {
      addItem(item, item.quantity);
    });
    setCustomer(held.customer);
    setDiscount(held.discount);
    setDiscountType(held.discountType);
    setDeliveryCharge(held.deliveryCharge);
    setOrderNote(held.note);

    const updated = heldInvoices.filter((h) => h.id !== held.id);
    saveHeldInvoices(updated);
    setIsHeldModalOpen(false);
    showToast("Held invoice loaded to cart!", "success");
  };

  // Delete held invoice
  const handleDeleteHeld = (id: string) => {
    const updated = heldInvoices.filter((h) => h.id !== id);
    saveHeldInvoices(updated);
    showToast("Held invoice removed", "success");
  };

  // Quick button: Full Paid
  const handleSetFullPaid = () => {
    setPaidAmount(getGrandTotal());
  };

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    applyTheme(next);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Submit & Save Order
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      showToast("Cart is empty! Add products to proceed.", "error");
      return;
    }

    if (!selectedCustomer) {
      showToast("Please select or create a customer!", "error");
      return;
    }

    const subTotal = getSubTotal();
    const discountAmount = getCalculatedDiscount();
    const grandTotal = getGrandTotal();
    const dueAmount = getDueAmount();
    const prevDue = selectedCustomer.previous_due_amount || 0;

    const payload = {
      customer_id: selectedCustomer.id,
      sub_total: subTotal,
      delivery_charge: deliveryCharge,
      discount_amount: discountAmount,
      return_adjustment_amount: returnAdjustment,
      paid_amount: paidAmount,
      due_amount: dueAmount,
      previous_due_amount: prevDue,
      order_note: orderNote,
      invoice_date: invoiceDate,
      payment_method: paymentMethod,
      transaction_id: transactionId,
      payment_status: dueAmount <= 0 ? "Paid" : paidAmount > 0 ? "Partial Paid" : "Due",
      products: cart.map((item) => {
        const ratio = item.conversion_ratio ?? 1;
        return {
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.cost_price,
          selling_price: item.selling_price,
          selected_unit: item.selected_unit || item.unit || "Pcs",
          conversion_ratio: ratio,
          base_quantity: item.base_quantity ?? +(item.quantity * ratio).toFixed(4),
        };
      }),
    };

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        // Prepare thermal receipt
        setReceiptData({
          id: data.invoice_id,
          order_no: data.order_no,
          has_tiles: data.has_tiles,
          challan_status: data.challan_status,
          invoice_date: invoiceDate,
          customer: {
            customer_name: selectedCustomer.customer_name,
            mobile: selectedCustomer.mobile,
            address_details: selectedCustomer.address_details || undefined,
          },
          sub_total: subTotal,
          discount_amount: discountAmount,
          delivery_charge: deliveryCharge,
          return_adjustment_amount: returnAdjustment,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          previous_due_amount: prevDue,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          order_note: orderNote,
          details: cart.map((c) => ({
            product_name: c.product_name,
            quantity: c.quantity,
            unit: c.selected_unit || c.unit || "Pcs",
            price: c.selling_price,
            total: c.selling_price * c.quantity,
            cable_size: c.cable_size || null,
            current_rating: c.current_rating || null,
            wattage: c.wattage || null,
            gang_module: c.gang_module || null,
            category: c.category || null,
          })),
        });

        // Update customer in state
        if (dueAmount > 0) {
          setCustomers((curr) =>
            curr.map((c) =>
              c.id === selectedCustomer.id
                ? { ...c, previous_due_amount: prevDue + dueAmount }
                : c
            )
          );
        }

        clearCart();
        loadData();
        showToast("Order Placed Successfully! (Invoice: " + data.order_no + ")", "success");
      } else {
        showToast(data.message || "Failed to place order", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Communication error", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered and sorted catalog products
  const displayProducts = products
    .filter((p) => {
      // Category filter
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) {
        return false;
      }
      // Stock status filter
      if (filterOption === "in_stock" && Number(p.quantity || 0) <= 0) {
        return false;
      }
      if (filterOption === "out_of_stock" && Number(p.quantity || 0) > 0) {
        return false;
      }
      // Live search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.product_name.toLowerCase().includes(q) ||
          p.display_codes.toLowerCase().includes(q) ||
          String(p.id) === q
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (filterOption === "a_to_z") {
        return a.product_name.localeCompare(b.product_name, undefined, { sensitivity: "base" });
      }
      return 0;
    });

  // Filtered customers for dropdown
  const filteredCustomers = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch) ||
      c.customer_id.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const subTotal = getSubTotal();
  const calculatedDiscount = getCalculatedDiscount();
  const grandTotal = getGrandTotal();
  const dueAmount = getDueAmount();
  const totalDueWithPrev = getTotalDueWithPrevious();

  const paymentStatus =
    dueAmount <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL PAID" : "DUE";

  if (!authReady) {
    return <div className="min-h-screen bg-[#F8F9FA] dark:bg-[#0b0f19]" />;
  }

  return (
    <div className="fixed inset-0 h-screen w-full max-h-screen max-w-full overflow-hidden flex flex-col bg-slate-100 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 select-none">
      {/* TOP COMPACT NAVIGATION BAR (Marss Corp Rule: Compact, Emerald Theme) */}

      <header className="h-[46px] bg-white dark:bg-[#0f172a] border-b border-[#cbd5e1] dark:border-[#334155] px-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard"
            className="h-[32px] px-3 rounded-full bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>

          <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 rounded-full border border-blue-200 dark:border-blue-900/40">
            <span className="w-2 h-2 rounded-full bg-[#1E65A0] animate-ping" />
            <span className="text-xs font-black tracking-wider text-[#0B3D91] dark:text-blue-300 uppercase">
              PROTIKKHA ELECTRIC POS
            </span>
          </div>
        </div>

        {/* Center/Right quick tools */}
        <div className="flex items-center gap-2">
          {/* Held Invoices Pill */}
          <button
            type="button"
            onClick={() => setIsHeldModalOpen(true)}
            className="h-[32px] px-2.5 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Held Invoices"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Held</span>
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
              {heldInvoices.length}
            </span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="w-[32px] h-[32px] rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] hover:border-[#1E65A0] transition-colors cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="w-[32px] h-[32px] rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] hover:border-[#1E65A0] transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* MAIN TWO-COLUMN WORKSPACE (Strict Rule: 100vh full screen, no window scroll) */}
      <div className="flex-1 min-h-0 min-w-0 flex overflow-hidden p-2.5 sm:p-3 gap-3">
        {/* ======================================================== */}
        {/* LEFT COLUMN: PRODUCT CATALOG & SEARCH                     */}
        {/* ======================================================== */}
        <section
          className={`flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-sm ${
            mobileTab === "cart" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search bar & Scan buttons (Height 38px, Focus ring emerald) */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
            {/* Input with Search Icon */}
            <div className="relative flex-1 min-w-0">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    handleScanCode(searchQuery.trim());
                  }
                }}
                placeholder="🔍 Scan barcode gun or type code / product name... (F2)"
                className="w-full h-[38px] pl-3 pr-9 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
              />
              <button
                type="button"
                onClick={() => {
                  if (searchQuery.trim()) handleScanCode(searchQuery.trim());
                }}
                className="absolute right-1 top-1 w-[30px] h-[30px] rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-[42px] z-30 bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl shadow-2xl overflow-hidden max-h-[260px] overflow-y-auto">
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        ringProduct(item);
                        setSearchQuery("");
                        setSearchResults([]);
                        showToast(`Added: ${item.name}`);
                      }}
                      className="px-3 py-2 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Code: {item.primary_code || "N/A"} &bull; Stock: {item.quantity} {item.unit}
                        </div>
                      </div>
                      <div className="text-xs font-black text-[#0B3D91] dark:text-blue-300">
                        {formatBdCurrency(item.sell_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Custom Sort & Filter Dropdown (All Items, In Stock, Out of Stock, A to Z) */}
            <div className="relative shrink-0" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                className={`h-[38px] px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs ${
                  filterOption !== "all"
                    ? "bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-900 text-[#1E65A0] dark:text-blue-300"
                    : "bg-slate-50 hover:bg-slate-100 dark:bg-[#1e293b] dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-[#cbd5e1] dark:border-[#334155]"
                }`}
                title="Filter & Sort Products"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#1E65A0] dark:text-blue-400 shrink-0" />
                <span className="hidden sm:inline whitespace-nowrap">
                  {FILTER_OPTIONS.find((o) => o.id === filterOption)?.label || "Sort"}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    isFilterDropdownOpen ? "rotate-180 text-[#1E65A0]" : "text-slate-400"
                  }`}
                />
              </button>

              {isFilterDropdownOpen && (
                <div className="absolute left-0 sm:right-0 sm:left-auto top-[44px] z-40 w-44 bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
                    Filter &amp; Sort
                  </div>
                  {FILTER_OPTIONS.map((opt) => {
                    const isSelected = filterOption === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setFilterOption(opt.id);
                          setIsFilterDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-xs font-semibold flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50/80 dark:bg-blue-950/40 text-[#1E65A0] dark:text-blue-300 font-bold"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#1E65A0] dark:text-blue-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Camera Scan Button */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="h-[38px] px-3 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-xs"
              title="Open Camera QR / Barcode Scanner"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Camera</span>
            </button>

            {/* New Product Button */}
            <button
              type="button"
              onClick={() => setIsQuickProductModalOpen(true)}
              className="h-[38px] px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs"
              title="Add New Product"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Product</span>
            </button>
          </div>

          {/* Category Filter Tabs with Left / Right Scroll Arrows */}
          <div className="w-full min-w-0 px-2 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 shrink-0 bg-slate-50/60 dark:bg-slate-900/40">
            {/* Left Arrow Button */}
            <button
              type="button"
              onClick={() => scrollCategories("left")}
              className="w-7 h-7 rounded-lg bg-white dark:bg-[#1e293b] hover:bg-blue-50 hover:text-[#1E65A0] dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 border border-[#cbd5e1] dark:border-[#334155] flex items-center justify-center shrink-0 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Slide Categories Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Scrollable Category Tabs */}
            <div
              ref={categoryScrollRef}
              className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5"
            >
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`h-[28px] px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedCategory === "all"
                    ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white shadow-xs"
                    : "bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`h-[28px] px-3.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat.id
                      ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white shadow-xs"
                      : "bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {cat.category_name}
                </button>
              ))}
            </div>

            {/* Right Arrow Button */}
            <button
              type="button"
              onClick={() => scrollCategories("right")}
              className="w-7 h-7 rounded-lg bg-white dark:bg-[#1e293b] hover:bg-blue-50 hover:text-[#1E65A0] dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-slate-600 dark:text-slate-300 border border-[#cbd5e1] dark:border-[#334155] flex items-center justify-center shrink-0 transition-colors shadow-2xs cursor-pointer active:scale-95"
              title="Slide Categories Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Product Grid Area (Scrollable independently, fewer cards per row for wider comfortable cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3">
            {displayProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <ShoppingBag className="w-12 h-12 stroke-[1.5] mb-2 opacity-40" />
                <p className="text-sm font-bold">No Products Found</p>
                <p className="text-xs text-slate-500">
                  Try another search query or category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                {displayProducts.map((p) => {
                  const isOutOfStock = p.quantity <= 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        if (!isOutOfStock) {
                          ringProduct(p);
                        } else {
                          showToast(`"${p.name}" is out of stock!`, "error");
                        }
                      }}
                      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all text-left group min-h-[148px] ${
                        isOutOfStock
                          ? "bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-slate-800 opacity-60 cursor-not-allowed"
                          : "bg-white dark:bg-[#1e293b] border-[#cbd5e1] dark:border-[#334155] hover:border-[#1E65A0] dark:hover:border-[#1E65A0] hover:shadow-md cursor-pointer hover:-translate-y-0.5"
                      }`}
                    >
                      {/* Top: Product Title, Category & Stock Status */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight group-hover:text-[#1E65A0] transition-colors">
                            {p.product_name}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5 font-medium">
                            {p.category} &bull; {p.brand}
                          </p>
                        </div>

                        {(() => {
                          const stockText = isOutOfStock
                            ? "Out of Stock"
                            : `${p.quantity} ${p.unit || "Pcs"}`;

                          return (
                            <span
                              title={isOutOfStock ? "Out of Stock" : `Stock: ${stockText}`}
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 mt-0.5 max-w-[145px] truncate text-right ${
                                isOutOfStock
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                                  : p.quantity <= 5
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                  : "bg-blue-50 text-[#0B3D91] dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50"
                              }`}
                            >
                              {isOutOfStock ? "Out of Stock" : `Stock: ${stockText}`}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Product Electrical Specs Badges */}
                      <div className="flex items-center gap-1 flex-wrap my-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0 whitespace-nowrap">
                          {p.unit || "Pcs"}
                        </span>
                        {p.electrical_spec?.cable_size && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#1E65A0] dark:bg-blue-950/70 dark:text-blue-300 border border-blue-200/60 dark:border-blue-900/60 shrink-0 whitespace-nowrap">
                            ⚡ {p.electrical_spec.cable_size}
                          </span>
                        )}
                        {p.electrical_spec?.current_rating && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/60 shrink-0 whitespace-nowrap">
                            ⚡ {p.electrical_spec.current_rating}
                          </span>
                        )}
                        {p.electrical_spec?.wattage && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/60 shrink-0 whitespace-nowrap">
                            💡 {p.electrical_spec.wattage}
                          </span>
                        )}
                        {p.electrical_spec?.gang_module && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/60 shrink-0 whitespace-nowrap">
                            ⚡ {p.electrical_spec.gang_module}
                          </span>
                        )}
                      </div>

                      {/* Bottom Pricing */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-sm sm:text-base font-black text-[#0B3D91] dark:text-blue-300 tracking-tight">
                            {formatBdCurrency(p.sell_price)}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-center transition-all shadow-xs group-hover:scale-105 shrink-0">
                          <Plus className="w-4 h-4 text-white stroke-[2.5]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: CUSTOMER, CART TABLE & CHECKOUT BAR         */}
        {/* ======================================================== */}
        <section
          className={`w-full lg:w-[650px] xl:w-[730px] 2xl:w-[780px] shrink-0 min-h-0 min-w-0 flex flex-col overflow-hidden bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-sm ${
            mobileTab === "catalog" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* 1. CUSTOMER & INVOICE META ROW */}
          <div className="p-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#1e293b]/50 shrink-0">
            <div className="flex items-center gap-2">
              {/* Customer Selector Dropdown */}
              <div ref={customerDropdownRef} className="relative flex-1 min-w-0">
                <div
                  onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                  className="h-[38px] px-3 rounded-xl bg-white dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] flex items-center justify-between cursor-pointer hover:border-[#1E65A0] transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="w-4 h-4 text-[#1E65A0] shrink-0" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                      {selectedCustomer ? selectedCustomer.customer_name : "Select Customer..."}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs">&#9662;</span>
                </div>

                {/* Dropdown Menu */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[44px] z-50 bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] rounded-2xl shadow-2xl p-2.5 max-h-[290px] flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    {/* Modern Search Box with Icon & Clear Button */}
                    <div className="relative mb-2 shrink-0">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Search customer name or mobile..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="w-full h-[38px] pl-9 pr-8 text-xs font-medium rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#1E65A0] focus:ring-2 focus:ring-[#1E65A0]/20 transition-all shadow-xs"
                      />
                      {customerSearch && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearch("")}
                          className="w-5 h-5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Customer Items List */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                      {filteredCustomers.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-medium">
                          No customers found
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCustomer(c);
                              setIsCustomerDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-xl text-xs cursor-pointer flex items-center justify-between transition-colors ${
                              selectedCustomer?.id === c.id
                                ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white font-bold shadow-xs"
                                : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <div>
                              <div className="font-bold">{c.customer_name}</div>
                              <div className="text-[10px] opacity-75">{c.mobile}</div>
                            </div>
                            {c.previous_due_amount > 0 && (
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                                  selectedCustomer?.id === c.id
                                    ? "bg-white/20 text-white"
                                    : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                                }`}
                              >
                                Due: ৳{c.previous_due_amount}
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* + New Customer Button */}
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-[38px] px-3 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>

              {/* Custom Date Picker - Clicking anywhere opens the calendar */}
              <div className="w-[145px] shrink-0">
                <PosDatePicker
                  value={invoiceDate}
                  onChange={(d) => setInvoiceDate(d)}
                  hideChevron={true}
                />
              </div>
            </div>

            {/* Quick Customer Info Preview Bar */}
            {selectedCustomer && (
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-1 text-[11px]">
                <div className="truncate">
                  <span className="text-slate-400">Name:</span>{" "}
                  <strong className="text-slate-700 dark:text-slate-200 font-bold truncate">
                    {selectedCustomer.customer_name}
                  </strong>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Mobile:</span>{" "}
                  <strong className="text-slate-700 dark:text-slate-200 font-bold">
                    {selectedCustomer.mobile}
                  </strong>
                </div>
                <div className="truncate">
                  <span className="text-slate-400">Addr:</span>{" "}
                  <span className="text-slate-600 dark:text-slate-300">
                    {selectedCustomer.address_details || "N/A"}
                  </span>
                </div>
                <div className="text-right truncate">
                  <span className="text-slate-400">Prev Due:</span>{" "}
                  <strong className="text-rose-600 font-bold">
                    ৳{selectedCustomer.previous_due_amount || 0}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* 2. CART ITEMS TABLE (Scrollable independently with sticky header) */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6">
                <ShoppingBag className="w-10 h-10 stroke-[1.5] mb-2 opacity-30 text-[#1E65A0]" />
                <p className="text-xs font-bold">Your Cart is Empty</p>
                <p className="text-[11px] text-slate-500 text-center max-w-[220px] mt-0.5">
                  Scan a barcode or click any product from the catalog to add items.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1e293b] border-b border-slate-200 dark:border-slate-800 text-[10.5px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      <tr>
                        <th className="py-1.5 pl-2.5">Item &amp; Specs</th>
                        <th className="py-1.5 text-center w-[142px]">Qty &amp; Unit</th>
                        <th className="py-1.5 text-right w-[74px]">Rate (৳)</th>
                        <th className="py-1.5 text-right w-[74px]">Total (৳)</th>
                        <th className="py-1.5 pr-2 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {cart.map((item) => {
                        const activeUnit = item.selected_unit || item.unit || "Pcs";
                        const isDec = allowsDecimalQty(activeUnit);
                        const unitOptions =
                          item.unit_options && item.unit_options.length > 0
                            ? item.unit_options
                            : getProductUnitOptions(item.base_unit || item.unit || "Pcs");
                        return (
                          <tr
                            key={item.product_id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            <td className="py-1.5 pl-2.5 pr-1.5">
                              <div className="font-bold text-[11.5px] text-slate-800 dark:text-slate-200 line-clamp-1 leading-tight">
                                {item.product_name}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {item.cable_size && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-[#0B3D91] dark:text-blue-300">
                                    ⚡ {item.cable_size}
                                  </span>
                                )}
                                {item.current_rating && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                    ⚡ {item.current_rating}
                                  </span>
                                )}
                                {item.wattage && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                    💡 {item.wattage}
                                  </span>
                                )}
                                {item.gang_module && (
                                  <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300">
                                    ⚡ {item.gang_module}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Compact QTY Controller + Unit on the Right */}
                            <td className="py-1.5 px-1 text-center">
                              <div className="inline-flex items-center justify-center gap-1">
                                <div className="inline-flex items-center rounded-md border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] overflow-hidden shadow-2xs h-[24px]">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const step = isDec && item.quantity <= 1 ? 0.5 : 1;
                                      const next = parseFloat((item.quantity - step).toFixed(2));
                                      updateQty(item.product_id, Math.max(isDec ? 0.25 : 1, next));
                                    }}
                                    className="w-5 h-full flex items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                  >
                                    <Minus className="w-2.5 h-2.5" />
                                  </button>
                                  <input
                                    type="number"
                                    step={isDec ? "any" : "1"}
                                    min={isDec ? "0.05" : "1"}
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      if (!isNaN(val) && val > 0) {
                                        updateQty(item.product_id, val);
                                      }
                                    }}
                                    className="w-10 h-full text-center text-[11px] font-bold bg-transparent border-x border-[#cbd5e1] dark:border-[#334155] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-0.5"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = parseFloat((item.quantity + 1).toFixed(2));
                                      updateQty(item.product_id, next);
                                    }}
                                    className="w-5 h-full flex items-center justify-center hover:bg-blue-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer transition-colors"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                <PosUnitSelector
                                  selectedUnit={activeUnit}
                                  baseSellPrice={item.base_sell_price ?? item.selling_price}
                                  options={unitOptions}
                                  onSelect={(u, ratio) => updateItemUnit(item.product_id, u, ratio)}
                                />
                              </div>
                            </td>

                            {/* Editable Price with Navy/Electric Blue Border */}
                            <td className="py-1.5 text-right">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                value={item.selling_price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  updatePrice(item.product_id, isNaN(val) ? 0 : val);
                                }}
                                className="w-[68px] h-[25px] text-right text-[11px] font-bold font-mono px-1.5 rounded-md border-[1.5px] border-[#1E65A0] dark:border-blue-500 focus:border-[#0B3D91] focus:ring-2 focus:ring-[#1E65A0]/20 bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>

                            {/* Line Total */}
                            <td className="py-1.5 text-right font-bold font-mono text-[11.5px] text-slate-900 dark:text-white">
                              {(item.selling_price * item.quantity).toFixed(2)}
                            </td>

                            {/* Delete */}
                            <td className="py-1.5 pr-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItem(item.product_id)}
                                className="w-6 h-6 rounded-md hover:bg-rose-100 dark:hover:bg-rose-950 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                                title="Remove Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
            )}
          </div>

          {/* 3. STICKY BOTTOM CHECKOUT FOOTER (Strict Rule: Pinned to bottom, responsive) */}
          <div className="border-t border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b]/90 p-2.5 shrink-0 space-y-2">
            {/* Payment Method Selector (6 Pills) */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                <span>Payment Method</span>
                <span className="font-mono text-[#1E65A0] dark:text-blue-400">
                  {paymentMethod}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {[
                  { name: "Cash", color: "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0]" },
                  { name: "bKash", color: "bg-[#e2136e]" },
                  { name: "Nagad", color: "bg-[#f7931e]" },
                  { name: "Rocket", color: "bg-[#8c3294]" },
                  { name: "Bank", color: "bg-blue-600" },
                  { name: "Card", color: "bg-indigo-600" },
                ].map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setPaymentMethod(m.name)}
                    className={`h-[30px] rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                      paymentMethod === m.name
                        ? `${m.color} text-white border-transparent shadow-xs scale-102`
                        : "bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-300 border-[#cbd5e1] dark:border-[#334155] hover:border-[#1E65A0]"
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Note & Transaction ID (hidden for Cash) */}
            {paymentMethod === "Cash" ? (
              <div className="w-full">
                <input
                  type="text"
                  placeholder="Order Note / Remark"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full h-[28px] px-2.5 text-xs rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1E65A0]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  placeholder="Trx ID / Ref No."
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="h-[28px] px-2 text-xs rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1E65A0] font-mono"
                />
                <input
                  type="text"
                  placeholder="Order Note / Remark"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="h-[28px] px-2 text-xs rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#1E65A0]"
                />
              </div>
            )}

            {/* Financial Calculations Grid */}
            <div className="bg-white dark:bg-[#0f172a] p-2 rounded-xl border border-[#cbd5e1] dark:border-[#334155] space-y-1.5 text-xs">
              {/* Subtotal */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Sub-Total:
                </span>
                <span className="font-bold text-sky-600 dark:text-sky-400">
                  {formatBdCurrency(subTotal)}
                </span>
              </div>

              {/* Discount with Flat / Percent pill */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    Discount:
                  </span>
                  <div className="inline-flex rounded-md border border-[#cbd5e1] dark:border-[#334155] overflow-hidden h-[20px]">
                    <button
                      type="button"
                      onClick={() => setDiscountType("flat")}
                      className={`px-1.5 text-[10px] font-bold cursor-pointer ${
                        discountType === "flat"
                          ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      ৳
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      className={`px-1.5 text-[10px] font-bold cursor-pointer ${
                        discountType === "percent"
                          ? "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      %
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {discountType === "percent" && discount > 0 && (
                    <span className="text-[10px] text-rose-600 font-bold">
                      (-{formatBdCurrency(calculatedDiscount)})
                    </span>
                  )}
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={discount || ""}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-18 h-[24px] px-1 text-right font-bold text-xs rounded border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#1E65A0]"
                  />
                </div>
              </div>

              {/* Delivery Charge */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Delivery Charge:
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={deliveryCharge || ""}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  className="w-18 h-[24px] px-1 text-right font-bold text-xs rounded border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] focus:outline-none focus:ring-1 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Exchange Amount */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                  Exchange Amount:
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={returnAdjustment || ""}
                  onChange={(e) => setReturnAdjustment(parseFloat(e.target.value) || 0)}
                  className="w-18 h-[24px] px-1 text-right font-bold text-xs rounded border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-[#1e293b] text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Net Payable / Grand Total */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-xs">
                  Net Payable:
                </span>
                <span className="font-black text-[#0B3D91] dark:text-blue-300 text-sm">
                  {formatBdCurrency(grandTotal)}
                </span>
              </div>

              {/* Paid Amount & Quick "Full Paid" Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">
                    Paid Amount:
                  </span>
                  <button
                    type="button"
                    onClick={handleSetFullPaid}
                    className="px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-[#0B3D91] dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                  >
                    Full Paid
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={paidAmount || ""}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-[26px] px-1 text-right font-black text-xs rounded border-2 border-[#1E65A0] bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              {/* Due Amount & Status */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-600 uppercase tracking-wider text-[11px]">
                    Current Due:
                  </span>
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                      paymentStatus === "PAID"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-900"
                        : paymentStatus === "PARTIAL PAID"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    }`}
                  >
                    {paymentStatus}
                  </span>
                </div>
                <span className="font-black text-rose-600 text-xs">
                  {formatBdCurrency(dueAmount)}
                </span>
              </div>

              {/* Total Due with Previous Customer Due */}
              {selectedCustomer && selectedCustomer.previous_due_amount > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span>Total Due (inc. Previous ৳{selectedCustomer.previous_due_amount}):</span>
                  <strong className="text-rose-700 dark:text-rose-400 font-bold">
                    {formatBdCurrency(totalDueWithPrev)}
                  </strong>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (Hold, Clear, Big Submit Order) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {/* Hold Button */}
              <button
                type="button"
                onClick={handleHoldInvoice}
                className="h-[40px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                title="Hold current order (F8)"
              >
                <PauseCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Hold</span>
              </button>

              {/* Clear Cart Button */}
              <button
                type="button"
                onClick={clearCart}
                className="h-[40px] rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Clear current cart"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>

              {/* Submit Order (F4) Button - Takes 2 Columns */}
              <button
                type="button"
                disabled={isSubmitting || cart.length === 0}
                onClick={handleSubmitOrder}
                className={`col-span-2 h-[40px] rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                  isSubmitting || cart.length === 0
                    ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white hover:shadow-lg active:scale-98"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Submit Order (F4)</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MOBILE / TABLET FLOATING DOCK (Shown on screens < 1024px) */}
      <div className="lg:hidden p-2 bg-slate-900/95 text-white backdrop-blur-md border-t border-slate-800 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-5 h-5 text-blue-300" />
            <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#F59E0B] text-slate-950 text-[10px] font-bold flex items-center justify-center">
              {cart.length}
            </span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Total Payable</div>
            <div className="text-xs font-black text-white">
              {formatBdCurrency(grandTotal)}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileTab(mobileTab === "catalog" ? "cart" : "catalog")}
          className="h-[36px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <span>{mobileTab === "catalog" ? "View Cart / Checkout" : "Back to Catalog"}</span>
        </button>
      </div>

      {/* MODALS */}
      {/* 1. Thermal Receipt Modal */}
      {receiptData && (
        <ThermalReceiptModal
          receiptData={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}

      {/* 2. Camera Barcode/QR Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onScanSuccess={(code) => handleScanCode(code)}
      />

      {/* 3. Customer Create Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onCustomerCreated={(newCust) => {
          setCustomers((curr) => [newCust, ...curr]);
          setCustomer(newCust);
          showToast(`Customer created: ${newCust.customer_name}`, "success");
        }}
      />

      {/* 4. Held Invoices Modal */}
      <HeldInvoicesModal
        isOpen={isHeldModalOpen}
        onClose={() => setIsHeldModalOpen(false)}
        heldList={heldInvoices}
        onRestore={handleRestoreHeld}
        onDelete={handleDeleteHeld}
      />

      {/* 5. Quick Add Product Modal */}
      <QuickProductModal
        isOpen={isQuickProductModalOpen}
        onClose={() => setIsQuickProductModalOpen(false)}
        categories={categories}
        brands={brands}
        units={units}
        onProductCreated={(created: any) => {
          const spec = created.electrical_specifications || created.electrical_spec;
          const formatted: Product = {
            id: created.id,
            name: created.product_name,
            product_name: created.product_name,
            primary_code: Array.isArray(created.product_code) ? created.product_code[0] : (created.product_code || ""),
            display_codes: Array.isArray(created.product_code) ? created.product_code.join(", ") : (created.product_code || ""),
            all_codes: Array.isArray(created.product_code) ? created.product_code : (created.product_code ? [created.product_code] : []),
            cost_price: parseFloat(created.cost_price || "0"),
            sell_price: parseFloat(created.sell_price || "0"),
            quantity: parseFloat(created.quantity || "1"),
            category_id: Number(created.category_id),
            category: categories.find((c) => c.id === Number(created.category_id))?.category_name || "N/A",
            brand: brands.find((b) => b.id === Number(created.brand_id))?.name || "N/A",
            unit: units.find((u) => u.id === Number(created.unit_id))?.unit_name || "Pcs",
            electrical_spec: spec ? {
              spec_type: spec.spec_type,
              cable_size: spec.cable_size,
              current_rating: spec.current_rating,
              voltage_grade: spec.voltage_grade,
              gang_module: spec.gang_module,
              wattage: spec.wattage,
            } : null,
          };
          setProducts((curr) => [formatted, ...curr]);
          ringProduct(formatted);
          showToast(`Created & Added: ${formatted.name}`, "success");
        }}
      />
    </div>
  );
}
