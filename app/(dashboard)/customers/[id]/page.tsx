"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Receipt,
  RotateCcw,
  Wallet,
  Calendar,
  Plus,
  Loader2,
  Check,
  X,
  FileSpreadsheet,
  AlertCircle,
  Hash,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/toast";

interface OrderItem {
  id: number;
  order_no: string;
  sub_total: number;
  paid_amount: number;
  due_amount: number;
  order_status?: string | null;
  created_at: string;
}

interface PaymentItem {
  id: number;
  paid_amount: number;
  discount_amount: number;
  due_amount: number;
  previous_due_amount: number;
  due_collection_date: string | null;
  payment_method: string | null;
  transaction_id: string | null;
  payment_status: string | null;
  created_at: string;
}

interface ReturnItem {
  id: number;
  order_id: number;
  amount: number;
  quantity: number;
  date: string;
  created_at: string | null;
}

interface CustomerData {
  id: number;
  customer_id: string;
  customer_name: string;
  mobile: string;
  email: string | null;
  nid: string | null;
  address_details: string | null;
  previous_due_amount: number;
  created_at: string;
  kpi: {
    total_orders: number;
    total_order_amount: number;
    total_paid_amount: number;
    total_order_due: number;
    current_due: number;
  };
  orders: OrderItem[];
  customer_payment_details: PaymentItem[];
  product_returns: ReturnItem[];
}

