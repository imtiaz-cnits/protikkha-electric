"use client";

import { useState, useEffect, useMemo } from "react";
import { formatBdCurrency } from "@/lib/utils";
import {
  Wallet,
  Building,
  CreditCard,
  Search,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Loader2,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Pagination } from "@/components/ui";
import { useToast } from "@/components/ui/toast";

interface AccountItem {
  id: number;
  account_name: string;
  account_type: string;
  account_number: string;
  bank_name: string;
  branch_name: string;
  balance: number;
  status: string;
  recent_transactions_count: number;
}

export default function CashBankPage() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/cash-bank");
      const data = await res.json();
      if (data.status === "success") {
        setAccounts(data.data || []);
      }
    } catch (err: any) {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalLiquidity = useMemo(() => {
    return accounts.reduce((acc, a) => acc + a.balance, 0);
  }, [accounts]);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const match =
          a.account_name.toLowerCase().includes(q) ||
          a.bank_name.toLowerCase().includes(q) ||
          a.account_number.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (typeFilter !== "all" && a.account_type !== typeFilter) return false;
      return true;
    });
  }, [accounts, search, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E65A0] dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-slate-800 flex items-center justify-center shrink-0 shadow-2xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
              Cash Book & Bank Accounts
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage physical cash in hand, commercial bank accounts, and mobile banking balances
            </p>
          </div>
        </div>

        {/* Total Liquidity Badge */}
        <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] text-white px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
          <div>
            <span className="text-[10px] text-blue-200 uppercase tracking-wider block font-semibold">Total Cash & Bank Balance</span>
            <span className="text-lg font-black">{formatBdCurrency(totalLiquidity)}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search accounts by name, bank, or account number..."
            className="w-full h-[38px] pl-9 pr-3.5 rounded-xl border-[1.5px] border-[#cbd5e1] dark:border-[#334155] bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-[#1E65A0]"
          />
        </div>

        <div className="flex gap-2">
          {["all", "CASH", "BANK", "MOBILE_BANKING"].map((st) => (
            <button
              key={st}
              onClick={() => setTypeFilter(st)}
              className={`h-[38px] px-3.5 rounded-xl text-xs font-bold border transition ${
                typeFilter === st
                  ? "bg-[#0B3D91] text-white border-[#0B3D91]"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#1E65A0]"
              }`}
            >
              {st === "all" ? "All Accounts" : st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Account Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#1E65A0]" />
          <span className="text-xs text-slate-400">Loading accounts...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3 hover:border-[#1E65A0] transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1E65A0] flex items-center justify-center">
                  {a.account_type === "CASH" ? (
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  ) : a.account_type === "MOBILE_BANKING" ? (
                    <CreditCard className="w-5 h-5 text-amber-500" />
                  ) : (
                    <Building className="w-5 h-5 text-[#1E65A0]" />
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {a.account_type}
                </span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">{a.account_name}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">{a.bank_name}</p>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                  {a.account_number}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Available Balance</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {formatBdCurrency(a.balance)}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
