"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  Plus,
  Search,
  Printer,
  X,
  Loader2,
  Trash2,
  Eye,
  Calendar,
  Zap,
  Tag,
  CheckCircle,
  FileSpreadsheet,
  Boxes,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect } from "@/components/ui/custom-select";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";
import { Pagination, DeleteConfirmModal } from "@/components/ui";

interface ElectricalSpec {
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
}

interface ProductItem {
  id: number;
  product_name: string;
  cost_price: number;
  sell_price: number;
  quantity: number;
  unit: string;
  primary_code: string;
  brand: string;
  category: string;
  electrical_spec?: ElectricalSpec | null;
  packaging_conversions?: PackagingConversion[];
}

interface SupplierItem {
  id: number;
  name: string;
  company: string;
  mobile: string;
  purchase_payable_amount: number;
}

interface PurchaseRowItem {
  product_id: number;
  product_name: string;
  quantity: number;
  package_unit?: string;
  conversion_ratio: number;
  base_quantity: number;
  cost_price: number;
  subtotal: number;
  unit: string;
  specBadge?: string;
}

interface PurchaseRecord {
  id: number;
  purchase_id: string;
  referance_no?: string | null;
  date: string | null;
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
    electrical_spec?: ElectricalSpec | null;
  }>;
  payments: Array<{
    id: number;
    paid_amount: number;
    payment_method: string;
    payment_status: string;
  }>;
}

