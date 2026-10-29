"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Server,
  Zap,
  HardDrive,
  Cpu,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

export default function SystemHealthPage() {
  const { toast } = useToast();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function checkHealth() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/health");
      const data = await res.json();
      if (data.status === "success") {
        setHealthData(data.data);
      } else {
        toast.error(data.message || "Health check reported warnings");
      }
    } catch {
      toast.error("Failed to connect to health diagnostics API");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              System Diagnostics & Database Health
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live heartbeat, MySQL latency, table metrics, and peripheral connectivity status
            </p>
          </div>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-[#1E65A0] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Health Check</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
          <span className="text-xs text-slate-400">Pinging database & diagnostic probes...</span>
        </div>
      ) : healthData ? (
        <div className="space-y-4">
          {/* Primary Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">All Systems Operational</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                    {healthData.database_status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Connected to MySQL {healthData.mysql_version} • Query latency: {healthData.query_latency_ms} ms
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Active Database</span>
              <span className="font-mono text-xs font-bold text-[#0B3D91] dark:text-blue-400">
                {healthData.database_name}
              </span>
            </div>
          </div>

          {/* Table Metrics */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#1E65A0]" />
              Database Table Record Counts
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(healthData.table_counts || {}).map(([table, count]) => (
                <div key={table} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] text-slate-400 capitalize block">{table.replace("_", " ")}</span>
                  <span className="text-base font-black text-slate-800 dark:text-white mt-0.5 block font-mono">
                    {String(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Probes */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-[#1E65A0]" />
              Application Runtime Probes
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {Object.entries(healthData.services || {}).map(([srv, st]) => (
                <div key={srv} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0">
                  <span className="text-slate-700 dark:text-slate-300 font-medium capitalize">
                    {srv.replace(/_/g, " ")}
                  </span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {String(st)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
