"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  FileText,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  MapPin,
  Loader2,
  Building,
  User,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface JobItem {
  id: number;
  job_code: string;
  quotation_no: string;
  project_name: string;
  site_location: string;
  client_name: string;
  contractor_name: string;
  estimated_boq_items: number;
  total_estimate: number;
  commission_rate: number;
  status: string;
  start_date: string;
  target_completion: string;
}

export default function ContractorJobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/quotations/contractor-jobs");
      const data = await res.json();
      if (data.status === "success") {
        setJobs(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load contractor jobs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          j.project_name.toLowerCase().includes(q) ||
          j.job_code.toLowerCase().includes(q) ||
          j.contractor_name.toLowerCase().includes(q) ||
          j.client_name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter !== "all" && j.status !== statusFilter) return false;
      return true;
    });
  }, [jobs, search, statusFilter]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  function exportCSV() {
    if (jobs.length === 0) return;
    const headers = ["Job Code", "Project", "Client", "Location", "Contractor", "Estimate Amount", "Commission %", "Status", "Target Date"];
    const rows = jobs.map((j) => [
      `"${j.job_code}"`,
      `"${j.project_name}"`,
      `"${j.client_name}"`,
      `"${j.site_location}"`,
      `"${j.contractor_name}"`,
      j.total_estimate,
      j.commission_rate,
      j.status,
      j.target_completion,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `contractor_project_jobs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Contractor Project Assignments & BOQ
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage electrical site project assignments, bill of quantities (BOQ), and contractor work progress
            </p>
          </div>
        </div>

        <button
          onClick={exportCSV}
          className="h-[38px] px-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold hover:border-[#1E65A0] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export Jobs</span>
        </button>
      </div>

      {/* Filter */}
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
            placeholder="Search by project name, contractor, client, or location..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex gap-2">
          {["all", "ASSIGNED", "IN_PROGRESS", "COMPLETED"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold border transition ${
                statusFilter === st
                  ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
              }`}
            >
              {st === "all" ? "All Projects" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <span className="text-xs text-slate-400">Loading contractor projects...</span>
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            No contractor project jobs found.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white uppercase text-[11px] font-bold tracking-wider select-none">
                  <tr>
                    <th className="py-3 px-3.5">Job Code</th>
                    <th className="py-3 px-3.5 min-w-[220px]">Project & Site Location</th>
                    <th className="py-3 px-3.5">Client</th>
                    <th className="py-3 px-3.5 min-w-[180px]">Assigned Contractor</th>
                    <th className="py-3 px-3.5 text-right">Estimate (BOQ)</th>
                    <th className="py-3 px-3.5 text-center">Comm %</th>
                    <th className="py-3 px-3.5 text-center">Target Date</th>
                    <th className="py-3 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map((j) => (
                    <tr key={j.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {j.job_code}
                        </span>
                      </td>

                      <td className="py-3 px-3.5">
                        <p className="font-bold text-slate-900 dark:text-white">{j.project_name}</p>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-amber-500" />
                          {j.site_location}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 whitespace-nowrap font-medium text-slate-800 dark:text-slate-200">
                        {j.client_name}
                      </td>

                      <td className="py-3 px-3.5">
                        <p className="font-bold text-[#1E65A0] dark:text-blue-400">{j.contractor_name}</p>
                        <span className="text-[10px] text-slate-400">{j.estimated_boq_items} BOQ Material Lines</span>
                      </td>

                      <td className="py-3 px-3.5 text-right whitespace-nowrap font-bold text-slate-900 dark:text-white">
                        {formatBdCurrency(j.total_estimate)}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-bold text-amber-600 dark:text-amber-400">
                        {j.commission_rate}%
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap font-medium text-slate-600 dark:text-slate-400">
                        {j.target_completion}
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            j.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : j.status === "IN_PROGRESS"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {j.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
              {paginated.map((j) => (
                <div key={j.id} className="pt-3 first:pt-0 space-y-1.5 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                        {j.job_code}
                      </span>
                      <h4 className="font-bold text-slate-800 dark:text-white mt-1">{j.project_name}</h4>
                      <p className="text-[10px] text-slate-400">{j.contractor_name} • {j.site_location}</p>
                    </div>
                    <span className="font-bold text-[#0B3D91] dark:text-blue-400">
                      {formatBdCurrency(j.total_estimate)}
                    </span>
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
    </div>
  );
}
