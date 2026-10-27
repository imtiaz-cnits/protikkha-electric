"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Search,
  Users,
  Phone,
  MapPin,
  CheckCircle,
  X,
  Loader2,
  DollarSign,
  ArrowRight,
  Receipt,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomSelect, Pagination } from "@/components/ui";

interface Customer {
  id: number;
  customer_id: string;
  customer_name: string;
  mobile: string;
  address_details?: string | null;
  previous_due_amount: number;
}

export default function CustomerDuesPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [collectionData, setCollectionData] = useState({
    paid_amount: "",
    discount_amount: "0",
    payment_method: "Cash",
    transaction_id: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const data = await res.json();
      if (data.status === "success") {
        const withDues = data.data.filter((c: Customer) => c.previous_due_amount > 0);
        setCustomers(withDues);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenCollect = (c: Customer) => {
    setSelectedCustomer(c);
    setCollectionData({
      paid_amount: String(c.previous_due_amount),
      discount_amount: "0",
      payment_method: "Cash",
      transaction_id: "",
      note: `Due collection from ${c.customer_name}`,
    });
    setIsCollectModalOpen(true);
  };

  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !collectionData.paid_amount) return;

    try {
      setSaving(true);
      const res = await fetch("/api/customers/due-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          paid_amount: collectionData.paid_amount,
          discount_amount: collectionData.discount_amount,
          payment_method: collectionData.payment_method,
          transaction_id: collectionData.transaction_id,
          note: collectionData.note,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsCollectModalOpen(false);
        setSelectedCustomer(null);
        setCurrentPage(1);
        loadCustomers();
      } else {
        alert(data.message || "Failed to collect due");
      }
    } catch (err) {
      alert("Communication error");
    } finally {
      setSaving(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      c.customer_id.toLowerCase().includes(search.toLowerCase())
  );

  const startIndex = (currentPage - 1) * pageSize;
  const displayedCustomers = filteredCustomers.slice(startIndex, startIndex + pageSize);

  const totalDueAmount = customers.reduce((sum, c) => sum + c.previous_due_amount, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Customer Due Collection Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Manage accounts receivable, recover outstanding customer balances
            </p>
          </div>
        </div>

        <div className="h-[42px] px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase">
            Total Customer Receivable:
          </span>
          <span className="text-sm font-black text-rose-800 dark:text-rose-300">
            {formatBdCurrency(totalDueAmount)}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search customer name, mobile, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <span className="text-xs font-bold text-slate-500">
          {filteredCustomers.length} Customer(s) with Outstanding Due
        </span>
      </div>

      {/* Desktop Table (Strict Marss Corp Rule) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Customer Name / ID</th>
                <th className="py-3 px-3">Mobile Phone</th>
                <th className="py-3 px-3">Address / Area</th>
                <th className="py-3 px-3 text-right">Outstanding Due</th>
                <th className="py-3 px-4 text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading customer dues...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <span>Zero customer dues! All balances are fully cleared.</span>
                  </td>
                </tr>
              ) : (
                displayedCustomers.map((c, idx) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                        <Link
                          href={`/customers/${c.id}`}
                          className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          {c.customer_name}
                        </Link>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        <Link
                          href={`/customers/${c.id}`}
                          className="text-rose-600 dark:text-rose-400 font-mono font-bold hover:underline cursor-pointer"
                        >
                          {c.customer_id}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {c.mobile}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {c.address_details || "N/A"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="font-black text-rose-600 dark:text-rose-400 text-xs">
                        {formatBdCurrency(c.previous_due_amount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenCollect(c)}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs mx-auto"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span className="whitespace-nowrap">Collect Due</span>
                      </button>
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
          totalItems={filteredCustomers.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* Mobile Card List */}
      <div className="block md:hidden space-y-2.5">
        {displayedCustomers.map((c) => (
          <div
            key={c.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <Link
                  href={`/customers/${c.id}`}
                  className="font-bold text-xs text-slate-900 dark:text-white hover:text-rose-600 transition-colors block"
                >
                  {c.customer_name}
                </Link>
                <p className="text-[11px] text-slate-500">{c.mobile}</p>
              </div>
              <Link
                href={`/customers/${c.id}`}
                className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 hover:underline"
              >
                {c.customer_id}
              </Link>
            </div>

            <div className="bg-slate-50 dark:bg-[#1e293b] p-2 rounded-xl flex justify-between items-center text-xs">
              <span className="text-slate-400 text-[10px]">Due Amount:</span>
              <span className="font-black text-rose-600 text-sm">
                {formatBdCurrency(c.previous_due_amount)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCollect(c)}
              className="w-full h-[32px] rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Collect Due Payment</span>
            </button>
          </div>
        ))}

        {/* Pagination Controls Mobile */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredCustomers.length}
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

      {/* Collect Modal */}
      {isCollectModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Collect Customer Due
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              <div className="bg-slate-50 dark:bg-[#1e293b] p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <strong className="font-bold text-slate-800 dark:text-white">
                    {selectedCustomer.customer_name} ({selectedCustomer.mobile})
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Outstanding Due:</span>
                  <strong className="font-bold text-rose-600">
                    {formatBdCurrency(selectedCustomer.previous_due_amount)}
                  </strong>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Collected Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={collectionData.paid_amount}
                  onChange={(e) =>
                    setCollectionData({ ...collectionData, paid_amount: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-emerald-600 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Discount / Concession (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={collectionData.discount_amount}
                  onChange={(e) =>
                    setCollectionData({ ...collectionData, discount_amount: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Method
                </label>
                <CustomSelect
                  value={collectionData.payment_method}
                  onChange={(val) =>
                    setCollectionData({ ...collectionData, payment_method: val })
                  }
                  options={[
                    { value: "Cash", label: "Cash" },
                    { value: "bKash", label: "bKash" },
                    { value: "Nagad", label: "Nagad" },
                    { value: "Rocket", label: "Rocket" },
                    { value: "Bank", label: "Bank Transfer" },
                    { value: "Card", label: "Card" },
                  ]}
                  placeholder="Select Payment Method"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Transaction ID / Note
                </label>
                <input
                  type="text"
                  placeholder="Optional reference"
                  value={collectionData.transaction_id}
                  onChange={(e) =>
                    setCollectionData({ ...collectionData, transaction_id: e.target.value })
                  }
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  disabled={saving}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Due Collection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
