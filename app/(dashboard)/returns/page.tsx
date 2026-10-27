"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  RotateCcw,
  Plus,
  Search,
  Calendar,
  Clock,
  ShoppingCart,
  Truck,
  ArrowRight,
  CheckSquare,
  Check,
  X,
  Loader2,
  Barcode,
  Layers,
  Sparkles,
  Eye,
  FileText,
  Printer,
  User,
  ExternalLink,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect, Pagination } from "@/components/ui";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { formatBoxAndPcs, formatTileOrItemQty, parseBoxAndPcs } from "@/lib/tiles-calculator";
import { useToast } from "@/components/ui/toast";

interface ReturnItem {
  id: number;
  type: "sales" | "purchase";
  record_no: string;
  order_id?: number;
  customer_id?: number;
  purchase_id?: number;
  supplier_id?: number;
  party_name: string;
  party_mobile: string;
  product_id: number | null;
  product_name: string;
  product_code: string;
  tile_size?: string | null;
  pcs_per_box?: number | null;
  unit?: string | null;
  is_tiles?: boolean;
  quantity: number;
  amount: number;
  discount_amount: number;
  due_amount: number;
  date: string;
  created_at: string | null;
}

interface SummaryData {
  total_records: number;
  total_amount: number;
  total_quantity: number;
}

interface SearchItemLine {
  detail_id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  tile_size?: string | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  surface_finish?: string | null;
  unit?: string | null;
  is_tiles?: boolean;
  purchased_quantity: number;
  total_purchased_pcs?: number;
  already_returned_quantity: number;
  returnable_quantity: number;
  unit_price: number;
  raw_unit_price?: number;
  box_price?: number;
  total_selling_price?: number;
  already_returned_amount?: number;
  remaining_line_total?: number;
  subtotal?: number;
}

interface SearchRecordData {
  id: number;
  order_no?: string;
  purchase_no?: string;
  customer_id?: number;
  customer_name?: string;
  customer_mobile?: string;
  supplier_id?: number;
  supplier_name?: string;
  supplier_mobile?: string;
  invoice_date?: string;
  purchase_date?: string;
  sub_total?: number;
  grand_subtotal?: number;
  paid_amount: number;
  due_amount: number;
  discount_amount?: number;
  items: SearchItemLine[];
}

function formatReturnDisplayQty(item: {
  type: "sales" | "purchase";
  quantity: number;
  tile_size?: string | null;
  pcs_per_box?: number | null;
  unit?: string | null;
  is_tiles?: boolean;
}) {
  if (item.type === "sales") {
    return `${item.quantity} Pcs`;
  }
  return formatTileOrItemQty(item.quantity, item);
}

