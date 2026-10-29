"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  Filter,
  Eye,
  X,
  Loader2,
  Calendar,
  User,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { Pagination, CustomSelect } from "@/components/ui";

interface AuditLogItem {
  id: number;
  userId: number | null;
  userName: string;
  userEmail: string | null;
  userRole: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "CANCEL" | "ADJUST";
  entityType: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (entityFilter !== "all") params.append("entityType", entityFilter);
      if (search.trim()) params.append("entityId", search.trim());

      const res = await fetch(`/api/reports/audit-logs?${params.toString()}`);
      const data = await res.json();
      if (data.status === "success") {
        setLogs(data.data || []);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.totalCount || 0);
        }
      }
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize, actionFilter, entityFilter]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800";
      case "CANCEL":
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800";
      case "APPROVE":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800";
      case "UPDATE":
        return "bg-blue-50 text-[#1E65A0] border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Audit Trails & Security Log
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Immutable server-side audit logs of discounts, cancellations, stock movements, and user actions
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setPage(1);
            fetchLogs();
          }}
          className="h-[38px] px-3.5 rounded-xl border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-slate-50 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Events</span>
            <Activity className="w-4 h-4 text-[#1E65A0]" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Recorded operations</div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Discount Approvals</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {logs.filter((l) => l.entityType === "DISCOUNT_OVERRIDE").length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Manager discounts</div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Cancellations</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {logs.filter((l) => l.action === "CANCEL").length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Orders & write-offs</div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Logged Operators</span>
            <User className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {new Set(logs.map((l) => l.userId).filter(Boolean)).size}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Distinct user IDs</div>
        </div>
      </div>

      {/* 3. Filter Controls */}
      <div className="bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <div className="w-36">
            <CustomSelect
              value={actionFilter}
              onChange={(val) => {
                setActionFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Actions" },
                { value: "CREATE", label: "CREATE" },
                { value: "UPDATE", label: "UPDATE" },
                { value: "DELETE", label: "DELETE" },
                { value: "APPROVE", label: "APPROVE" },
                { value: "CANCEL", label: "CANCEL" },
              ]}
              placeholder="All Actions"
            />
          </div>

          {/* Entity Filter */}
          <div className="w-44">
            <CustomSelect
              value={entityFilter}
              onChange={(val) => {
                setEntityFilter(val);
                setPage(1);
              }}
              options={[
                { value: "all", label: "All Entities" },
                { value: "ORDER", label: "ORDER" },
                { value: "DISCOUNT_OVERRIDE", label: "DISCOUNT_OVERRIDE" },
                { value: "PURCHASE", label: "PURCHASE" },
                { value: "STOCK", label: "STOCK" },
                { value: "WARRANTY", label: "WARRANTY" },
                { value: "QUOTATION", label: "QUOTATION" },
                { value: "USER", label: "USER" },
              ]}
              placeholder="All Entities"
            />
          </div>

          {/* Search by Entity ID */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search Entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  fetchLogs();
                }
              }}
              className="h-[38px] pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong>{logs.length}</strong> of <strong>{totalCount}</strong> logs
        </div>
      </div>

      {/* 4. Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-4 w-12 text-center">SL</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-center">Action</th>
                <th className="py-3 px-4">Entity & Reference</th>
                <th className="py-3 px-4">Operator / Staff</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-center w-28">Diff / Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#1E65A0]" />
                    <span>Loading audit records...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    No audit records found matching the criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log, idx) => (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {(page - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {new Date(log.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span className="font-mono text-xs">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-slate-500 font-mono text-[11px]">
                            #{log.entityId}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {log.userName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Role: <span className="font-semibold uppercase">{log.userRole}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {log.ipAddress || "Internal"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="h-[30px] px-2.5 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-[#1e293b] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 mx-auto cursor-pointer transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-[#1E65A0]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={page}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200]}
        />
      </div>

      {/* 5. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {logs.map((log) => (
          <div
            key={log.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getActionBadge(
                    log.action
                  )}`}
                >
                  {log.action}
                </span>
                <span className="font-bold text-xs text-slate-800 dark:text-white ml-2">
                  {log.entityType} #{log.entityId}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {new Date(log.createdAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Operator:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">
                {log.userName} ({log.userRole})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedLog(log)}
              className="h-[30px] w-full px-3 rounded-lg border border-[#cbd5e1] dark:border-[#334155] bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#1E65A0]" />
              <span>Inspect Values & Diff</span>
            </button>
          </div>
        ))}
      </div>

      {/* 6. LOG DIFF MODAL (Rule 9: Sticky Header & Footer, Circular Red Close) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Audit Inspection: {selectedLog.action} {selectedLog.entityType} #{selectedLog.entityId}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400">Operator:</span>{" "}
                  <strong className="text-slate-800 dark:text-white">
                    {selectedLog.userName} ({selectedLog.userRole})
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Timestamp:</span>{" "}
                  <strong className="text-slate-800 dark:text-white">
                    {new Date(selectedLog.createdAt).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">IP Address:</span>{" "}
                  <strong className="text-slate-800 dark:text-white font-mono">
                    {selectedLog.ipAddress || "Internal"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Entity:</span>{" "}
                  <strong className="text-slate-800 dark:text-white font-mono">
                    {selectedLog.entityType} #{selectedLog.entityId}
                  </strong>
                </div>
              </div>

              {/* Values Comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Previous Values (Before)
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 overflow-x-auto max-h-60">
                    {selectedLog.oldValues
                      ? JSON.stringify(selectedLog.oldValues, null, 2)
                      : "None (Created new record)"}
                  </pre>
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Values (After)
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 overflow-x-auto max-h-60">
                    {selectedLog.newValues
                      ? JSON.stringify(selectedLog.newValues, null, 2)
                      : "None (Record deleted or purged)"}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="h-[38px] px-5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
