"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  Shield,
  Edit2,
  Trash2,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  Banknote,
  DollarSign,
  UserCheck,
  Calendar,
} from "lucide-react";
import { formatBdCurrency } from "@/lib/utils";
import { CustomDatePicker } from "@/components/ui/date-picker";
import { CustomSelect } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { Pagination, DeleteConfirmModal } from "@/components/ui";

interface StaffMember {
  id: number;
  name: string;
  email: string | null;
  mobile: string;
  role: string;
  status: string;
  total_salary_paid: number;
  total_payout_count: number;
  created_at: string;
}

interface ExpenseType {
  id: number;
  type_name: string;
}

export default function StaffPage() {
  const { toast } = useToast();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Staff Add/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    role: "staff",
    password: "",
    status: "approved",
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Salary Disburse Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutStaff, setPayoutStaff] = useState<StaffMember | null>(null);
  const [payoutData, setPayoutData] = useState({
    expense_type_id: "",
    expense_amount: "",
    expense_details: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const url = search
        ? `/api/staff?search=${encodeURIComponent(search)}`
        : "/api/staff";

      const [staffRes, typesRes] = await Promise.all([
        fetch(url),
        fetch("/api/expense-types"),
      ]);

      const [staffData, typesData] = await Promise.all([
        staffRes.json(),
        typesRes.json(),
      ]);

      if (staffData.status === "success") {
        setStaffList(staffData.data);
      }
      if (typesData.status === "success") {
        setExpenseTypes(typesData.data);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Handle Staff Modal
  const handleOpenAdd = () => {
    setSelectedStaff(null);
    setFormData({
      name: "",
      mobile: "",
      email: "",
      role: "staff",
      password: "",
      status: "approved",
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StaffMember) => {
    setSelectedStaff(item);
    setFormData({
      name: item.name,
      mobile: item.mobile,
      email: item.email || "",
      role: item.role || "staff",
      password: "",
      status: item.status || "approved",
    });
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      setErrorMsg("Staff name and mobile number are required!");
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);

      const url = selectedStaff ? `/api/staff/${selectedStaff.id}` : "/api/staff";
      const method = selectedStaff ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsModalOpen(false);
        toast.success(
          selectedStaff
            ? "Staff member updated successfully!"
            : "Staff member added successfully!"
        );
        setCurrentPage(1);
        loadData();
      } else {
        setErrorMsg(data.message || "Operation failed");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = (item: StaffMember) => {
    if (item.id === 1 || item.id === 7) {
      toast.error("Super Admin account cannot be deleted!");
      return;
    }
    setDeleteError(null);
    setStaffToDelete(item);
  };

  const confirmDeleteStaff = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/staff/${staffToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        toast.success("Staff member removed successfully!");
        setStaffToDelete(null);
        setCurrentPage(1);
        loadData();
      } else {
        setDeleteError(data.message || "Failed to remove staff");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Communication error removing staff");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Salary / Advance Payout Modal
  const handleOpenPayout = (staff: StaffMember) => {
    setPayoutStaff(staff);
    // Find salary or advance type
    const salaryType =
      expenseTypes.find((t) =>
        t.type_name.toLowerCase().includes("salary") ||
        t.type_name.toLowerCase().includes("staff")
      ) || expenseTypes[0];

    setPayoutData({
      expense_type_id: salaryType ? String(salaryType.id) : "",
      expense_amount: "",
      expense_details: `Monthly Salary / Advance disbursement for ${staff.name}`,
      date: new Date().toISOString().split("T")[0],
    });
    setPayoutError(null);
    setIsPayoutModalOpen(true);
  };

  const handleSubmitPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutData.expense_type_id || !payoutData.expense_amount) {
      setPayoutError("Please enter amount and category!");
      return;
    }

    try {
      setSavingPayout(true);
      setPayoutError(null);

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_type_id: payoutData.expense_type_id,
          staff_id: payoutStaff?.id,
          expense_amount: payoutData.expense_amount,
          expense_details: payoutData.expense_details,
          date: payoutData.date,
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setIsPayoutModalOpen(false);
        toast.success("Salary payout disbursed successfully!");
        setCurrentPage(1);
        loadData();
      } else {
        setPayoutError(data.message || "Failed to disburse salary");
      }
    } catch (err: any) {
      setPayoutError(err?.message || "Communication error");
    } finally {
      setSavingPayout(false);
    }
  };

  const startIndex = (currentPage - 1) * pageSize;
  const displayedStaff = staffList.slice(startIndex, startIndex + pageSize);

  // KPIs
  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === "approved").length;
  const totalDisbursed = staffList.reduce(
    (acc, s) => acc + (s.total_salary_paid || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* 1. Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0f172a] p-4 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-rose-100 dark:border-slate-800 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white m-0 leading-tight">
              Staff & Payroll Directory
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 m-0">
              Manage employees, permissions, and salary/advance disbursement tracking
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* 2. Three KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Staff Registered</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {totalStaff}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active shop workforce</div>
        </div>

        <div className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Approved Accounts</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-600 mt-1">
            {activeStaff}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Can log in to system & POS
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold">
            <span>Total Salaries & Advances</span>
            <DollarSign className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {formatBdCurrency(totalDisbursed)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Disbursed across all employees
          </div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="bg-white dark:bg-[#0f172a] p-3 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search by name, mobile, role..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-[38px] pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Showing <strong className="text-slate-800 dark:text-white">{staffList.length}</strong> staff members
        </div>
      </div>

      {/* 4. Desktop Table (Rule 5.3 & 5.4: Solid Emerald Header #15803d) */}
      <div className="hidden md:block bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="table-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] text-white font-bold whitespace-nowrap">
                <th className="py-3 px-4 w-12 text-center">SL</th>
                <th className="py-3 px-4">Staff Name & Contact</th>
                <th className="py-3 px-4 text-center">Role / Position</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Payouts Count</th>
                <th className="py-3 px-4 text-right">Total Disbursed (৳)</th>
                <th className="py-3 px-4 text-center w-36">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 font-bold">
                    No staff members found. Click "+ Add New Staff" to register one.
                  </td>
                </tr>
              ) : (
                displayedStaff.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                          {item.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div>{item.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-normal flex items-center gap-2">
                            <span className="flex items-center gap-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {item.mobile}
                            </span>
                            {item.email && (
                              <span className="flex items-center gap-0.5">
                                <Mail className="w-3 h-3 text-slate-400" />
                                {item.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700">
                        {item.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${item.status === "approved"
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                          : "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300"
                          }`}
                      >
                        {item.status === "approved" ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-amber-500" />
                        )}
                        <span>{item.status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                      {item.total_payout_count} vouchers
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 dark:text-rose-400 text-xs">
                      {formatBdCurrency(item.total_salary_paid)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPayout(item)}
                          className="h-7 px-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Disburse Salary / Advance"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Pay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(item)}
                          disabled={item.id === 1 || item.id === 7}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${item.id === 1 || item.id === 7
                            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                            : "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 cursor-pointer"
                            }`}
                          title="Delete Staff"
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
          totalItems={staffList.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[20, 50, 100, 200, 500]}
        />
      </div>

      {/* 5. Mobile Cards View */}
      <div className="block md:hidden space-y-2.5">
        {displayedStaff.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-[#0f172a] p-3.5 rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-xs text-slate-800 dark:text-white">
                  {item.name}
                </h3>
                <p className="text-[11px] text-slate-500">{item.mobile}</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                {item.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-400">Total Disbursed:</span>
              <span className="font-black text-rose-600">
                {formatBdCurrency(item.total_salary_paid)}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleOpenPayout(item)}
                className="h-[30px] w-full px-3 rounded-lg bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Pay Salary</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenEdit(item)}
                className="h-[30px] w-full px-2.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDeleteStaff(item)}
                disabled={item.id === 1 || item.id === 7}
                className={`h-[30px] w-full px-2 rounded-lg text-xs font-bold ${item.id === 1 || item.id === 7
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-rose-50 text-rose-600"
                  }`}
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
            totalItems={staffList.length}
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

      {/* 6. ADD / EDIT STAFF MODAL (Strict Rule 6.1 - 6.4) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            {/* Sticky Header: Solid Emerald #15803d, Circular Red Close #dc2626 */}
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  {selectedStaff ? "Edit Staff Details" : "Register New Staff Member"}
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

            <form onSubmit={handleSubmitStaff} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Md. Kabir Hossain"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Mobile & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="017XXXXXXXX"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="optional@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Designation / Role
                  </label>
                  <CustomSelect
                    options={[
                      { value: "manager", label: "Manager" },
                      { value: "cashier", label: "Cashier" },
                      { value: "salesman", label: "Salesman" },
                      { value: "staff", label: "General Staff" },
                      { value: "technician", label: "Technician" },
                    ]}
                    value={formData.role}
                    onChange={(val) => setFormData({ ...formData, role: String(val) })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Status
                  </label>
                  <CustomSelect
                    options={[
                      { value: "approved", label: "Approved / Active" },
                      { value: "pending", label: "Pending" },
                    ]}
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: String(val) })}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {selectedStaff
                    ? "Reset Password (Leave blank to keep unchanged)"
                    : "Login Password *"}
                </label>
                <input
                  type="password"
                  placeholder={selectedStaff ? "••••••••" : "Minimum 6 characters"}
                  required={!selectedStaff}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                />
              </div>

              {/* Sticky Footer: Cancel Red #dc2626, Save Emerald #15803d */}
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
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Staff Member</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DISBURSE SALARY / ADVANCE MODAL (Strict Rule 6.1 - 6.4) */}
      {isPayoutModalOpen && payoutStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            <div className="modal-header-brand bg-gradient-to-r from-[#0B3D91] via-[#1248a3] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Banknote className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  Salary / Advance Payout: {payoutStaff.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayout} className="p-5 space-y-3.5 flex-1 overflow-y-auto">
              {payoutError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 text-red-600 text-xs rounded-xl font-medium">
                  {payoutError}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                <div className="font-bold text-slate-800 dark:text-slate-100">
                  Staff: {payoutStaff.name} ({payoutStaff.role})
                </div>
                <div className="text-slate-500 mt-0.5">
                  Mobile: {payoutStaff.mobile} &bull; Total Paid So Far:{" "}
                  <strong className="text-rose-600">
                    {formatBdCurrency(payoutStaff.total_salary_paid)}
                  </strong>
                </div>
              </div>

              {/* Expense Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Expense Category / Head <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                  options={expenseTypes.map((t) => ({ value: t.id, label: t.type_name }))}
                  value={payoutData.expense_type_id}
                  onChange={(val) =>
                    setPayoutData({ ...payoutData, expense_type_id: String(val) })
                  }
                  placeholder="Select Category..."
                />
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Disbursement Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={payoutData.expense_amount}
                    onChange={(e) =>
                      setPayoutData({ ...payoutData, expense_amount: e.target.value })
                    }
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-black text-rose-600 text-base focus:outline-none focus:ring-2 focus:ring-[#1E65A0]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Date
                  </label>
                  <CustomDatePicker
                    value={payoutData.date}
                    onChange={(d) =>
                      setPayoutData({ ...payoutData, date: d })
                    }
                  />
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Payment Voucher Note / Month
                </label>
                <textarea
                  rows={2}
                  value={payoutData.expense_details}
                  onChange={(e) =>
                    setPayoutData({ ...payoutData, expense_details: e.target.value })
                  }
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1E65A0] font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  disabled={savingPayout}
                  className="h-[38px] px-4 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPayout}
                  className="h-[38px] px-5 rounded-xl bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] hover:from-[#082d6c] hover:to-[#165082] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {savingPayout && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Payout</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={!!staffToDelete}
        onClose={() => {
          if (!isDeleting) {
            setStaffToDelete(null);
            setDeleteError(null);
          }
        }}
        onConfirm={confirmDeleteStaff}
        title="Remove Staff Member"
        itemName={staffToDelete ? `${staffToDelete.name} (${staffToDelete.role})` : ""}
        description="Are you sure you want to remove this staff profile? Staff with linked orders or expense payout records cannot be removed."
        loading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