function ReturnsManagementContent() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Mode Tab: 'sales' or 'purchase'
  const [activeTab, setActiveTab] = useState<"sales" | "purchase">("sales");

  // History List State
  const [returnsList, setReturnsList] = useState<ReturnItem[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [historySearch, setHistorySearch] = useState("");
  const [quickSearchInput, setQuickSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Quick View & Print Modals (MARSS Reference)
  const [selectedReturnForQuickView, setSelectedReturnForQuickView] = useState<ReturnItem | null>(null);
  const [selectedReturnForPrint, setSelectedReturnForPrint] = useState<ReturnItem | null>(null);

  // Return Processing Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [modalSearching, setModalSearching] = useState(false);
  const [loadedRecord, setLoadedRecord] = useState<SearchRecordData | null>(null);

  // Modal Return Form State
  const [selectedItems, setSelectedItems] = useState<{ [detailId: number]: boolean }>({});
  const [returnQuantities, setReturnQuantities] = useState<{ [detailId: number]: number }>({});
  const [modalReturnDate, setModalReturnDate] = useState(new Date().toISOString().split("T")[0]);
  const [modalReturnNote, setModalReturnNote] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // 1. Fetch History List
  const fetchReturnList = async (tab: "sales" | "purchase") => {
    try {
      setLoading(true);
      const url = `/api/returns?type=${tab}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "success") {
        setReturnsList(data.data || []);
        setSummary(data.summary || null);
      } else {
        setReturnsList([]);
        setSummary(null);
      }
    } catch (err) {
      console.error("Error loading returns list:", err);
      toast.error("Failed to load return history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnList(activeTab);
  }, [activeTab]);

  // Handle URL Query Params
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const orderNoParam = searchParams.get("order_no");
    const purchaseNoParam = searchParams.get("purchase_no");

    if (tabParam === "purchase" || purchaseNoParam) {
      setActiveTab("purchase");
      if (purchaseNoParam) {
        openModalForRecord(purchaseNoParam, "purchase");
      }
    } else if (tabParam === "sales" || orderNoParam) {
      setActiveTab("sales");
      if (orderNoParam) {
        openModalForRecord(orderNoParam, "sales");
      }
    }
  }, [searchParams]);

  // Handle Tab Switch
  const handleTabSwitch = (tab: "sales" | "purchase") => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setHistorySearch("");
    setQuickSearchInput("");
    setCurrentPage(1);
  };

  // 2. Open Modal & Load Record
  const openModalForRecord = async (prefillQuery: string = "", targetTab?: "sales" | "purchase") => {
    const currentTab = targetTab || activeTab;
    if (targetTab && targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
    setLoadedRecord(null);
    setSelectedItems({});
    setReturnQuantities({});
    setModalReturnDate(new Date().toISOString().split("T")[0]);
    setModalReturnNote("");
    setModalSearchQuery(prefillQuery);
    setIsModalOpen(true);

    if (prefillQuery.trim()) {
      await searchRecordForReturn(prefillQuery.trim(), currentTab);
    }
  };

  // Search invoice/purchase
  const searchRecordForReturn = async (queryText: string, targetTab?: "sales" | "purchase") => {
    const currentTab = targetTab || activeTab;
    const q = queryText.trim();
    if (!q) {
      toast.error(
        currentTab === "purchase"
          ? "Please enter a purchase memo number"
          : "Please enter an invoice number"
      );
      return;
    }

    setModalSearching(true);
    try {
      const url = `/api/returns/search?type=${currentTab}&query=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.status === "success" && data.data) {
        setLoadedRecord(data.data);

        // Pre-initialize selection & quantities
        const initSelect: { [key: number]: boolean } = {};
        const initQty: { [key: number]: number } = {};

        data.data.items.forEach((item: SearchItemLine) => {
          initSelect[item.detail_id] = false;
          initQty[item.detail_id] = item.returnable_quantity > 0 ? 1 : 0;
        });

        setSelectedItems(initSelect);
        setReturnQuantities(initQty);
      } else {
        setLoadedRecord(null);
        toast.error(data.message || (currentTab === "purchase" ? "Purchase record not found" : "Invoice not found"));
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast.error("Network error while searching record");
    } finally {
      setModalSearching(false);
    }
  };

  // Quick search from inline card
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearchInput.trim()) {
      toast.error(
        activeTab === "purchase"
          ? "Please enter a purchase memo number"
          : "Please enter an invoice number"
      );
      return;
    }
    openModalForRecord(quickSearchInput.trim());
  };

  // Item Checkbox Toggle
  const toggleItemCheckbox = (detailId: number, maxQty: number) => {
    setSelectedItems((prev) => {
      const nextChecked = !prev[detailId];
      if (nextChecked && (!returnQuantities[detailId] || returnQuantities[detailId] <= 0)) {
        setReturnQuantities((qPrev) => ({ ...qPrev, [detailId]: Math.min(1, maxQty) }));
      }
      return { ...prev, [detailId]: nextChecked };
    });
  };

  // Select All Toggle
  const toggleSelectAll = (checked: boolean) => {
    if (!loadedRecord) return;
    const newSelect: { [key: number]: boolean } = {};
    const newQty: { [key: number]: number } = { ...returnQuantities };

    loadedRecord.items.forEach((item) => {
      if (item.returnable_quantity > 0) {
        newSelect[item.detail_id] = checked;
        if (checked && (!newQty[item.detail_id] || newQty[item.detail_id] <= 0)) {
          newQty[item.detail_id] = 1;
        }
      } else {
        newSelect[item.detail_id] = false;
      }
    });

    setSelectedItems(newSelect);
    setReturnQuantities(newQty);
  };

  // Quantity Change Handler
  const handleQuantityChange = (detailId: number, val: number, maxQty: number) => {
    const num = isNaN(val) ? 0 : val;
    const clamped = num <= 0 ? 0 : Math.min(num, maxQty);
    setReturnQuantities((prev) => ({ ...prev, [detailId]: clamped }));
    if (clamped > 0) {
      setSelectedItems((prev) => ({ ...prev, [detailId]: true }));
    }
  };

  // Helper to calculate exact refund amount for an item to prevent missing poysha
  const getItemRefundAmount = (item: SearchItemLine, returnQty: number): number => {
    if (!returnQty || returnQty <= 0) return 0;
    // When returning all remaining returnable units, return the exact remaining line balance
    if (returnQty >= item.returnable_quantity && item.remaining_line_total !== undefined) {
      return item.remaining_line_total;
    }
    const price = item.raw_unit_price || item.unit_price || 0;
    const calc = Math.round(returnQty * price * 100) / 100;
    if (item.remaining_line_total !== undefined) {
      return Math.min(calc, item.remaining_line_total);
    }
    return calc;
  };

  // Recalculate Grand Refund Total
  const grandRefundTotal = useMemo(() => {
    if (!loadedRecord) return 0;
    let total = 0;
    loadedRecord.items.forEach((item) => {
      if (selectedItems[item.detail_id]) {
        const qty = returnQuantities[item.detail_id] || 0;
        total += getItemRefundAmount(item, qty);
      }
    });
    return Math.round(total * 100) / 100;
  }, [loadedRecord, selectedItems, returnQuantities]);

  // Submit Return Form
  const handleSubmitReturn = async () => {
    if (!loadedRecord) return;

    const returnedProducts: {
      order_detail_id?: number;
      purchase_order_detail_id?: number;
      product_id: number;
      quantity: number;
    }[] = [];

    loadedRecord.items.forEach((item) => {
      if (selectedItems[item.detail_id]) {
        const qty = returnQuantities[item.detail_id] || 0;
        if (qty > 0) {
          if (activeTab === "purchase") {
            returnedProducts.push({
              purchase_order_detail_id: item.detail_id,
              product_id: item.product_id,
              quantity: qty,
            });
          } else {
            returnedProducts.push({
              order_detail_id: item.detail_id,
              product_id: item.product_id,
              quantity: qty,
            });
          }
        }
      }
    });

    if (returnedProducts.length === 0) {
      toast.error("Please select at least one item with a return quantity greater than 0");
      return;
    }

    setSubmittingReturn(true);
    try {
      const payload: any = {
        type: activeTab,
        date: modalReturnDate,
        note: modalReturnNote,
        products: returnedProducts,
      };

      if (activeTab === "purchase") {
        payload.purchase_id = loadedRecord.id;
        payload.supplier_id = loadedRecord.supplier_id;
      } else {
        payload.order_id = loadedRecord.id;
        payload.customer_id = loadedRecord.customer_id;
      }

      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Return processed successfully!");
        setIsModalOpen(false);
        setQuickSearchInput("");
        fetchReturnList(activeTab);
      } else {
        toast.error(data.message || "Failed to process return");
      }
    } catch (err: any) {
      console.error("Submission error:", err);
      toast.error(err?.message || "An error occurred while saving the return");
    } finally {
      setSubmittingReturn(false);
    }
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    if (!historySearch.trim()) return returnsList;
    const q = historySearch.toLowerCase();
    return returnsList.filter(
      (r) =>
        r.record_no.toLowerCase().includes(q) ||
        r.party_name.toLowerCase().includes(q) ||
        r.party_mobile.includes(q) ||
        r.product_name.toLowerCase().includes(q) ||
        r.product_code.toLowerCase().includes(q)
    );
  }, [returnsList, historySearch]);

  const startIndex = (currentPage - 1) * pageSize;
  const displayedHistory = filteredHistory.slice(startIndex, startIndex + pageSize);

  const isAllEligibleSelected =
    loadedRecord &&
    loadedRecord.items.filter((i) => i.returnable_quantity > 0).length > 0 &&
    loadedRecord.items
      .filter((i) => i.returnable_quantity > 0)
      .every((i) => selectedItems[i.detail_id]);

  return (
    <div className="space-y-4">
      {/* 1. Top Section: Page Title & Process Return Button (Fixed 38px, Rule 5.1) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-slate-800 shadow-2xs shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight m-0">
              Sales Return Management
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              PROTIKKHA ELECTRIC - Customer Sales Return &amp; Refund Processing
            </p>
          </div>
        </div>

        {/* Primary Action Button (Fixed 38px) */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={() => openModalForRecord("")}
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Sales Return</span>
          </button>
        </div>
      </div>

      {/* 3. Quick Search Box (Fixed 38px, MARSS reference layout with brand navy left border) */}
      <div
        className="rounded-2xl border border-[#cbd5e1] dark:border-[#334155] bg-blue-50/40 dark:bg-slate-900/40 p-4 shadow-xs"
        style={{ borderLeft: "4.5px solid #0B3D91" }}
      >
        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
          <Search className="w-4 h-4 text-[#1E65A0]" />
          <span>
            {activeTab === "purchase"
              ? "Quick Purchase Memo Search & Process Return"
              : "Quick Invoice Search & Process Return"}
          </span>
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5">
          {activeTab === "purchase"
            ? "Search purchase memo number or supplier to process return to supplier:"
            : "Search invoice number to process sales return:"}
        </p>

        <form onSubmit={handleQuickSearchSubmit} className="flex flex-row items-stretch gap-2.5">
          <div className="flex-1 min-w-0 h-[38px] flex items-center px-3 bg-white dark:bg-slate-800/90 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-600/20 shadow-xs transition-all">
            <input
              type="text"
              value={quickSearchInput}
              onChange={(e) => setQuickSearchInput(e.target.value)}
              placeholder={
                activeTab === "purchase"
                  ? "Enter purchase memo number (e.g. #PurID00001 or 1)..."
                  : "Enter invoice number (e.g. #InvID00001 or ORD-20261014-6701)..."
              }
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 h-[38px] rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] active:scale-[0.98] text-white text-xs font-bold shadow-xs transition-all shrink-0 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Search & Return</span>
          </button>
        </form>
      </div>

      {/* 4. History Controls Row: Title + Search & Entries */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* History Title & Count Badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white tracking-tight m-0 flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>{activeTab === "purchase" ? "Purchase Return History" : "Sales Return History"}</span>
            </h3>
            <span className="font-bold text-rose-700 dark:text-rose-300 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 text-xs">
              {filteredHistory.length} Records
            </span>
          </div>

          {/* Search Bar + Show Entries */}
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Filter Search */}
            <div className="flex-1 md:w-64 h-[38px] flex items-center px-3 bg-white dark:bg-slate-800/90 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-600/20 shadow-xs transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => {
                  setHistorySearch(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filter returns..."
                className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Show Entries Selector */}
            <div className="w-[125px]">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: "15", label: "Show: 15" },
                  { value: "50", label: "Show: 50" },
                  { value: "100", label: "Show: 100" },
                  { value: "200", label: "Show: 200" },
                  { value: "500", label: "Show: 500" },
                ]}
                matchTriggerWidth={true}
                minPopoverWidth={125}
                className="[&_button]:!min-h-[38px] [&_button]:!h-[38px] [&_button]:!py-1"
              />
            </div>
          </div>
        </div>

        {/* 5. Desktop History Table (MARSS reference layout with solid brand header) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-semibold uppercase tracking-wider whitespace-nowrap">
                <th className="p-3 text-center w-[45px]">SL</th>
                <th className="p-3 w-[120px] whitespace-nowrap">Return Date</th>
                <th className="p-3 min-w-[170px] whitespace-nowrap">
                  {activeTab === "purchase" ? "Purchase Memo No" : "Invoice No"}
                </th>
                <th className="p-3">
                  {activeTab === "purchase" ? "Supplier Name" : "Customer Name"}
                </th>
                <th className="p-3">Returned Product</th>
                <th className="p-3 text-center w-[110px]">Qty</th>
                <th className="p-3 text-right w-[150px]">
                  {activeTab === "purchase" ? "Adjusted Amount" : "Refund Amount"}
                </th>
                <th className="p-3 text-center w-[120px] whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-rose-600" />
                    Loading return records...
                  </td>
                </tr>
              ) : displayedHistory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No return records found. Use the search box above to process a return.
                  </td>
                </tr>
              ) : (
                displayedHistory.map((item, idx) => {
                  const returnBadge = `#RET${String(item.id).padStart(5, "0")}`;
                  const invoiceUrl =
                    item.type === "purchase"
                      ? item.purchase_id
                        ? `/purchases/${item.purchase_id}`
                        : null
                      : item.order_id
                      ? `/invoices/${item.order_id}`
                      : null;
                  const profileUrl =
                    item.type === "purchase"
                      ? item.supplier_id
                        ? `/suppliers/${item.supplier_id}`
                        : null
                      : item.customer_id
                      ? `/customers/${item.customer_id}`
                      : null;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-3 text-center font-bold text-slate-400">
                        {startIndex + idx + 1}
                      </td>
                      <td className="p-3 font-medium whitespace-nowrap text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-rose-600" />
                          <span>{item.date || "N/A"}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {/* Return Badge */}
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs">
                            {returnBadge}
                          </span>
                          {/* Clickable Original Invoice / Memo Link */}
                          {invoiceUrl ? (
                            <Link
                              href={invoiceUrl}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded-md hover:bg-rose-100 hover:text-rose-800 dark:hover:bg-rose-900/60 transition-colors group/inv cursor-pointer"
                              title={`Open Original ${item.type === "purchase" ? "Purchase Memo" : "Invoice"} ${item.record_no}`}
                            >
                              <span>{item.record_no}</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover/inv:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {item.record_no}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        {profileUrl ? (
                          <Link
                            href={profileUrl}
                            className="font-bold text-slate-800 dark:text-white hover:text-rose-700 dark:hover:text-rose-400 hover:underline transition-colors inline-flex items-center gap-1 group/party"
                            title={`View ${item.type === "purchase" ? "Supplier" : "Customer"} Profile`}
                          >
                            <span>{item.party_name}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-rose-600 opacity-0 group-hover/party:opacity-100 transition-opacity" />
                          </Link>
                        ) : (
                          <div className="font-bold text-slate-800 dark:text-white">{item.party_name}</div>
                        )}
                        {item.party_mobile && (
                          <div className="text-[10px] text-slate-400 font-normal">{item.party_mobile}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800 dark:text-white">{item.product_name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-400">Code: {item.product_code}</span>
                          {item.tile_size && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                              📐 {item.tile_size}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-white">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-xs whitespace-nowrap">
                          {formatReturnDisplayQty(item)}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-rose-700 dark:text-rose-400 text-xs">
                        {formatBdCurrency(item.amount)}
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Quick View Summary (Eye) */}
                          <button
                            type="button"
                            onClick={() => setSelectedReturnForQuickView(item)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs cursor-pointer"
                            title="Quick View Summary"
                            aria-label="Quick View"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* 2. Open Original Invoice / Purchase (FileText) */}
                          {invoiceUrl && (
                            <Link
                              href={invoiceUrl}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                              title={`Open Original ${item.type === "purchase" ? "Purchase Memo" : "Invoice"}`}
                              aria-label="Open Transaction"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          {/* 3. Customer / Supplier Profile (User) */}
                          {profileUrl && (
                            <Link
                              href={profileUrl}
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-600 hover:text-white transition-all shadow-2xs"
                              title={`View ${item.type === "purchase" ? "Supplier" : "Customer"} Profile`}
                              aria-label="View Profile"
                            >
                              <User className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredHistory.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-rose-200 dark:border-rose-900/50 text-xs">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-slate-600 dark:text-slate-300">
                    Total Returned Refund Value:
                  </td>
                  <td className="p-3 text-center font-bold text-slate-900 dark:text-white whitespace-nowrap">
                    {(() => {
                      const hasTiles = filteredHistory.some((i) => Boolean(i.tile_size || i.pcs_per_box));
                      const totalQty = filteredHistory.reduce((acc, i) => acc + i.quantity, 0);
                      if (hasTiles) {
                        let totalBoxes = 0;
                        let totalPcs = 0;
                        filteredHistory.forEach((i) => {
                          const isTile = Boolean(i.tile_size || i.pcs_per_box);
                          if (isTile) {
                            const { fullBoxes, pcs } = parseBoxAndPcs(i.quantity, i.pcs_per_box, i.tile_size);
                            totalBoxes += fullBoxes;
                            totalPcs += pcs;
                          } else {
                            totalPcs += i.quantity;
                          }
                        });
                        if (totalBoxes > 0 && totalPcs > 0) return `${totalBoxes} Boxes ${totalPcs} Pcs`;
                        if (totalBoxes > 0) return `${totalBoxes} Box${totalBoxes > 1 ? "es" : ""}`;
                        if (totalPcs > 0) return `${totalPcs} Pcs`;
                        return "0 Box";
                      }
                      return `${totalQty} Pcs`;
                    })()}
                  </td>
                  <td className="p-3 text-right font-black text-rose-700 dark:text-rose-400 text-sm">
                    {formatBdCurrency(filteredHistory.reduce((acc, i) => acc + i.amount, 0))}
                  </td>
                  <td className="p-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* 6. Mobile Card List (< 768px) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="p-6 text-center text-slate-400 text-xs">Loading records...</div>
          ) : displayedHistory.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">No return records found.</div>
          ) : (
            displayedHistory.map((item, idx) => {
              const returnBadge = `#RET${String(item.id).padStart(5, "0")}`;
              const invoiceUrl =
                item.type === "purchase"
                  ? item.purchase_id
                    ? `/purchases/${item.purchase_id}`
                    : null
                  : item.order_id
                  ? `/invoices/${item.order_id}`
                  : null;
              const profileUrl =
                item.type === "purchase"
                  ? item.supplier_id
                    ? `/suppliers/${item.supplier_id}`
                    : null
                  : item.customer_id
                  ? `/customers/${item.customer_id}`
                  : null;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-800/60 p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold flex items-center justify-center text-slate-500">
                        #{startIndex + idx + 1}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                        {returnBadge}
                      </span>
                      {invoiceUrl ? (
                        <Link
                          href={invoiceUrl}
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2 py-0.5 rounded hover:bg-rose-100"
                        >
                          <span>{item.record_no}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {item.record_no}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-rose-600" />
                      {item.date}
                    </span>
                  </div>

                  <div>
                    {profileUrl ? (
                      <Link
                        href={profileUrl}
                        className="font-bold text-xs text-slate-800 dark:text-white hover:text-rose-600 inline-flex items-center gap-1"
                      >
                        <span>{item.party_name}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-rose-600" />
                      </Link>
                    ) : (
                      <div className="font-bold text-xs text-slate-800 dark:text-white">
                        {item.party_name}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">{item.product_name}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Qty</span>
                      <span className="font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {formatReturnDisplayQty(item)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Refund Value</span>
                      <span className="font-black text-rose-700 dark:text-rose-400 text-sm">
                        {formatBdCurrency(item.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Action Buttons Row */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedReturnForQuickView(item)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-slate-700 hover:bg-emerald-600 hover:text-white flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Quick View</span>
                    </button>

                    {invoiceUrl && (
                      <Link
                        href={invoiceUrl}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-slate-700 hover:bg-blue-600 hover:text-white flex items-center gap-1 transition-all"
                      >
                        <FileText className="w-3 h-3" />
                        <span>{item.type === "purchase" ? "Memo" : "Invoice"}</span>
                      </Link>
                    )}

                    {profileUrl && (
                      <Link
                        href={profileUrl}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-slate-700 hover:bg-purple-600 hover:text-white flex items-center gap-1 transition-all"
                      >
                        <User className="w-3 h-3" />
                        <span>Profile</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredHistory.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[15, 50, 100, 200, 500]}
        />
      </div>

      {/* 7. Return Processing Modal (Unified Architecture & MARSS Reference Workflow) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Brand Gradient & Circular Close Button */}
            <div className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white tracking-tight m-0">
                  {activeTab === "purchase" ? "Purchase Return Processing" : "Sales Return Processing"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Inner Search Box */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeTab === "purchase" ? "Search Purchase Memo Number" : "Search Invoice Number"}
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[38px] flex items-center px-3 bg-white dark:bg-slate-700/60 rounded-xl border border-[#cbd5e1] dark:border-[#334155] focus-within:border-rose-600 focus-within:ring-2 focus-within:ring-rose-600/20 shadow-xs">
                    <input
                      type="text"
                      value={modalSearchQuery}
                      onChange={(e) => setModalSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          searchRecordForReturn(modalSearchQuery);
                        }
                      }}
                      placeholder={
                        activeTab === "purchase"
                          ? "e.g. #PurID00001 or 1"
                          : "e.g. #InvID00001 or ORD-20261014-6701"
                      }
                      className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => searchRecordForReturn(modalSearchQuery)}
                    disabled={modalSearching}
                    className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {modalSearching ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    <span>Search</span>
                  </button>
                </div>
              </div>

              {/* Invoice Summary Card */}
              {loadedRecord && (
                <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800 dark:text-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {activeTab === "purchase" ? "Purchase Memo No:" : "Invoice / Order No:"}
                      </span>
                      <h4 className="font-mono font-bold text-sm text-rose-700 dark:text-rose-400 mt-0.5">
                        {activeTab === "purchase" ? loadedRecord.purchase_no : loadedRecord.order_no}
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-2">
                        {activeTab === "purchase" ? "Supplier Name:" : "Customer Name:"}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white block">
                        {activeTab === "purchase"
                          ? `${loadedRecord.supplier_name} (${loadedRecord.supplier_mobile})`
                          : `${loadedRecord.customer_name} (${loadedRecord.customer_mobile})`}
                      </span>
                    </div>

                    <div className="sm:text-right space-y-1">
                      <div className="text-slate-500 dark:text-slate-400">
                        Date:{" "}
                        <strong className="text-slate-800 dark:text-white">
                          {activeTab === "purchase"
                            ? loadedRecord.purchase_date
                            : loadedRecord.invoice_date}
                        </strong>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Sub Total:{" "}
                        <strong className="text-slate-800 dark:text-white">
                          {formatBdCurrency(
                            activeTab === "purchase"
                              ? loadedRecord.grand_subtotal || 0
                              : loadedRecord.sub_total || 0
                          )}
                        </strong>
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        Paid:{" "}
                        <strong className="text-emerald-600">
                          {formatBdCurrency(loadedRecord.paid_amount || 0)}
                        </strong>{" "}
                        | Due:{" "}
                        <strong className="text-rose-600 font-bold">
                          {formatBdCurrency(loadedRecord.due_amount || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items Return Table */}
              {loadedRecord && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-rose-600" />
                      <span>Select items to return:</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Check item and enter quantity
                    </span>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white text-[11px] font-semibold uppercase tracking-wider">
                          <th className="p-2.5 text-center w-[40px]">
                            <input
                              type="checkbox"
                              checked={Boolean(isAllEligibleSelected)}
                              onChange={(e) => toggleSelectAll(e.target.checked)}
                              className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                              title="Select All Eligible Items"
                            />
                          </th>
                          <th className="p-2.5">Product Name</th>
                          <th className="p-2.5 text-center w-[120px]">Purchased</th>
                          <th className="p-2.5 text-right w-[110px]">Unit Price</th>
                          <th className="p-2.5 text-center w-[130px]">Return Qty</th>
                          <th className="p-2.5 text-right w-[120px] pr-4">Refund Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-200">
                        {loadedRecord.items.map((item) => {
                          const isChecked = Boolean(selectedItems[item.detail_id]);
                          const returnQty = returnQuantities[item.detail_id] || 0;
                          const lineRefund = getItemRefundAmount(item, returnQty);
                          const isEligible = item.returnable_quantity > 0;

                          return (
                            <tr
                              key={item.detail_id}
                              className={`transition-colors ${
                                isChecked
                                  ? "bg-rose-50/50 dark:bg-rose-950/30"
                                  : !isEligible
                                  ? "opacity-40 bg-slate-50 dark:bg-slate-800/20"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                              }`}
                            >
                              <td className="p-2.5 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!isEligible}
                                  checked={isChecked}
                                  onChange={() =>
                                    toggleItemCheckbox(item.detail_id, item.returnable_quantity)
                                  }
                                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed"
                                />
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-800 dark:text-white">
                                  {item.product_name}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] text-slate-400">
                                    {item.product_code}
                                  </span>
                                  {item.tile_size && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                                      📐 {item.tile_size}
                                    </span>
                                  )}
                                  {item.already_returned_quantity > 0 && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">
                                      Returned: {item.already_returned_quantity} Pcs
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                <div className="whitespace-nowrap font-bold">
                                  {formatTileOrItemQty(item.purchased_quantity, item)}
                                </div>
                                {item.is_tiles && item.total_purchased_pcs ? (
                                  <div className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                      Total: {item.total_purchased_pcs.toLocaleString()} Pcs
                                    </span>
                                  </div>
                                ) : null}
                                {item.returnable_quantity < (item.total_purchased_pcs || item.purchased_quantity) && (
                                  <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap mt-0.5">
                                    Eligible: {item.returnable_quantity.toLocaleString()} Pcs
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-semibold text-slate-700 dark:text-slate-300">
                                <div className="font-bold">
                                  {item.is_tiles && item.unit_price && (item.unit_price * 100) % 1 !== 0
                                    ? `৳ ${parseFloat(item.unit_price.toFixed(4))}`
                                    : formatBdCurrency(item.unit_price)}
                                </div>
                                {item.is_tiles && (
                                  <div className="text-[10px] text-slate-400 font-normal">/ pc</div>
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center justify-center">
                                  <div className="inline-flex items-center rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 overflow-hidden focus-within:border-rose-600 shadow-2xs">
                                    <input
                                      type="number"
                                      min="1"
                                      max={item.returnable_quantity}
                                      disabled={!isChecked || !isEligible}
                                      value={isChecked ? (returnQty > 0 ? returnQty : "") : 0}
                                      onChange={(e) =>
                                        handleQuantityChange(
                                          item.detail_id,
                                          parseInt(e.target.value) || 0,
                                          item.returnable_quantity
                                        )
                                      }
                                      placeholder="0"
                                      className="w-16 h-[34px] px-2 text-center font-bold text-slate-800 dark:text-white bg-transparent focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                                    />
                                    <span className="px-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700/50 border-l border-[#cbd5e1] dark:border-[#334155] h-[34px] flex items-center select-none uppercase">
                                      {item.is_tiles ? "Pcs" : (item.unit || "Pcs")}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-2.5 text-right pr-4 font-bold text-rose-700 dark:text-rose-400">
                                {isChecked ? formatBdCurrency(lineRefund) : "৳ 0.00"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                        <tr>
                          <td colSpan={5} className="p-2.5 text-right text-xs uppercase text-slate-500">
                            Total Refund Amount:
                          </td>
                          <td className="p-2.5 text-right pr-4 font-black text-rose-700 dark:text-rose-400 text-sm">
                            {formatBdCurrency(grandRefundTotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Return Date & Note (2 Columns) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Return Date <span className="text-red-500">*</span>
                      </label>
                      <CustomDatePicker
                        value={modalReturnDate}
                        onChange={(val) => setModalReturnDate(val)}
                        placeholder="DD/MM/YYYY"
                        placement="auto"
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Return Reason / Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={modalReturnNote}
                        onChange={(e) => setModalReturnNote(e.target.value)}
                        placeholder="e.g. Customer returned extra tiles or broken goods..."
                        className="w-full h-[42px] px-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-[#1E65A0]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer: Red Cancel & Brand Gradient Process Return */}
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {loadedRecord && (
                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={submittingReturn || grandRefundTotal <= 0}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingReturn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing Return...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Process Return</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Quick View Summary Modal (MARSS Reference) */}
      {selectedReturnForQuickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="w-full max-w-3xl sm:max-w-4xl bg-white dark:bg-slate-900 rounded-[16px] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Brand Gradient & Circular Close Button */}
            <div className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-6 py-4 flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className="w-8 h-8 rounded-lg bg-white/20 text-white flex items-center justify-center shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight m-0">
                    {selectedReturnForQuickView.type === "purchase"
                      ? "Purchase Return Summary"
                      : "Sales Return Summary"}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="bg-white/20 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-white/30">
                      {`#RET${String(selectedReturnForQuickView.id).padStart(5, "0")}`}
                    </span>
                    <span className="bg-emerald-500/30 text-emerald-100 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                      {selectedReturnForQuickView.type === "purchase" ? "Supplier Return" : "Customer Return"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReturnForQuickView(null)}
                className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* KPI Cards Grid: 4 columns */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Return Date
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedReturnForQuickView.date || "N/A"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center">
                  <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Returned Qty
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {formatReturnDisplayQty(selectedReturnForQuickView)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-center">
                  <span className="block text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
                    {selectedReturnForQuickView.type === "purchase" ? "Adjusted Amount" : "Refund Amount"}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400">
                    {formatBdCurrency(selectedReturnForQuickView.amount)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-center">
                  <span className="block text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                    Due Adjustment
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {formatBdCurrency(selectedReturnForQuickView.due_amount)}
                  </span>
                </div>
              </div>

              {/* Return Specifications Box */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-5 py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Return Specifications</span>
                  <span className="text-rose-700 dark:text-rose-400 font-bold">
                    {selectedReturnForQuickView.type === "purchase" ? "Purchase Return" : "Sales Return"}
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700 text-xs">
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-white dark:bg-slate-800/90">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Return ID:</span>
                    <span className="col-span-2 font-mono font-bold text-slate-800 dark:text-slate-100">
                      {`#RET${String(selectedReturnForQuickView.id).padStart(5, "0")}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {selectedReturnForQuickView.type === "purchase" ? "Original Purchase Memo:" : "Original Invoice:"}
                    </span>
                    <span className="col-span-2">
                      {selectedReturnForQuickView.type === "purchase" ? (
                        selectedReturnForQuickView.purchase_id ? (
                          <Link
                            href={`/purchases/${selectedReturnForQuickView.purchase_id}`}
                            className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-slate-800 font-mono font-bold px-2 py-0.5 rounded hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                            title={`Open Purchase Memo ${selectedReturnForQuickView.record_no}`}
                          >
                            <span>{selectedReturnForQuickView.record_no}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {selectedReturnForQuickView.record_no}
                          </span>
                        )
                      ) : selectedReturnForQuickView.order_id ? (
                        <Link
                          href={`/invoices/${selectedReturnForQuickView.order_id}`}
                          className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-slate-800 font-mono font-bold px-2 py-0.5 rounded hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                          title={`Open Sales Invoice ${selectedReturnForQuickView.record_no}`}
                        >
                          <span>{selectedReturnForQuickView.record_no}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {selectedReturnForQuickView.record_no}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-white dark:bg-slate-800/90">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {selectedReturnForQuickView.type === "purchase" ? "Supplier Name:" : "Customer Name:"}
                    </span>
                    <span className="col-span-2">
                      {selectedReturnForQuickView.type === "purchase" ? (
                        selectedReturnForQuickView.supplier_id ? (
                          <Link
                            href={`/suppliers/${selectedReturnForQuickView.supplier_id}`}
                            className="font-bold text-slate-800 dark:text-white hover:text-rose-600 inline-flex items-center gap-1"
                          >
                            <span>{selectedReturnForQuickView.party_name}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-rose-600" />
                          </Link>
                        ) : (
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {selectedReturnForQuickView.party_name}
                          </span>
                        )
                      ) : selectedReturnForQuickView.customer_id ? (
                        <Link
                          href={`/customers/${selectedReturnForQuickView.customer_id}`}
                          className="font-bold text-slate-800 dark:text-white hover:text-rose-600 inline-flex items-center gap-1"
                        >
                          <span>{selectedReturnForQuickView.party_name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-rose-600" />
                        </Link>
                      ) : (
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {selectedReturnForQuickView.party_name}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Contact Mobile:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedReturnForQuickView.party_mobile || "N/A"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-white dark:bg-slate-800/90">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Returned Product:</span>
                    <span className="col-span-2 font-bold text-slate-800 dark:text-slate-100">
                      {selectedReturnForQuickView.product_name}
                      {selectedReturnForQuickView.product_code && (
                        <span className="text-slate-400 font-mono text-[11px] ml-1.5 font-normal">
                          ({selectedReturnForQuickView.product_code})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Return Quantity:</span>
                    <span className="col-span-2 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                      {formatReturnDisplayQty(selectedReturnForQuickView)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-white dark:bg-slate-800/90">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      {selectedReturnForQuickView.type === "purchase" ? "Adjusted Amount:" : "Refund Amount:"}
                    </span>
                    <span className="col-span-2 font-bold text-rose-600 dark:text-rose-400">
                      {formatBdCurrency(selectedReturnForQuickView.amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-slate-50 dark:bg-slate-800/50">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Due Adjustment:</span>
                    <span className="col-span-2 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBdCurrency(selectedReturnForQuickView.due_amount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 px-5 py-2.5 bg-white dark:bg-slate-800/90">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Processed On:</span>
                    <span className="col-span-2 font-medium text-slate-800 dark:text-slate-200">
                      {selectedReturnForQuickView.created_at
                        ? new Date(selectedReturnForQuickView.created_at).toLocaleString()
                        : selectedReturnForQuickView.date}
                    </span>
                  </div>
                </div>
              </div>

              {/* Returned Products Breakdown Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-5 py-2.5 border-b border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Returned Products Breakdown</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    1 Product
                  </span>
                </div>
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-500 uppercase">
                      <th className="p-2.5 text-center w-[40px]">SL</th>
                      <th className="p-2.5">Product Name</th>
                      <th className="p-2.5 text-center w-[100px]">Qty</th>
                      <th className="p-2.5 text-right w-[110px]">Unit Rate</th>
                      <th className="p-2.5 text-right w-[120px] pr-4">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-2.5 text-center text-slate-400">1</td>
                      <td className="p-2.5 font-bold text-slate-800 dark:text-white">
                        {selectedReturnForQuickView.product_name}
                        {selectedReturnForQuickView.tile_size && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            📐 {selectedReturnForQuickView.tile_size}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-bold whitespace-nowrap">
                        {formatReturnDisplayQty(selectedReturnForQuickView)}
                      </td>
                      <td className="p-2.5 text-right font-medium">
                        {formatBdCurrency(
                          selectedReturnForQuickView.quantity > 0
                            ? selectedReturnForQuickView.amount / selectedReturnForQuickView.quantity
                            : 0
                        )}
                      </td>
                      <td className="p-2.5 text-right pr-4 font-bold text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(selectedReturnForQuickView.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-right text-xs uppercase text-slate-500">
                        Total Returned:
                      </td>
                      <td className="p-2.5 text-center font-bold whitespace-nowrap">
                        {formatReturnDisplayQty(selectedReturnForQuickView)}
                      </td>
                      <td className="p-2.5 text-right text-slate-500 uppercase text-[10px]">
                        Total Value:
                      </td>
                      <td className="p-2.5 text-right pr-4 font-black text-rose-600 dark:text-rose-400 text-sm">
                        {formatBdCurrency(selectedReturnForQuickView.amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Footer: Sticky Bottom Navigation & Actions */}
            <div className="shrink-0 bg-slate-50 dark:bg-slate-900/95 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {selectedReturnForQuickView.type === "purchase" ? (
                  <>
                    {selectedReturnForQuickView.purchase_id && (
                      <Link
                        href={`/purchases/${selectedReturnForQuickView.purchase_id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Purchase Memo</span>
                      </Link>
                    )}
                    {selectedReturnForQuickView.supplier_id && (
                      <Link
                        href={`/suppliers/${selectedReturnForQuickView.supplier_id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Supplier Profile</span>
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    {selectedReturnForQuickView.order_id && (
                      <Link
                        href={`/invoices/${selectedReturnForQuickView.order_id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Open Invoice</span>
                      </Link>
                    )}
                    {selectedReturnForQuickView.customer_id && (
                      <Link
                        href={`/customers/${selectedReturnForQuickView.customer_id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:hover:bg-purple-900/60 dark:text-purple-300 border border-purple-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs"
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Customer Profile</span>
                      </Link>
                    )}
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const r = selectedReturnForQuickView;
                    setSelectedReturnForQuickView(null);
                    setSelectedReturnForPrint(r);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 h-[38px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-rose-600" />
                  <span>Print Return Slip</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedReturnForQuickView(null)}
                className="h-[38px] px-5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Printable Return Document Voucher Modal */}
      {selectedReturnForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
            {/* Top Bar - Hidden in Print */}
            <div className="bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white px-5 py-3.5 flex items-center justify-between shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold tracking-tight text-white m-0 uppercase">
                  {selectedReturnForPrint.type === "purchase" ? "Purchase Return Voucher" : "Sales Return Voucher"}: #RET{String(selectedReturnForPrint.id).padStart(5, "0")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-[32px] px-3.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReturnForPrint(null)}
                  className="w-7 h-7 rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Voucher Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-5 print:p-0 print:overflow-visible">
              {/* Company Header */}
              <div className="text-center pb-3 border-b-2 border-slate-800">
                <div className="flex justify-center mb-1">
                  <img
                    src="/logo.png"
                    alt="Protikkha Electric"
                    className="h-10 w-auto max-w-[200px] object-contain"
                  />
                </div>
                <h1 className="text-xl font-black tracking-wider uppercase text-[#0B3D91]">
                  PROTIKKHA ELECTRIC
                </h1>
                <p className="text-xs font-semibold text-slate-600 mt-0.5">
                  Electrical Retail POS &amp; Inventory Management
                </p>
                <p className="text-[11px] text-slate-500">
                  Success Super Market, Pabna | Mobile: 01975-703216, 01715-842083
                </p>
                <div className="inline-block mt-2 px-3 py-0.5 bg-blue-100 text-[#0B3D91] border border-blue-300 font-bold text-xs uppercase tracking-wider rounded">
                  {selectedReturnForPrint.type === "purchase"
                    ? "Supplier Purchase Return Voucher"
                    : "Customer Sales Return Voucher"}
                </div>
              </div>

              {/* Voucher Meta Grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-slate-500">
                    Return No:{" "}
                    <strong className="text-slate-900 font-mono">
                      #RET{String(selectedReturnForPrint.id).padStart(5, "0")}
                    </strong>
                  </div>
                  <div className="text-slate-500">
                    {selectedReturnForPrint.type === "purchase" ? "Purchase Memo No: " : "Original Invoice: "}
                    <strong className="text-slate-900 font-mono">
                      {selectedReturnForPrint.record_no}
                    </strong>
                  </div>
                  <div className="text-slate-500">
                    Return Date:{" "}
                    <strong className="text-slate-900">
                      {selectedReturnForPrint.date}
                    </strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-slate-500">
                    {selectedReturnForPrint.type === "purchase" ? "Supplier: " : "Customer: "}
                    <strong className="text-slate-900">
                      {selectedReturnForPrint.party_name}
                    </strong>
                  </div>
                  {selectedReturnForPrint.party_mobile && (
                    <div className="text-slate-500">
                      Mobile:{" "}
                      <strong className="text-slate-900 font-mono">
                        {selectedReturnForPrint.party_mobile}
                      </strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-slate-700">
                      <th className="p-2.5 text-center w-[40px]">SL</th>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center w-[100px]">Qty</th>
                      <th className="p-2.5 text-right w-[110px]">Rate</th>
                      <th className="p-2.5 text-right w-[120px] pr-3">
                        {selectedReturnForPrint.type === "purchase" ? "Adjusted Amount" : "Refund Amount"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 text-center text-slate-500">1</td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">
                          {selectedReturnForPrint.product_name}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Code: {selectedReturnForPrint.product_code}
                          {selectedReturnForPrint.tile_size && ` | Size: ${selectedReturnForPrint.tile_size}`}
                        </div>
                      </td>
                      <td className="p-2.5 text-center font-bold whitespace-nowrap">
                        {formatReturnDisplayQty(selectedReturnForPrint)}
                      </td>
                      <td className="p-2.5 text-right">
                        {formatBdCurrency(
                          selectedReturnForPrint.quantity > 0
                            ? selectedReturnForPrint.amount / selectedReturnForPrint.quantity
                            : 0
                        )}
                      </td>
                      <td className="p-2.5 text-right pr-3 font-bold text-rose-800">
                        {formatBdCurrency(selectedReturnForPrint.amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-right uppercase text-[11px] text-slate-600">
                        Total Returned Quantity:
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {formatReturnDisplayQty(selectedReturnForPrint)}
                      </td>
                      <td className="p-2.5 text-right uppercase text-[11px] text-slate-600">
                        Total Amount:
                      </td>
                      <td className="p-2.5 text-right pr-3 text-rose-800 font-black">
                        {formatBdCurrency(selectedReturnForPrint.amount)}
                      </td>
                    </tr>
                    {selectedReturnForPrint.due_amount > 0 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-right text-emerald-700 text-[11px]">
                          Due Adjustment:
                        </td>
                        <td className="p-2 text-right pr-3 text-emerald-700 font-bold">
                          {formatBdCurrency(selectedReturnForPrint.due_amount)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Signatures */}
              <div className="pt-12 grid grid-cols-2 gap-8 text-xs">
                <div className="text-center">
                  <div className="border-t border-slate-400 pt-1.5 font-semibold text-slate-700">
                    {selectedReturnForPrint.type === "purchase" ? "Supplier Signature" : "Customer Signature"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-slate-400 pt-1.5 font-semibold text-slate-700">
                    Authorized Signature
                  </div>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-200">
                Software By: CodeNext IT | PROTIKKHA ELECTRIC POS System
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReturnsManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading returns...</div>}>
      <ReturnsManagementContent />
    </Suspense>
  );
}
