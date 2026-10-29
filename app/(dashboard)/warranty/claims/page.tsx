"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
  Plus,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface WarrantyClaimItem {
  id: number;
  claim_no: string;
  serial_number: string;
  product_name: string;
  customer_name: string;
  purchase_date: string;
  warranty_months: number;
  expiry_date: string;
  status: string;
  defect_issue: string;
  resolution: string;
}

export default function WarrantyClaimsPage() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<WarrantyClaimItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newClaimData, setNewClaimData] = useState({
    serial_number: "",
    product_name: "",
    customer_name: "",
    defect_issue: "",
    warranty_months: "12",
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const [settlingClaim, setSettlingClaim] = useState<WarrantyClaimItem | null>(null);
  const [settleStatus, setSettleStatus] = useState("REPLACED");
  const [settleResolution, setSettleResolution] = useState("");
  const [submittingSettle, setSubmittingSettle] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/warranty/claims");
      const data = await res.json();
      if (data.status === "success") {
        setClaims(data.data || []);
      }
    } catch {
      toast.error("Failed to load warranty claims");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return claims.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          c.claim_no.toLowerCase().includes(q) ||
          c.serial_number.toLowerCase().includes(q) ||
          c.product_name.toLowerCase().includes(q) ||
          c.customer_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      return true;
    });
  }, [claims, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (claims.length === 0) return;
    const headers = ["Claim No", "Serial No", "Product", "Customer", "Purchase Date", "Expiry Date", "Defect Issue", "Status", "Resolution"];
    const rows = claims.map((c) => [
      `"${c.claim_no}"`,
      `"${c.serial_number}"`,
      `"${c.product_name}"`,
      `"${c.customer_name}"`,
      c.purchase_date,
      c.expiry_date,
      `"${c.defect_issue}"`,
      c.status,
      `"${c.resolution}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `warranty_claims_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleCreateClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!newClaimData.serial_number.trim() || !newClaimData.defect_issue.trim()) {
      toast.error("Please enter serial number and defect description");
      return;
    }

    setSubmittingClaim(true);
    try {
      const res = await fetch("/api/warranty/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newClaimData),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success("Warranty claim registered successfully");
        setIsNewModalOpen(false);
        setNewClaimData({
          serial_number: "",
          product_name: "",
          customer_name: "",
          defect_issue: "",
          warranty_months: "12",
        });
        loadData();
      } else {
        toast.error(data.message || "Failed to create claim");
      }
    } catch {
      toast.error("Network error while submitting claim");
    } finally {
      setSubmittingClaim(false);
    }
  }

  async function handleSettleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!settlingClaim) return;

    setSubmittingSettle(true);
    try {
      const res = await fetch("/api/warranty/claims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: settlingClaim.id,
          status: settleStatus,
          resolution: settleResolution,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        toast.success(`Claim resolved as ${settleStatus}`);
        setSettlingClaim(null);
        setSettleResolution("");
        loadData();
      } else {
        toast.error(data.message || "Failed to update claim");
      }
    } catch {
      toast.error("Network error updating claim");
    } finally {
      setSubmittingSettle(false);
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Warranty Claims & Product Service
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Manage appliance warranties, serial number tracking, defect claims, and replacement history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={exportCSV}
            className="h-[38px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Claims</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:from-[#092f70] hover:to-[#175282] transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Claim</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by claim no, serial number, product, or customer..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["all", "CLAIMED", "REPLACED", "EXPIRED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                statusFilter === st
                  ? "bg-[#0B3D91] text-white border-[#0B3D91] shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
              }`}
            >
              {st === "all" ? "All Claims" : st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading warranty claims...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No warranty claims found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Claim No</th>
                    <th className="py-3 px-3.5">Serial No</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Product</th>
                    <th className="py-3 px-3.5">Customer</th>
                    <th className="py-3 px-3.5 text-center">Expiry</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Defect Issue</th>
                    <th className="py-3 px-3.5 min-w-[200px]">Resolution Note</th>
                    <th className="py-3 px-3.5 text-center w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((c) => (
                    <tr key={c.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {c.claim_no}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-300 font-bold">
                        {c.serial_number}
                      </td>

                      <td className="py-3 px-3.5 font-bold text-slate-900 dark:text-white">
                        {c.product_name}
                      </td>

                      <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300">
                        {c.customer_name}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-mono text-[11px]">
                        {c.expiry_date}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            c.status === "REPLACED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.status === "CLAIMED"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                        {c.defect_issue}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 text-[11px] leading-snug">
                        {c.resolution}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setSettlingClaim(c);
                            setSettleStatus(c.status === "CLAIMED" ? "REPLACED" : c.status);
                            setSettleResolution(c.resolution || "");
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 text-[#1E65A0] dark:text-blue-300 text-[10px] font-bold border border-blue-200 dark:border-blue-800 transition cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Process</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((c) => (
                <div key={c.id} className="pt-3 first:pt-0 space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {c.claim_no}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{c.product_name}</h4>
                      <p className="text-[10px] text-slate-400">SN: {c.serial_number} &bull; {c.customer_name}</p>
                    </div>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg m-0">
                    {c.defect_issue}
                  </p>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSettlingClaim(c);
                        setSettleStatus(c.status === "CLAIMED" ? "REPLACED" : c.status);
                        setSettleResolution(c.resolution || "");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1E65A0] font-bold text-xs border border-blue-200"
                    >
                      Process Claim
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 dark:border-slate-800">
              <Pagination
                currentPage={currentPage}
                totalItems={filtered.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          </>
        )}
      </div>

      {/* 4. Dynamic Intake Modal: Register New Claim */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white m-0">Register Warranty Claim</h3>
                <p className="text-[11px] text-blue-100 m-0">Customer product defect intake</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClaim} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Serial Number (or Barcode) *
                </label>
                <input
                  type="text"
                  required
                  value={newClaimData.serial_number}
                  onChange={(e) => setNewClaimData({ ...newClaimData, serial_number: e.target.value })}
                  placeholder="e.g. SN-SCH-2026-9912"
                  className="w-full h-[40px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Name / Contact
                </label>
                <input
                  type="text"
                  value={newClaimData.customer_name}
                  onChange={(e) => setNewClaimData({ ...newClaimData, customer_name: e.target.value })}
                  placeholder="e.g. Haji Nurul Huda (017XXXXXXXX)"
                  className="w-full h-[40px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Defect / Issue Reported *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newClaimData.defect_issue}
                  onChange={(e) => setNewClaimData({ ...newClaimData, defect_issue: e.target.value })}
                  placeholder="Describe fault (e.g. Tripping loose, capacitor humming, coil burnt)..."
                  className="w-full p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={submittingClaim}
                  className="h-[38px] px-4 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submittingClaim && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Claim</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Dynamic Settle Modal: Process & Settle Claim */}
      {settlingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white m-0">Process Claim: {settlingClaim.claim_no}</h3>
                <p className="text-[11px] text-blue-100 m-0">Serial: {settlingClaim.serial_number}</p>
              </div>
              <button
                type="button"
                onClick={() => setSettlingClaim(null)}
                className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSettleClaim} className="p-5 space-y-3.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="font-bold text-slate-900 dark:text-white">{settlingClaim.product_name}</div>
                <div className="text-slate-500">Customer: {settlingClaim.customer_name}</div>
                <div className="text-rose-600 dark:text-rose-400 font-semibold">Defect: {settlingClaim.defect_issue}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Settlement Decision / Status *
                </label>
                <select
                  value={settleStatus}
                  onChange={(e) => setSettleStatus(e.target.value)}
                  className="w-full h-[40px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                >
                  <option value="REPLACED">REPLACED (Hand brand new unit from stock)</option>
                  <option value="CLAIMED">CLAIMED (Under Service Center Inspection)</option>
                  <option value="EXPIRED">REJECTED / EXPIRED (Customer physical damage)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Resolution / Handover Details *
                </label>
                <textarea
                  rows={2}
                  required
                  value={settleResolution}
                  onChange={(e) => setSettleResolution(e.target.value)}
                  placeholder="e.g. Brand new replacement unit handed over to customer..."
                  className="w-full p-3 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setSettlingClaim(null)}
                  disabled={submittingSettle}
                  className="h-[38px] px-4 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSettle}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {submittingSettle && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Update & Settle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
