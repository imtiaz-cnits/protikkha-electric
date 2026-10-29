"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Database,
  Download,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  HardDrive,
  AlertTriangle,
  Loader2,
  FileCode,
  Shield,
  FileCheck,
  ShieldAlert,
} from "lucide-react";
import { useToast } from "@/components/ui";

interface BackupRecord {
  filename: string;
  size_bytes: number;
  size_formatted: string;
  created_at: string;
  checksum: string;
}

interface BackupSummary {
  total_backups: number;
  total_size_bytes: number;
  last_backup_date: string | null;
}

export default function DatabaseBackupPage() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [summary, setSummary] = useState<BackupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/backup");
      const data = await res.json();
      if (data.status === "success") {
        setBackups(data.data);
        setSummary(data.summary);
      } else {
        toast.error(data.message || "Failed to load backups");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error communicating with backup service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      const res = await fetch("/api/settings/backup", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success(data.message || "Database backup generated successfully!");
        loadBackups();
      } else {
        toast.error(data.message || "Failed to generate database backup");
      }
    } catch (err: any) {
      toast.error(err.message || "Error running backup script");
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/settings/backup/download?file=${encodeURIComponent(filename)}`, "_blank");
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Database Backup & Disaster Recovery
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium">
                ডাটাবেস ব্যাকআপ ও রিকভারি
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              নিরাপদ স্বয়ংক্রিয় ব্যাকআপ, SHA-256 চেকার ও দূর্যোগকালীন ডাটা পুনরুদ্ধার
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer disabled:opacity-50"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            {creating ? "ব্যাকআপ তৈরি হচ্ছে..." : "নতুন ব্যাকআপ তৈরি করুন (Run Backup)"}
          </button>
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Backups</span>
            <FileCode className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono">
            {summary?.total_backups || 0}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সংরক্ষিত ব্যাকআপ ফাইলের সংখ্যা</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Total Storage</span>
            <HardDrive className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
            {summary ? (summary.total_size_bytes / (1024 * 1024)).toFixed(2) + " MB" : "0 MB"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">ডিস্কে দখলকৃত মোট স্টোরেজ</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Auto-Retention</span>
            <ShieldCheck className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
            30 Copies
          </div>
          <p className="text-[11px] text-slate-400 mt-1">অটোমেটিক ৩০টি ব্যাকআপ সংরক্ষণ নীতি</p>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Last Backup</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono mt-1">
            {summary?.last_backup_date ? new Date(summary.last_backup_date).toLocaleString("en-GB") : "Never"}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">সর্বশেষ সফল ব্যাকআপের সময়</p>
        </div>
      </div>

      {/* 3. Backups Table */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#1E65A0]" />
            Backups Directory List (সংরক্ষিত ব্যাকআপ তালিকা)
          </h3>
          <button
            onClick={loadBackups}
            className="text-xs font-bold text-[#1E65A0] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> রিফ্রেশ
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
            <p className="text-xs">Loading database backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Database className="w-10 h-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">কোন ব্যাকআপ ফাইল পাওয়া যায়নি</p>
            <p className="text-xs text-slate-400">তাত্ক্ষণিক ব্যাকআপ নিতে উপরের বাটনে ক্লিক করুন</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white">
                <tr>
                  <th className="px-4 py-3 font-semibold">Backup Filename</th>
                  <th className="px-4 py-3 font-semibold">Created Timestamp</th>
                  <th className="px-4 py-3 font-semibold">File Size</th>
                  <th className="px-4 py-3 font-semibold">SHA-256 Checksum</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-[#1E65A0] dark:text-blue-400">
                      {b.filename}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                      {new Date(b.created_at).toLocaleString("en-GB")}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {b.size_formatted}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={b.checksum}>
                      {b.checksum.length > 24 ? b.checksum.slice(0, 24) + "..." : b.checksum}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownload(b.filename)}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] rounded-xl hover:opacity-95 transition-opacity flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        ডাউনলোড (.sql)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Disaster Recovery & Restoration Guide Card */}
      <div className="bg-white dark:bg-[#0f172a] p-5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          ডাটাবেস পুনরুদ্ধার ও রিস্টোরেশন নির্দেশিকা (Disaster Recovery SOP)
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          কোন অনাকাঙ্ক্ষিত সার্ভার ক্র্যাশ বা ডাটা নষ্টের ঘটনায় সিস্টেমের পূর্বাবস্থায় ফিরে যাওয়ার জন্য সিআইটি
          নিরাপত্তা প্রটোকল অনুযায়ী ব্যাকআপ রিস্টোরেশন স্ক্রিপ্ট প্রস্তুত রয়েছে। উৎপাদনশীল ডাটাবেসের সুরক্ষা নিশ্চিতে
          রিস্টোর কমান্ড কখনোই প্রোডাকশনে সরাসরি কার্যকর করবেন না; প্রথমে টেস্ট বা আইসোলেটেড ডাটাবেসে যাচাই করুন:
        </p>

        <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs overflow-x-auto space-y-1">
          <p className="text-slate-400"># 1. ব্যাকআপ যাচাই ও আইসোলেটেড ডাটাবেসে রিস্টোর পরীক্ষা:</p>
          <p className="text-emerald-400">
            node scripts/restore-db.mjs backups/{backups[0]?.filename || "backup_name.sql"} --target-db protikkha_restore_test
          </p>
          <p className="text-slate-400 mt-2"># 2. উইন্ডোজ টাস্ক শিডিউলার বা ক্রনজব দিয়ে দৈনিক রাত ১২টায় অটো-ব্যাকআপ:</p>
          <p className="text-blue-300">0 0 * * * node /path/to/protikkha-electric/scripts/backup-db.mjs</p>
        </div>
      </div>
    </div>
  );
}
