"use client";

import { useEffect, useState } from "react";
import {
  Truck,
  Plus,
  Search,
  Receipt,
  Printer,
  X,
  Loader2,
  Trash2,
  ArrowRight,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  Calendar,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { formatBoxAndPcs, formatTileOrItemQty } from "@/lib/tiles-calculator";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { Pagination, DeleteConfirmModal } from "@/components/ui";

interface PurchaseItem {
  product_id: number;
  product_name: string;
  quantity: number;
  cost_price: number;
  unit: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  category?: string | null;
}

interface Purchase {
  id: number;
  purchase_id: string;
  referance_no?: string | null;
  date?: string | null;
  grand_subtotal: number;
  delivery_charge: number;
  paid_amount: number;
  due_amount: number;
  supplier: {
    id: number;
    name: string;
    company: string;
    mobile: string;
  } | null;
  total_items: number;
  details: Array<{
    id: number;
    product_name: string;
    quantity: number;
    cost_price: number;
    subtotal: number;
    unit: string;
    tile_size?: string | null;
    sqft_per_box?: number | null;
    pcs_per_box?: number | null;
    grade?: string | null;
  }>;
  payments: Array<{
    id: number;
    paid_amount: number;
    payment_method: string;
    payment_status: string;
  }>;
}

interface Supplier {
  id: number;
  name: string;
  company: string;
  mobile: string;
  purchase_payable_amount: number;
}

interface Product {
  id: number;
  product_name: string;
  cost_price: number;
  quantity: number;
  unit: string;
  tile_size?: string | null;
  sqft_per_box?: number | null;
  pcs_per_box?: number | null;
  grade?: string | null;
  primary_code?: string;
  display_codes?: string;
  brand?: string;
  category?: string;
}

export default function PurchasesPage() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  // Delete Confirm Modal State
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // New purchase form
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [deliveryCharge, setDeliveryCharge] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");

  // Cart items for new purchase
  const [newItems, setNewItems] = useState<PurchaseItem[]>([]);
  const [selectedProdId, setSelectedProdId] = useState("");
  const [tempQty, setTempQty] = useState("1");
  const [tempCost, setTempCost] = useState("");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [purRes, supRes, prodRes] = await Promise.all([
        fetch(`/api/purchases?search=${encodeURIComponent(search)}`),
        fetch("/api/suppliers"),
        fetch("/api/products?limit=all"),
      ]);

      const [purData, supData, prodData] = await Promise.all([
        purRes.json(),
        supRes.json(),
        prodRes.json(),
      ]);

      if (purData.status === "success") setPurchases(purData.data);
      if (supData.status === "success") setSuppliers(supData.data);
      if (prodData.status === "success") setProducts(prodData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleDeletePurchase = (p: Purchase) => {
    setDeleteError(null);
    setPurchaseToDelete(p);
  };

  const confirmDeletePurchase = async () => {
    if (!purchaseToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/purchases/${purchaseToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        toast.success("Purchase record deleted and stock reverted successfully!");
        setPurchaseToDelete(null);
        setCurrentPage(1);
        loadData();
      } else {
        setDeleteError(data?.message || `Failed to delete purchase record (Status ${res.status})`);
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Communication error deleting purchase");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle adding product line to new purchase
  const handleAddLineItem = () => {
    if (!selectedProdId) return;
    const prod = products.find((p) => p.id === Number(selectedProdId));
    if (!prod) return;

    const qty = parseFloat(tempQty) || 1;
    const cost = parseFloat(tempCost) || prod.cost_price;

    const existingIndex = newItems.findIndex((i) => i.product_id === prod.id);
    if (existingIndex > -1) {
      const copy = [...newItems];
      copy[existingIndex].quantity += qty;
      copy[existingIndex].cost_price = cost;
      setNewItems(copy);
    } else {
      setNewItems([
        ...newItems,
        {
          product_id: prod.id,
          product_name: prod.product_name,
          tile_size: prod.tile_size,
          sqft_per_box: prod.sqft_per_box,
          pcs_per_box: prod.pcs_per_box,
          category: prod.category,
          grade: prod.grade,
          quantity: qty,
          cost_price: cost,
          unit: prod.unit,
        },
      ]);
    }

    setSelectedProdId("");
    setTempQty("1");
    setTempCost("");
  };

  const handleRemoveLineItem = (prodId: number) => {
    setNewItems(newItems.filter((i) => i.product_id !== prodId));
  };

  // Calculations for new purchase
  const subTotal = newItems.reduce((sum, item) => sum + item.cost_price * item.quantity, 0);
  const delivery = parseFloat(deliveryCharge) || 0;
  const grandTotal = subTotal + delivery;
  const paid = parseFloat(paidAmount) || 0;
  const due = Math.max(0, grandTotal - paid);

  // Submit New Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      setErrorMsg("Please select a supplier!");
      return;
    }
    if (newItems.length === 0) {
      setErrorMsg("Please add at least one item to purchase!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: selectedSupplierId,
          referance_no: referenceNo,
          date: purchaseDate,
          grand_subtotal: subTotal,
          delivery_charge: delivery,
          paid_amount: paid,
          due_amount: due,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          items: newItems.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            cost_price: i.cost_price,
            subtotal: i.cost_price * i.quantity,
          })),
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsNewPurchaseOpen(false);
        setNewItems([]);
        setSelectedSupplierId("");
        setReferenceNo("");
        setPaidAmount("0");
        setDeliveryCharge("0");
        setCurrentPage(1);
        loadData();
      } else {
        setErrorMsg(data.message || "Failed to save purchase");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  const filteredPurchases = purchases.filter((p) => {
    const term = search.toLowerCase();
    return (
      p.purchase_id?.toLowerCase().includes(term) ||
      p.referance_no?.toLowerCase().includes(term) ||
      p.supplier?.name?.toLowerCase().includes(term) ||
      p.supplier?.company?.toLowerCase().includes(term) ||
      p.supplier?.mobile?.includes(term)
    );
  });

  const startIndex = (currentPage - 1) * pageSize;
  const displayedPurchases = filteredPurchases.slice(startIndex, startIndex + pageSize);

  const totalPurchasesCost = purchases.reduce((sum, p) => sum + p.grand_subtotal, 0);
  const totalPurchasesDue = purchases.reduce((sum, p) => sum + p.due_amount, 0);

  return (
    <div className="space-y-4">
      {/* 1. Header & Summary Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Purchases & Inward Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Record incoming stock, supplier purchase invoices, and costs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Total Inward Value */}
          <div className="h-[38px] px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
              Total Inward:
            </span>
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">
              {formatBdCurrency(totalPurchasesCost)}
            </span>
          </div>

          {/* Total Purchase Due */}
          <div className="h-[38px] px-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 flex items-center gap-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">
              Due:
            </span>
            <span className="text-xs font-black text-rose-800 dark:text-rose-300">
              {formatBdCurrency(totalPurchasesDue)}
            </span>
          </div>

          <button
            onClick={() => {
              setNewItems([]);
              setIsNewPurchaseOpen(true);
            }}
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search by Purchase ID, Ref / Memo No, Supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <span className="text-xs font-bold text-slate-500">
          Total: {filteredPurchases.length} Purchase(s)
        </span>
      </div>

      {/* 3. Desktop Table (Strict Marss Corp Rule: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Purchase ID / Date</th>
                <th className="py-3 px-3">Supplier / Company</th>
                <th className="py-3 px-3">Ref Memo No</th>
                <th className="py-3 px-3 text-center">Items Inward</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-right">Paid Amount</th>
                <th className="py-3 px-3 text-right">Due Amount</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading purchases...</span>
                  </td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 font-bold">
                    No purchases recorded yet. Click "+ New Purchase" to inward stock.
                  </td>
                </tr>
              ) : (
                displayedPurchases.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 font-mono text-xs">
                        {p.purchase_id}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{p.date || "N/A"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {p.supplier ? (
                          <Link
                            href={`/suppliers/${p.supplier.id}`}
                            className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            {p.supplier.name}
                          </Link>
                        ) : (
                          "N/A"
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">{p.supplier?.company}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {p.referance_no || "—"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                        {p.total_items} Pcs
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                      {formatBdCurrency(p.grand_subtotal + p.delivery_charge)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBdCurrency(p.paid_amount)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`font-black ${p.due_amount > 0 ? "text-rose-600" : "text-emerald-600"
                          }`}
                      >
                        {formatBdCurrency(p.due_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link
                          href={`/purchases/${p.id}`}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          title="View Purchase Bill"
                        >
                          <Eye className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        </Link>
                        <Link
                          href={`/returns?tab=purchase&purchase_no=${encodeURIComponent(p.purchase_id)}`}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Process Purchase Return"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(p)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Purchase"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls Desktop */}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPurchases.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 4. Mobile Card View */}
      <div className="block md:hidden space-y-2.5">
        {displayedPurchases.map((p) => (
          <div
            key={p.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                  {p.purchase_id}
                </span>
                <p className="text-[11px] font-semibold text-emerald-600">
                  {p.supplier?.name} ({p.supplier?.company})
                </p>
              </div>
              <span className="text-[10px] text-slate-400">{p.date}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl">
              <div>
                <span className="text-[10px] text-slate-400 block">Total Inward:</span>
                <span className="font-bold">
                  {formatBdCurrency(p.grand_subtotal + p.delivery_charge)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Due Amount:</span>
                <span
                  className={`font-black ${p.due_amount > 0 ? "text-rose-600" : "text-emerald-600"
                    }`}
                >
                  {formatBdCurrency(p.due_amount)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedPurchase(p)}
                className="h-[30px] w-full text-center px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>View</span>
              </button>

              <Link
                href={`/returns?tab=purchase&purchase_no=${encodeURIComponent(p.purchase_id)}`}
                className="h-[30px] w-full text-center px-2.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return</span>
              </Link>

              <button
                type="button"
                onClick={() => handleDeletePurchase(p)}
                className="h-[30px] w-full text-center px-2.5 rounded-lg bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}

        {/* Pagination Controls Mobile */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPurchases.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[20, 50, 100, 200, 500]}
          />
        </div>
      </div>

      {/* 5. NEW PURCHASE (STOCK IN) MODAL */}
      {isNewPurchaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  New Purchase Inward (Stock In)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPurchaseOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitPurchase} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Meta: Supplier, Memo No, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155]">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Supplier / Vendor <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    options={suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.company})`,
                      subLabel: `Due: ৳${s.purchase_payable_amount}`,
                    }))}
                    value={selectedSupplierId}
                    onChange={(val) => setSelectedSupplierId(String(val))}
                    placeholder="Select Supplier..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Reference / Memo No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. INV-90412"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="w-full h-[40px] px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Purchase Date
                  </label>
                  <CustomDatePicker
                    value={purchaseDate}
                    onChange={(d) => setPurchaseDate(d)}
                  />
                </div>
              </div>

              {/* Item Picker Row */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Add Product to Inward Stock
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <CustomSelect
                      options={products.map((p) => {
                        const isTile = Boolean(
                          p.tile_size ||
                          p.pcs_per_box ||
                          (p.unit && p.unit.toLowerCase().includes("box")) ||
                          (p.category && p.category.toLowerCase().includes("tile"))
                        );
                        const stockDisplay = isTile
                          ? formatBoxAndPcs(p.quantity, p.pcs_per_box, p.tile_size)
                          : `${p.quantity} Pcs`;
                        const codeStr = p.primary_code ? ` • ${p.primary_code}` : "";
                        const brandStr = p.brand && p.brand !== "N/A" ? ` • ${p.brand}` : "";
                        return {
                          value: p.id,
                          label: `${p.product_name} ${p.tile_size ? `[${p.tile_size}]` : ""}`,
                          subLabel: `Stock: ${stockDisplay}${codeStr}${brandStr}`,
                        };
                      })}
                      value={selectedProdId}
                      onChange={(val) => {
                        setSelectedProdId(String(val));
                        const p = products.find((x) => x.id === Number(val));
                        if (p) setTempCost(String(p.cost_price));
                      }}
                      placeholder="Select Product to Add..."
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={tempQty}
                      onChange={(e) => setTempQty(e.target.value)}
                      className="w-full h-[40px] px-2 text-center text-xs font-bold bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Cost Price"
                      value={tempCost}
                      onChange={(e) => setTempCost(e.target.value)}
                      className="w-full h-[40px] px-2 text-right text-xs font-bold text-emerald-600 bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="w-full h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded-xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-[#1e293b] font-bold text-slate-700 dark:text-slate-300">
                    <tr>
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-2 text-center w-24">Inward Qty</th>
                      <th className="py-2.5 px-2 text-right w-28">Unit Cost (৳)</th>
                      <th className="py-2.5 px-2 text-right w-28">Line Total (৳)</th>
                      <th className="py-2.5 px-2 text-center w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {newItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                          No items added yet. Select a product above.
                        </td>
                      </tr>
                    ) : (
                      newItems.map((item) => (
                        <tr key={item.product_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-100">
                            <div>{item.product_name}</div>
                            {(item.tile_size || item.sqft_per_box) && (
                              <span className="text-[10px] text-slate-500 font-normal">
                                {item.tile_size ? `📐 ${item.tile_size} ` : ""}
                                {item.sqft_per_box ? `(${(item.quantity * item.sqft_per_box).toFixed(1)} Sft)` : ""}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center font-bold">
                            {formatTileOrItemQty(item.quantity, item)}
                          </td>
                          <td className="py-2 px-2 text-right font-medium">
                            {item.cost_price.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-right font-black text-slate-900 dark:text-white">
                            {(item.cost_price * item.quantity).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveLineItem(item.product_id)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals & Payments Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-[#1e293b] p-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155]">
                {/* Left: Payment Method & Trx */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Payment Method
                    </label>
                    <CustomSelect
                      options={[
                        { value: "Cash", label: "Cash" },
                        { value: "Bank", label: "Bank Transfer" },
                        { value: "bKash", label: "bKash" },
                        { value: "Nagad", label: "Nagad" },
                        { value: "Card", label: "Card" },
                      ]}
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(String(val))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Transaction / Cheque No
                    </label>
                    <input
                      type="text"
                      placeholder="Optional reference"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      className="w-full h-[38px] px-3 text-xs bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] rounded-xl font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Right: Financial Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>Subtotal:</span>
                    <strong className="font-bold">{formatBdCurrency(subTotal)}</strong>
                  </div>
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-300">
                    <span>Delivery / Freight Charge:</span>
                    <input
                      type="number"
                      min="0"
                      value={deliveryCharge}
                      onChange={(e) => setDeliveryCharge(e.target.value)}
                      className="w-24 h-[28px] px-2 text-right font-bold rounded border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#0f172a]"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-white uppercase">
                      Total Payable:
                    </span>
                    <strong className="font-black text-sm text-slate-900 dark:text-white">
                      {formatBdCurrency(grandTotal)}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-emerald-700">Paid Amount:</span>
                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      className="w-28 h-[28px] px-2 text-right font-black text-emerald-700 rounded border-2 border-emerald-600 bg-white dark:bg-[#0f172a]"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-rose-600 uppercase">Due Amount:</span>
                    <strong className="font-black text-rose-600 text-sm">
                      {formatBdCurrency(due)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewPurchaseOpen(false)}
                  disabled={saving}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Purchase & Inward Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. VIEW & PRINT PURCHASE VOUCHER MODAL */}
      {selectedPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col print:border-none print:shadow-none print:max-w-none">
            <div className="print:hidden bg-gradient-to-r from-[#991b1b] to-[#dc2626] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Purchase Voucher: {selectedPurchase.purchase_id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-[30px] w-full text-center px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Voucher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPurchase(null)}
                  className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 print:p-0">
              {/* Voucher Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700">
                <h2 className="text-lg font-black tracking-wider uppercase text-rose-800 dark:text-rose-400">
                  RUNA TRADERS
                </h2>
                <p className="text-xs text-slate-500">Tiles, Sanitary & Fittings</p>
                <h3 className="text-xs font-bold uppercase tracking-wider mt-1 text-slate-700 dark:text-slate-300">
                  GOODS RECEIVED VOUCHER (PURCHASE INWARD)
                </h3>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Purchase Order:</span>
                  <strong className="font-mono">{selectedPurchase.purchase_id}</strong>
                  <span className="text-slate-400 block text-[10px] mt-1">Ref / Memo:</span>
                  <span>{selectedPurchase.referance_no || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Supplier:</span>
                  <strong>{selectedPurchase.supplier?.name}</strong>
                  <span className="text-slate-400 block text-[10px] mt-1">Date:</span>
                  <span>{selectedPurchase.date}</span>
                </div>
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-[#1e293b] font-bold">
                    <tr>
                      <th className="py-2 px-3">Item</th>
                      <th className="py-2 px-2 text-center w-16">Qty</th>
                      <th className="py-2 px-2 text-right w-20">Cost</th>
                      <th className="py-2 px-3 text-right w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {selectedPurchase.details.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-medium">
                          {d.product_name}
                        </td>
                        <td className="py-2 px-2 text-center font-bold">
                          {formatTileOrItemQty(d.quantity, d)}
                        </td>
                        <td className="py-2 px-2 text-right">{d.cost_price.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold">
                          {d.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <strong>{formatBdCurrency(selectedPurchase.grand_subtotal)}</strong>
                </div>
                {selectedPurchase.delivery_charge > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Charge:</span>
                    <span>+{formatBdCurrency(selectedPurchase.delivery_charge)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Grand Total:</span>
                  <span>
                    {formatBdCurrency(
                      selectedPurchase.grand_subtotal + selectedPurchase.delivery_charge
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Paid:</span>
                  <span>{formatBdCurrency(selectedPurchase.paid_amount)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold">
                  <span>Due Balance:</span>
                  <span>{formatBdCurrency(selectedPurchase.due_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!purchaseToDelete}
        onClose={() => {
          if (!isDeleting) {
            setPurchaseToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDeletePurchase}
        title="Delete Purchase Record"
        itemName={purchaseToDelete ? `${purchaseToDelete.purchase_id} (${purchaseToDelete.supplier?.name || "Supplier"})` : ""}
        description="Are you sure you want to delete this purchase inward record? Product stock will be decremented and supplier payable due balances will be safely reversed. Purchases with returns cannot be deleted."
        loading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