export default function PurchasesPage() {
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Add Purchase Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Inward Form State
  const [supplierId, setSupplierId] = useState<string>("");
  const [referanceNo, setReferanceNo] = useState("");
  const [billDate, setBillDate] = useState(new Date().toISOString().slice(0, 10));
  const [deliveryCharge, setDeliveryCharge] = useState<string>("0");
  const [paidAmount, setPaidAmount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [items, setItems] = useState<PurchaseRowItem[]>([]);

  // Item Selector State (Inside Modal)
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<string>("1");
  const [itemCostPrice, setItemCostPrice] = useState<string>("");
  const [itemSelectedUnit, setItemSelectedUnit] = useState<string>("");

  // View Modal
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseRecord | null>(null);

  // Delete Modal
  const [purchaseToDelete, setPurchaseToDelete] = useState<PurchaseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [purRes, suppRes, prodRes] = await Promise.all([
        fetch("/api/purchases"),
        fetch("/api/suppliers"),
        fetch("/api/products"),
      ]);

      const [purData, suppData, prodData] = await Promise.all([
        purRes.json(),
        suppRes.json(),
        prodRes.json(),
      ]);

      if (purData.status === "success") setPurchases(purData.data);
      if (suppData.status === "success") setSuppliers(suppData.data);
      if (prodData.status === "success") setProducts(prodData.data);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load purchase records");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchCode = p.purchase_id.toLowerCase().includes(q);
        const matchRef = (p.referance_no || "").toLowerCase().includes(q);
        const matchSupp = (p.supplier?.name || "").toLowerCase().includes(q);
        const matchComp = (p.supplier?.company || "").toLowerCase().includes(q);
        if (!matchCode && !matchRef && !matchSupp && !matchComp) return false;
      }

      if (selectedSupplier !== "all" && String(p.supplier?.id) !== selectedSupplier) {
        return false;
      }

      if (selectedStatus === "paid" && p.due_amount > 0) return false;
      if (selectedStatus === "due" && p.due_amount <= 0) return false;
      if (selectedStatus === "partial" && (p.due_amount <= 0 || p.paid_amount <= 0)) return false;

      return true;
    });
  }, [purchases, search, selectedSupplier, selectedStatus]);

  // Paginated List
  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPurchases.slice(start, start + pageSize);
  }, [filteredPurchases, currentPage, pageSize]);

  // Calculate Running Totals for New Purchase Form
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    const delivery = parseFloat(deliveryCharge) || 0;
    return subtotal + delivery;
  }, [subtotal, deliveryCharge]);

  const calculatedDue = useMemo(() => {
    const paid = parseFloat(paidAmount) || 0;
    return Math.max(0, grandTotal - paid);
  }, [grandTotal, paidAmount]);

  // When a product is selected in item adder
  function handleSelectProductToAdd(prodId: string) {
    setSelectedProductToAdd(prodId);
    const prod = products.find((p) => String(p.id) === prodId);
    if (prod) {
      setItemCostPrice(String(prod.cost_price));
      const defaultUnit = prod.packaging_conversions && prod.packaging_conversions.length > 0
        ? prod.packaging_conversions[0].packaging_unit
        : prod.unit || "Piece";
      setItemSelectedUnit(defaultUnit);
    }
  }

  // Add Item to Purchase Table
  function handleAddItem() {
    const prod = products.find((p) => String(p.id) === selectedProductToAdd);
    if (!prod) {
      toast.error("Please select an electrical product");
      return;
    }

    const qty = parseFloat(itemQuantity);
    const cost = parseFloat(itemCostPrice);

    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (isNaN(cost) || cost < 0) {
      toast.error("Please enter a valid cost price");
      return;
    }

    // Determine packaging conversion
    const conversion = prod.packaging_conversions?.find(
      (c) => c.packaging_unit.toLowerCase() === itemSelectedUnit.toLowerCase()
    );

    const ratio = conversion ? conversion.conversion_ratio : 1;
    const baseQty = qty * ratio;
    const lineTotal = cost * qty;

    const spec = prod.electrical_spec;
    const specBadge = spec
      ? [spec.cable_size, spec.current_rating, spec.wattage, spec.gang_module].filter(Boolean).join(" • ")
      : undefined;

    setItems((prev) => [
      ...prev,
      {
        product_id: prod.id,
        product_name: prod.product_name,
        quantity: qty,
        package_unit: itemSelectedUnit,
        conversion_ratio: ratio,
        base_quantity: baseQty,
        cost_price: cost,
        subtotal: lineTotal,
        unit: prod.unit || "Piece",
        specBadge,
      },
    ]);

    // Reset item adder inputs
    setSelectedProductToAdd("");
    setItemQuantity("1");
    setItemCostPrice("");
    setItemSelectedUnit("");
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleOpenAdd() {
    setSupplierId(suppliers[0]?.id ? String(suppliers[0].id) : "");
    setReferanceNo("");
    setBillDate(new Date().toISOString().slice(0, 10));
    setDeliveryCharge("0");
    setPaidAmount("0");
    setPaymentMethod("Cash");
    setTransactionId("");
    setItems([]);
    setError("");
    setModalOpen(true);
  }

  async function handleSavePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }

    if (items.length === 0) {
      setError("Please add at least one product to the purchase bill");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        supplier_id: supplierId,
        referance_no: referanceNo,
        date: billDate,
        grand_subtotal: subtotal,
        delivery_charge: parseFloat(deliveryCharge) || 0,
        paid_amount: parseFloat(paidAmount) || 0,
        due_amount: calculatedDue,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          package_unit: i.package_unit,
          conversion_ratio: i.conversion_ratio,
          base_quantity: i.base_quantity,
          cost_price: i.cost_price,
          subtotal: i.subtotal,
        })),
      };

      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to record purchase inward");
      }

      toast.success("Electrical purchase bill recorded and stock updated!");
      setModalOpen(false);
      setCurrentPage(1);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!purchaseToDelete) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/purchases/${purchaseToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Failed to delete purchase record");
      }

      toast.success(`Purchase ${purchaseToDelete.purchase_id} deleted and stock reverted!`);
      setPurchaseToDelete(null);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete purchase");
      setPurchaseToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Purchases & Inward Stock
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Procure wires, cables, switches, and breakers from manufacturers and update stock
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/supplier-dues"
            className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <span>Supplier Dues</span>
          </Link>

          <button
            onClick={() => window.print()}
            title="Print List"
            className="w-[38px] h-[38px] rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-[#1E65A0] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>

          <button
            onClick={handleOpenAdd}
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>New Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search purchase ID, reference, supplier..."
              className="w-full h-[38px] pl-9 pr-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0] focus:ring-2 focus:ring-[#1E65A0]/20 transition-all"
            />
          </div>

          {/* Supplier Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Suppliers" },
              ...suppliers.map((s) => ({
                value: String(s.id),
                label: `${s.name} (${s.company})`,
              })),
            ]}
            value={selectedSupplier}
            onChange={(val) => {
              setSelectedSupplier(String(val));
              setCurrentPage(1);
            }}
            placeholder="Filter Supplier"
          />

          {/* Status Filter */}
          <CustomSelect
            options={[
              { value: "all", label: "All Payment Statuses" },
              { value: "paid", label: "Paid (Due: ৳ 0)" },
              { value: "partial", label: "Partial Paid" },
              { value: "due", label: "Unpaid / Due" },
            ]}
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(String(val));
              setCurrentPage(1);
            }}
            placeholder="Payment Status"
          />
        </div>

        {/* Filter Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
          <span>
            Showing <strong className="text-slate-800 dark:text-white">{filteredPurchases.length}</strong> purchase inward bills
          </span>

          <div className="flex items-center gap-2">
            <span>Show entries:</span>
            <div className="w-20">
              <CustomSelect
                value={String(pageSize)}
                onChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
                options={[
                  { value: "15", label: "15" },
                  { value: "20", label: "20" },
                  { value: "50", label: "50" },
                  { value: "100", label: "100" },
                ]}
                className="h-[30px] px-2 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#1E65A0]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Purchases Table & Mobile List */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1E65A0]" />
            <p className="text-xs text-slate-500 font-medium">Loading purchase bills...</p>
          </div>
        ) : paginatedPurchases.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <Truck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto stroke-1" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No purchase bills recorded
            </p>
            <p className="text-xs text-slate-400">
              Record your manufacturer purchases to receive incoming stock.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Bill ID & Ref</th>
                    <th className="py-3 px-3.5">Date</th>
                    <th className="py-3 px-3.5">Supplier & Company</th>
                    <th className="py-3 px-3.5 text-center">Items Inward</th>
                    <th className="py-3 px-3.5 text-right">Total Bill</th>
                    <th className="py-3 px-3.5 text-right">Paid Amount</th>
                    <th className="py-3 px-3.5 text-right">Due Amount</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 text-center w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPurchases.map((p) => {
                    const isPaid = p.due_amount <= 0;
                    const isPartial = p.due_amount > 0 && p.paid_amount > 0;

                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Bill ID & Ref */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <p className="font-mono font-bold text-slate-900 dark:text-white">
                            {p.purchase_id}
                          </p>
                          {p.referance_no && (
                            <p className="text-[10px] text-slate-400">Ref: {p.referance_no}</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {p.date || "N/A"}
                        </td>

                        {/* Supplier */}
                        <td className="py-3 px-3.5">
                          <p className="font-bold text-slate-900 dark:text-white">
                            {p.supplier?.name || "N/A"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {p.supplier?.company || ""} • {p.supplier?.mobile || ""}
                          </p>
                        </td>

                        {/* Items Inward */}
                        <td className="py-3 px-3.5 text-center font-bold text-slate-800 dark:text-slate-200">
                          {p.total_items}
                        </td>

                        {/* Total Bill */}
                        <td className="py-3 px-3.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatBdCurrency(p.grand_subtotal + p.delivery_charge)}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-3 px-3.5 text-right font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                          {formatBdCurrency(p.paid_amount)}
                        </td>

                        {/* Due Amount */}
                        <td className="py-3 px-3.5 text-right font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          {formatBdCurrency(p.due_amount)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900"
                                : isPartial
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900"
                                : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                            }`}
                          >
                            {isPaid ? "Paid" : isPartial ? "Partial" : "Due"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <Link
                              href={`/purchases/${p.id}`}
                              title="Print / View Purchase Bill"
                              className="w-7 h-7 rounded-lg border border-[#cbd5e1] dark:border-[#334155] hover:border-[#1E65A0] text-slate-600 dark:text-slate-300 hover:text-[#1E65A0] flex items-center justify-center transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            <button
                              onClick={() => setPurchaseToDelete(p)}
                              title="Delete Purchase (Revert Stock)"
                              className="w-7 h-7 rounded-lg border border-[#cbd5e1] dark:border-[#334155] hover:border-rose-500 text-slate-600 dark:text-slate-300 hover:text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List (Rule 8.3) */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedPurchases.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {p.purchase_id}
                      </p>
                      <p className="text-xs font-semibold text-[#1E65A0] dark:text-blue-400">
                        {p.supplier?.name} ({p.supplier?.company})
                      </p>
                      <p className="text-[10px] text-slate-400">{p.date}</p>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.due_amount <= 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/60"
                      }`}
                    >
                      {p.due_amount <= 0 ? "Paid" : `Due: ${formatBdCurrency(p.due_amount)}`}
                    </span>
                  </div>

                  {/* 2-Column Financial Grid */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Total Bill</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {formatBdCurrency(p.grand_subtotal + p.delivery_charge)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Paid Amount</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(p.paid_amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Link
                      href={`/purchases/${p.id}`}
                      className="px-3 py-1 rounded-lg border border-[#cbd5e1] dark:border-[#334155] text-xs font-semibold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Bill</span>
                    </Link>
                    <button
                      onClick={() => setPurchaseToDelete(p)}
                      className="px-3 py-1 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 text-xs font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {filteredPurchases.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalItems={filteredPurchases.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ================================================================ */}
      {/* 4. New Purchase Inward Modal (Rule 9)                            */}
      {/* ================================================================ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#0f172a] border-[1.5px] border-[#cbd5e1] dark:border-[#334155] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-300" />
                <h3 className="font-bold text-sm sm:text-base text-white">
                  New Purchase Inward (Stock Receiving)
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSavePurchase} className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* 1. Supplier & Invoice Header */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Supplier *
                  </label>
                  <CustomSelect
                    options={suppliers.map((s) => ({
                      value: String(s.id),
                      label: `${s.name} (${s.company})`,
                      subLabel: `Due: ৳ ${s.purchase_payable_amount}`,
                    }))}
                    value={supplierId}
                    onChange={(val) => setSupplierId(String(val))}
                    placeholder="Choose Supplier"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Invoice / Challan Ref No.
                  </label>
                  <input
                    type="text"
                    value={referanceNo}
                    onChange={(e) => setReferanceNo(e.target.value)}
                    placeholder="e.g. BRB-CHAL-4821"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Bill Date *
                  </label>
                  <CustomDatePicker
                    value={billDate}
                    onChange={(val) => setBillDate(val)}
                    placeholder="Select Bill Date"
                    className="w-full h-[42px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                  />
                </div>
              </div>

              {/* 2. Item Selector & Packaging Converter */}
              <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-3">
                <h4 className="text-xs font-bold text-[#0B3D91] dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Add Electrical Products to Bill
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  {/* Product Search */}
                  <div className="sm:col-span-5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Search Product
                    </label>
                    <CustomSelect
                      options={products.map((p) => {
                        const spec = p.electrical_spec;
                        const badge = spec
                          ? `${spec.cable_size || spec.current_rating || spec.wattage || ""}`
                          : "";
                        return {
                          value: String(p.id),
                          label: p.product_name,
                          subLabel: badge ? `[${badge}]` : p.brand,
                        };
                      })}
                      value={selectedProductToAdd}
                      onChange={handleSelectProductToAdd}
                      placeholder="Select product to add..."
                    />
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      placeholder="1"
                      className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Unit / Packaging */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={itemSelectedUnit}
                      onChange={(e) => setItemSelectedUnit(e.target.value)}
                      placeholder="Unit"
                      className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Cost Price */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Cost (৳)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={itemCostPrice}
                      onChange={(e) => setItemCostPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full h-[42px] rounded-xl bg-[#0B3D91] hover:bg-[#1E65A0] text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                      title="Add item"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-center">Inward Qty</th>
                      <th className="py-2.5 px-3 text-center">Base Stock Inward</th>
                      <th className="py-2.5 px-3 text-right">Cost Rate</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center w-12">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          No items added yet. Search and add products above.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {it.product_name}
                            </span>
                            {it.specBadge && (
                              <span className="text-[10px] text-[#1E65A0] dark:text-blue-400 block">
                                {it.specBadge}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {it.quantity} {it.package_unit}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                            {it.base_quantity} {it.unit}
                            {it.conversion_ratio > 1 && (
                              <span className="text-[10px] text-slate-400 block">
                                (x{it.conversion_ratio})
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatBdCurrency(it.cost_price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-white font-mono">
                            {formatBdCurrency(it.subtotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-600 hover:text-rose-700 p-1 rounded cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* 4. Financial Calculations & Payments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Payment Options */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">
                    Payment Method
                  </h5>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Method
                      </label>
                      <CustomSelect
                        value={paymentMethod}
                        onChange={(val) => setPaymentMethod(val)}
                        options={[
                          { value: "Cash", label: "Cash In Hand" },
                          { value: "Bank", label: "Bank Transfer" },
                          { value: "bKash", label: "bKash" },
                          { value: "Nagad", label: "Nagad" },
                        ]}
                        className="w-full h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Transaction Ref
                      </label>
                      <input
                        type="text"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="TRX / Cheque No."
                        className="w-full h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Items Subtotal:</span>
                    <span className="font-bold font-mono text-slate-900 dark:text-white">
                      {formatBdCurrency(subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Delivery / Transport:</span>
                    <div className="w-28">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={deliveryCharge}
                        onChange={(e) => setDeliveryCharge(e.target.value)}
                        className="w-full h-[32px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-white">Total Bill Payable:</span>
                    <span className="font-bold font-mono text-base text-[#0B3D91] dark:text-blue-300">
                      {formatBdCurrency(grandTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">Paid Amount:</span>
                    <div className="w-28">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full h-[32px] px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-right font-bold text-xs text-emerald-700 dark:text-emerald-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="font-bold text-rose-600 dark:text-rose-400">Due Balance:</span>
                    <span className="font-black font-mono text-base text-rose-600 dark:text-rose-400">
                      {formatBdCurrency(calculatedDue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || items.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-70"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Purchase Inward</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Delete Purchase Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(purchaseToDelete)}
        onClose={() => setPurchaseToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Purchase Bill"
        itemName={purchaseToDelete ? `#${purchaseToDelete.purchase_id}` : ""}
        warningMessage="Deleting this purchase will revert the inward stock quantities and deduct any recorded due from the supplier ledger."
        loading={deleting}
      />
    </div>
  );
}
