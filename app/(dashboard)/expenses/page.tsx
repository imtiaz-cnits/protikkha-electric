"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  Layers,
  User,
  DollarSign,
  TrendingDown,
  Edit2,
  Trash2,
  X,
  Loader2,
  FileText,
  Filter,
  Coins,
  Tag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { Pagination, DeleteConfirmModal, CustomSelect, useToast } from "@/components/ui";

interface Expense {
  id: number;
  expense_type_id: number;
  type_name: string;
  staff_id?: number | null;
  staff_name?: string | null;
  staff_role?: string | null;
  expense_amount: number;
  expense_details: string;
  date: string;
  creator: string;
}

interface ExpenseType {
  id: number;
  type_name: string;
}

interface Staff {
  id: number;
  name: string;
  role: string;
}

interface Summary {
  total_amount: number;
  today_amount: number;
  this_month_amount: number;
  total_records: number;
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    expense_type_id: "",
    staff_id: "",
    expense_amount: "",
    expense_details: "",
    date: new Date().toISOString().split("T")[0],
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Opening Balance Modal State
  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [openingDate, setOpeningDate] = useState(new Date().toISOString().split("T")[0]);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNote, setOpeningNote] = useState("");
  const [savingOpening, setSavingOpening] = useState(false);

  // Delete Confirm Modal State
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Quick Add Category Modal State
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatStatus, setNewCatStatus] = useState("Active");
  const [savingNewCat, setSavingNewCat] = useState(false);
  const [newCatError, setNewCatError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      let url = `/api/expenses?search=${encodeURIComponent(search)}`;
      if (selectedTypeFilter !== "all") url += `&type_id=${selectedTypeFilter}`;
      if (fromDate) url += `&from_date=${fromDate}`;
      if (toDate) url += `&to_date=${toDate}`;

      const [expRes, typesRes, staffRes, openRes] = await Promise.all([
        fetch(url),
        fetch("/api/expense-types"),
        fetch("/api/staff"),
        fetch(`/api/opening-balance?date=${openingDate}`),
      ]);

      const [expData, typesData, staffData, openData] = await Promise.all([
        expRes.json(),
        typesRes.json(),
        staffRes.json(),
        openRes.json(),
      ]);

      if (expData.status === "success") {
        setExpenses(expData.data);
        setSummary(expData.summary);
      }
      if (typesData.status === "success") setExpenseTypes(typesData.data);
      if (staffData.status === "success") setStaffList(staffData.data);
      if (openData.status === "success" && openData.data?.length > 0) {
        setOpeningBalance(openData.data[0].amount);
        setOpeningAmount(String(openData.data[0].amount));
        setOpeningNote(openData.data[0].note || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedTypeFilter, fromDate, toDate]);

  const handleOpenEdit = (exp: Expense) => {
    setSelectedExpense(exp);
    setFormData({
      expense_type_id: String(exp.expense_type_id),
      staff_id: exp.staff_id ? String(exp.staff_id) : "",
      expense_amount: String(exp.expense_amount),
      expense_details: exp.expense_details,
      date: exp.date,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expense_type_id || !formData.expense_amount) {
      setErrorMsg("Please select an expense category and enter amount!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const url = selectedExpense ? `/api/expenses/${selectedExpense.id}` : "/api/expenses";
      const method = selectedExpense ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_type_id: formData.expense_type_id,
          staff_id: formData.staff_id ? formData.staff_id : null,
          expense_amount: formData.expense_amount,
          expense_details: formData.expense_details,
          date: formData.date,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsModalOpen(false);
        setSelectedExpense(null);
        setFormData({
          expense_type_id: "",
          staff_id: "",
          expense_amount: "",
          expense_details: "",
          date: new Date().toISOString().split("T")[0],
        });
        toast.success(
          selectedExpense
            ? "Expense updated successfully!"
            : "Expense recorded successfully!"
        );
        setCurrentPage(1);
        loadData();
      } else {
        setErrorMsg(data.message || "Failed to record expense");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      setNewCatError("Category name is required");
      return;
    }

    setSavingNewCat(true);
    setNewCatError("");
    try {
      const res = await fetch("/api/expense-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type_name: newCatName.trim(),
          status: newCatStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Expense category created successfully!");
        const newType = data.data;
        setExpenseTypes((prev) => [
          { id: Number(newType.id), type_name: newType.type_name },
          ...prev,
        ]);
        setFormData((prev) => ({ ...prev, expense_type_id: String(newType.id) }));
        setIsAddCategoryOpen(false);
        setNewCatName("");
        setNewCatStatus("Active");
        fetch("/api/expense-types")
          .then((r) => r.json())
          .then((t) => {
            if (t.status === "success") setExpenseTypes(t.data);
          })
          .catch(() => {});
      } else {
        setNewCatError(data.message || "Failed to create category");
      }
    } catch (err: any) {
      setNewCatError(err?.message || "Failed to create category");
    } finally {
      setSavingNewCat(false);
    }
  };

  const handleDelete = (exp: Expense) => {
    setDeleteError(null);
    setExpenseToDelete(exp);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/expenses/${expenseToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Expense deleted successfully!");
        setExpenseToDelete(null);
        setCurrentPage(1);
        loadData();
      } else {
        setDeleteError(data.message || "Failed to delete expense record");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Communication error deleting expense");
    } finally {
      setIsDeleting(false);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedExpenses = expenses.slice(startIndex, startIndex + pageSize);


  const handleSaveOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingOpening(true);
      const res = await fetch("/api/opening-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(openingAmount || "0"),
          date: openingDate,
          note: openingNote,
        }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setOpeningBalance(data.data.amount);
        setIsOpeningModalOpen(false);
      } else {
        alert(data.message || "Failed to save opening balance");
      }
    } catch {
      alert("Error saving opening balance");
    } finally {
      setSavingOpening(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Daily Expense Register
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Track daily operating overheads, utilities, staff salaries, and misc costs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start lg:self-auto">
          <button
            onClick={() => setIsOpeningModalOpen(true)}
            className="h-[38px] px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Set Daily Cash Drawer Opening Balance"
          >
            <Coins className="w-4 h-4" />
            <span>
              Opening: {openingBalance ? formatBdCurrency(openingBalance) : "Set Float"}
            </span>
          </button>

          <Link
            href="/expense-types"
            className="h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Tag className="w-4 h-4" />
            <span>Categories</span>
          </Link>

          <Link
            href="/staff"
            className="h-[38px] px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>Staff</span>
          </Link>

          <button
            onClick={() => {
              setSelectedExpense(null);
              setFormData({
                expense_type_id: expenseTypes[0]?.id ? String(expenseTypes[0].id) : "",
                staff_id: "",
                expense_amount: "",
                expense_details: "",
                date: new Date().toISOString().split("T")[0],
              });
              setIsModalOpen(true);
            }}
            className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* 2. Four Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Today's Cash Opening Float */}
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Cash Float (Opening)</span>
            <Coins className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {openingBalance ? formatBdCurrency(openingBalance) : "৳ 0.00"}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Initial counter drawer cash
          </div>
        </div>

        {/* Today's Expense */}
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Today's Expenses</span>
            <Calendar className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatBdCurrency(summary?.today_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Spent today so far</div>
        </div>

        {/* This Month's Expense */}
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>This Month's Overhead</span>
            <TrendingDown className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {formatBdCurrency(summary?.this_month_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Current month total</div>
        </div>

        {/* All Time Total */}
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Recorded</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {formatBdCurrency(summary?.total_amount || 0)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {summary?.total_records || 0} vouchers
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155]">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search details, category, or staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <div className="w-[180px]">
            <CustomSelect
              options={[
                { value: "all", label: "All Categories" },
                ...expenseTypes.map((t) => ({ value: t.id, label: t.type_name })),
              ]}
              value={selectedTypeFilter}
              onChange={(val) => {
                setSelectedTypeFilter(String(val));
                setCurrentPage(1);
              }}
              placeholder="All Categories"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <div className="w-[135px]">
              <CustomDatePicker
                value={fromDate}
                onChange={(d) => {
                  setFromDate(d);
                  setCurrentPage(1);
                }}
                placeholder="From Date"
                allowClear
              />
            </div>
            <span className="text-xs text-slate-400">to</span>
            <div className="w-[135px]">
              <CustomDatePicker
                value={toDate}
                onChange={(d) => {
                  setToDate(d);
                  setCurrentPage(1);
                }}
                placeholder="To Date"
                allowClear
              />
            </div>
          </div>

          {(fromDate || toDate || selectedTypeFilter !== "all") && (
            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setSelectedTypeFilter("all");
                setCurrentPage(1);
              }}
              className="h-[38px] px-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Desktop Table (Strict Marss Corp Rule: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-3 text-center w-[50px]">SL</th>
                <th className="py-3 px-4">Date / Entry ID</th>
                <th className="py-3 px-3">Expense Category</th>
                <th className="py-3 px-3">Staff / Beneficiary</th>
                <th className="py-3 px-3">Description / Remarks</th>
                <th className="py-3 px-3 text-right">Amount (৳)</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading expense records...</span>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    No expense records found. Click "+ Add Expense" to record one.
                  </td>
                </tr>
              ) : (
                displayedExpenses.map((exp, idx) => (
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-3 text-center font-bold text-slate-500">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{exp.date}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        #EXP-{exp.id} &bull; by {exp.creator}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
                        {exp.type_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                      {exp.staff_name ? (
                        <div>
                          <div className="font-bold">{exp.staff_name}</div>
                          <span className="text-[10px] text-emerald-600 uppercase">
                            {exp.staff_role}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[240px]">
                      {exp.expense_details || "No remarks"}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-rose-600 dark:text-rose-400 text-xs">
                      {formatBdCurrency(exp.expense_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(exp)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Expense"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(exp)}
                          className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Expense"
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

        {/* Desktop Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={expenses.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Card View */}
      <div className="block md:hidden space-y-2.5">
        {displayedExpenses.map((exp) => (
          <div
            key={exp.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {exp.type_name}
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                  {exp.expense_details || "General Overhead"}
                </p>
              </div>
              <span className="text-xs font-black text-rose-600">
                {formatBdCurrency(exp.expense_amount)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              <span>Date: {exp.date}</span>
              {exp.staff_name && <span>Staff: {exp.staff_name}</span>}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleOpenEdit(exp)}
                className="h-[30px] px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(exp)}
                className="h-[30px] px-2.5 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {/* Mobile Pagination */}
        <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalItems={expenses.length}
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

      {/* 6. ADD / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  {selectedExpense ? "Edit Expense Entry" : "Record New Expense"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Expense Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Expense Category / Head <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 min-w-0">
                    <CustomSelect
                      options={expenseTypes.map((t) => ({ value: t.id, label: t.type_name }))}
                      value={formData.expense_type_id}
                      onChange={(val) => setFormData({ ...formData, expense_type_id: String(val) })}
                      placeholder="Select Category..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCatName("");
                      setNewCatStatus("Active");
                      setNewCatError("");
                      setIsAddCategoryOpen(true);
                    }}
                    className="h-[42px] w-[42px] rounded-xl bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] hover:from-[#700f2b] hover:to-[#991b1b] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs border border-rose-800"
                    title="Add New Category"
                  >
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Expense Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formData.expense_amount}
                    onChange={(e) => setFormData({ ...formData, expense_amount: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-rose-600 text-base focus:outline-none focus:ring-2 focus:ring-rose-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Expense Date
                  </label>
                  <CustomDatePicker
                    value={formData.date}
                    onChange={(d) => setFormData({ ...formData, date: d })}
                  />
                </div>
              </div>

              {/* Staff / Employee (Optional) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Staff / Beneficiary (Optional - For Salary / Advances)
                </label>
                <CustomSelect
                  options={[
                    { value: "", label: "None (General Shop Expense)" },
                    ...staffList.map((s) => ({ value: s.id, label: `${s.name} (${s.role})` })),
                  ]}
                  value={formData.staff_id}
                  onChange={(val) => setFormData({ ...formData, staff_id: String(val) })}
                  placeholder="Select Staff..."
                />
              </div>

              {/* Details / Remark */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Expense Details / Voucher Note
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Tea & snacks for showroom guests, electricity bill voucher #892"
                  value={formData.expense_details}
                  onChange={(e) => setFormData({ ...formData, expense_details: e.target.value })}
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-600 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>Save Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. OPENING CASH FLOAT MODAL (Rule 6.1 - 6.4) */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Cash Drawer Opening Balance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOpening} className="p-5 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
                Set or update the beginning cash amount held in the retail shop register drawer at the start of business day.
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Float Date <span className="text-red-500">*</span>
                </label>
                <CustomDatePicker
                  value={openingDate}
                  onChange={(d) => setOpeningDate(d)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Opening Cash Amount (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full h-[42px] px-3 text-base bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-amber-600 font-black focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Note / Float Memo
                </label>
                <input
                  type="text"
                  placeholder="e.g. Starting float 500x5 + small change"
                  value={openingNote}
                  onChange={(e) => setOpeningNote(e.target.value)}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-rose-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  disabled={savingOpening}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOpening}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {savingOpening && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Float</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. QUICK ADD EXPENSE CATEGORY MODAL (Stacked on top of current modal) */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            {/* Header: Solid brand gradient with Tag icon & red circular close button */}
            <div className="modal-header-brand bg-gradient-to-r from-[#881337] via-[#991b1b] to-[#b91c1c] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Add Expense Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewCategory} className="p-5 space-y-4 flex-1 overflow-y-auto">
              {newCatError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {newCatError}
                </div>
              )}

              {/* Category Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electricity Bill, Shop Rent, Staff Conveyance"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-rose-600"
                  autoFocus
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <CustomSelect
                  value={newCatStatus}
                  onChange={(val) => setNewCatStatus(val)}
                  options={[
                    { value: "Active", label: "Active" },
                    { value: "Inactive", label: "Inactive" },
                  ]}
                  placeholder="Select Status"
                />
              </div>

              {/* Sticky Footer: Cancel Red #dc2626, Save Brand Red */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryOpen(false)}
                  disabled={savingNewCat}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNewCat}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {savingNewCat && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Category</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!expenseToDelete}
        onClose={() => {
          if (!isDeleting) {
            setExpenseToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDeleteExpense}
        title="Delete Expense Record"
        itemName={expenseToDelete ? `${expenseToDelete.type_name} (${formatBdCurrency(expenseToDelete.expense_amount)})` : ""}
        description="Are you sure you want to delete this expense record? This will permanently remove the expense transaction from accounts."
        loading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