export default function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"orders" | "payments" | "returns">("orders");

  // Collect Due Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [transactionId, setTransactionId] = useState("");
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setCustomer(data.data);
      } else {
        toast.error(data.message || "Customer not found");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerProfile();
  }, [id]);

  const handleOpenCollectModal = () => {
    setPayAmount("");
    setDiscountAmount("");
    setPaymentMethod("Cash");
    setTransactionId("");
    setCollectionDate(new Date().toISOString().split("T")[0]);
    setIsCollectModalOpen(true);
  };

  const handleCollectDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const paidNum = parseFloat(payAmount || "0");
    const discNum = parseFloat(discountAmount || "0");

    if (paidNum <= 0 && discNum <= 0) {
      toast.error("Please enter a valid paid or discount amount");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch("/api/customers/due-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customer.id,
          paid_amount: paidNum,
          discount_amount: discNum,
          payment_method: paymentMethod,
          transaction_id: transactionId,
          due_collection_date: collectionDate,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Due collected successfully!");
        setIsCollectModalOpen(false);
        fetchCustomerProfile();
      } else {
        toast.error(data.message || "Failed to collect due");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to process collection");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
        <p className="text-xs text-slate-500 font-medium">Loading customer profile...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center space-y-3">
        <div className="text-rose-600 font-bold">Customer profile not found</div>
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  const currentDue = customer.kpi.current_due;
  const numPay = parseFloat(payAmount || "0");
  const numDisc = parseFloat(discountAmount || "0");
  const modalRemainingDue = Math.max(0, currentDue - (numPay + numDisc));

  return (
    <div className="space-y-4">
      {/* 1. Top Section / Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/customers"
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title="Back to Customer List"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-slate-800 dark:text-white tracking-tight leading-tight m-0">
                {customer.customer_name}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono text-[11px] font-bold border border-rose-200 dark:border-rose-900">
                {customer.customer_id}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Customer Ledger, Invoices &amp; Due Management
            </p>
          </div>
        </div>

        {/* Action Button: Collect Due */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleOpenCollectModal}
            className="h-[38px] px-4 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>Collect Due</span>
          </button>
        </div>
      </div>

      {/* 2. Customer Details Card */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <Phone className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Mobile</span>
              <span className="font-bold text-slate-800 dark:text-white font-mono">
                {customer.mobile || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <MapPin className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Address</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {customer.address_details || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <Mail className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Email</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {customer.email || "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
              <Hash className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">NID No</span>
              <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                {customer.nid || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Invoices
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
              {customer.kpi.total_orders}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-rose-600" />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Purchased
            </div>
            <div className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
              {formatBdCurrency(customer.kpi.total_order_amount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
            ৳
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-[#cbd5e1] dark:border-[#334155] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Paid
            </div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatBdCurrency(customer.kpi.total_paid_amount)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            ৳
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-rose-200 dark:border-rose-900/50 bg-rose-50/20 dark:bg-rose-950/10 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Current Due Balance
            </div>
            <div className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
              {formatBdCurrency(customer.kpi.current_due)}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "orders"
              ? "bg-[#991b1b] text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Invoices ({customer.orders.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "payments"
              ? "bg-[#991b1b] text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Due Collections ({customer.customer_payment_details.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("returns")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === "returns"
              ? "bg-[#991b1b] text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Sales Returns ({customer.product_returns.length})</span>
        </button>
      </div>

      {/* 5. Tab Content: Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {activeTab === "orders" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-semibold uppercase tracking-wider whitespace-nowrap">
                  <th className="p-3 text-center w-[45px]">SL</th>
                  <th className="p-3">Invoice No</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3 text-right">Total Amount</th>
                  <th className="p-3 text-right">Paid Amount</th>
                  <th className="p-3 text-right">Due Amount</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {customer.orders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                      No invoices found for this customer.
                    </td>
                  </tr>
                ) : (
                  customer.orders.map((o, idx) => (
                    <tr
                      key={o.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {o.order_no}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(o.created_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-800 dark:text-white">
                        {formatBdCurrency(o.sub_total)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(o.paid_amount)}
                      </td>
                      <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(o.due_amount)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            o.due_amount <= 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
                          }`}
                        >
                          {o.due_amount <= 0 ? "PAID" : "DUE"}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Link
                          href={`/invoices/${o.id}`}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold transition-all inline-block border border-rose-200 dark:border-rose-900/50"
                        >
                          View Bill
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-semibold uppercase tracking-wider whitespace-nowrap">
                  <th className="p-3 text-center w-[45px]">SL</th>
                  <th className="p-3">Collection Date</th>
                  <th className="p-3 text-right">Previous Due</th>
                  <th className="p-3 text-right">Collected Amount</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Remaining Due</th>
                  <th className="p-3 text-center">Method</th>
                  <th className="p-3 text-center">Trx ID</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {customer.customer_payment_details.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      No due collection records found for this customer.
                    </td>
                  </tr>
                ) : (
                  customer.customer_payment_details.map((p, idx) => (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-rose-600" />
                          <span>
                            {p.due_collection_date
                              ? new Date(p.due_collection_date).toLocaleDateString("en-GB")
                              : new Date(p.created_at).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium text-slate-600 dark:text-slate-400">
                        {formatBdCurrency(p.previous_due_amount)}
                      </td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        {formatBdCurrency(p.paid_amount)}
                      </td>
                      <td className="p-3 text-right text-amber-600 dark:text-amber-400">
                        {p.discount_amount > 0 ? formatBdCurrency(p.discount_amount) : "-"}
                      </td>
                      <td className="p-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(p.due_amount)}
                      </td>
                      <td className="p-3 text-center font-medium">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {p.payment_method || "Cash"}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-[11px] text-slate-500">
                        {p.transaction_id || "-"}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {p.payment_status || "Received"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "returns" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-semibold uppercase tracking-wider whitespace-nowrap">
                  <th className="p-3 text-center w-[45px]">SL</th>
                  <th className="p-3">Return Date</th>
                  <th className="p-3">Order ID</th>
                  <th className="p-3 text-center">Returned Qty</th>
                  <th className="p-3 text-right">Refund / Adjusted Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {customer.product_returns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No sales return records found for this customer.
                    </td>
                  </tr>
                ) : (
                  customer.product_returns.map((r, idx) => (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {r.date}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-800 dark:text-white">
                        #{r.order_id}
                      </td>
                      <td className="p-3 text-center font-bold text-slate-800 dark:text-white">
                        {r.quantity} pcs
                      </td>
                      <td className="p-3 text-right font-black text-rose-600 dark:text-rose-400">
                        {formatBdCurrency(r.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. COLLECT DUE MODAL */}
      {isCollectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white px-5 py-3.5 flex items-center justify-between shadow-sm shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white m-0">
                    Collect Customer Due
                  </h3>
                  <p className="text-[11px] text-white/80 m-0">
                    Record payment &amp; update customer balance
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCollectDue} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Customer
                  </span>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">
                    {customer.customer_name} ({customer.customer_id})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 uppercase font-bold block">
                    Current Due
                  </span>
                  <span className="font-black text-sm text-rose-700 dark:text-rose-400">
                    {formatBdCurrency(currentDue)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Paid / Collected Amount (৳) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800/90 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Discount Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="0"
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800/90 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800/90 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-rose-600 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="bKash">bKash</option>
                    <option value="Nagad">Nagad</option>
                    <option value="Rocket">Rocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Transaction ID / Note
                  </label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Optional Trx ID..."
                    className="w-full h-[42px] px-3 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800/90 text-xs text-slate-800 dark:text-white outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Collection Date <span className="text-rose-600">*</span>
                </label>
                <CustomDatePicker
                  value={collectionDate}
                  onChange={(val) => setCollectionDate(val)}
                  placement="auto"
                />
              </div>

              {/* Remaining calculation banner */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Current Due:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {formatBdCurrency(currentDue)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Total Deduction (Paid + Disc):</span>
                  <span>- {formatBdCurrency(numPay + numDisc)}</span>
                </div>
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-black pt-1 border-t border-slate-200 dark:border-slate-800">
                  <span>Remaining Customer Due:</span>
                  <span>{formatBdCurrency(modalRemainingDue)}</span>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 h-[42px] rounded-xl bg-[#dc2626] hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-6 h-[42px] rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingPayment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Collection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
