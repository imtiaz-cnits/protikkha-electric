"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Users as UsersIcon,
  Search,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
  Edit2,
  Trash2,
  Crown,
  Receipt,
  Calculator,
  Sliders,
  Check,
  Camera,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { Pagination, DeleteConfirmModal, CustomSelect } from "@/components/ui";

interface UserItem {
  id: number;
  name: string;
  email: string | null;
  mobile: string;
  role: string;
  status: string;
  created_at: string;
  img_url?: string | null;
  permissions?: {
    pos?: boolean;
    products?: boolean;
    purchases?: boolean;
    customers?: boolean;
    expenses?: boolean;
    reports?: boolean;
    users?: boolean;
  } | null;
}

const DEFAULT_PERMISSIONS = {
  pos: true,
  products: true,
  purchases: false,
  customers: true,
  expenses: false,
  reports: false,
  users: false,
};

const ROLE_PRESETS: Record<string, typeof DEFAULT_PERMISSIONS> = {
  admin: {
    pos: true,
    products: true,
    purchases: true,
    customers: true,
    expenses: true,
    reports: true,
    users: true,
  },
  manager: {
    pos: true,
    products: true,
    purchases: true,
    customers: true,
    expenses: true,
    reports: true,
    users: false,
  },
  cashier: {
    pos: true,
    products: false,
    purchases: false,
    customers: true,
    expenses: false,
    reports: false,
    users: false,
  },
  accountant: {
    pos: false,
    products: false,
    purchases: true,
    customers: true,
    expenses: true,
    reports: true,
    users: false,
  },
  storekeeper: {
    pos: false,
    products: true,
    purchases: true,
    customers: false,
    expenses: false,
    reports: false,
    users: false,
  },
  technician: {
    pos: false,
    products: true,
    purchases: false,
    customers: true,
    expenses: false,
    reports: false,
    users: false,
  },
  staff: {
    pos: false,
    products: false,
    purchases: true,
    customers: true,
    expenses: true,
    reports: false,
    users: false,
  },
  users: {
    pos: false,
    products: false,
    purchases: false,
    customers: false,
    expenses: false,
    reports: false,
    users: false,
  },
};

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  // Delete Confirm Modal State
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    role: "cashier",
    status: "approved",
    img_url: "",
    permissions: { ...ROLE_PRESETS.cashier },
  });

  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success" && Array.isArray(data.data)) {
        setUsers(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      mobile: "",
      password: "",
      role: "cashier",
      status: "approved",
      img_url: "",
      permissions: { ...ROLE_PRESETS.cashier },
    });
    setSelectedUser(null);
    setError("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setError("");
    setFormData({
      name: user.name,
      email: user.email || "",
      mobile: user.mobile,
      password: "",
      role: user.role,
      status: user.status,
      img_url: user.img_url || "",
      permissions: user.permissions
        ? { ...DEFAULT_PERMISSIONS, ...user.permissions }
        : { ...(ROLE_PRESETS[user.role] || DEFAULT_PERMISSIONS) },
    });
    setModalOpen(true);
  };

  const handleRoleChange = (newRole: string) => {
    const preset = ROLE_PRESETS[newRole] || DEFAULT_PERMISSIONS;
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: { ...preset },
    }));
  };

  const togglePermission = (key: keyof typeof DEFAULT_PERMISSIONS) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/users/profile/avatar", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.img_url) {
        setFormData((prev) => ({ ...prev, img_url: data.img_url }));
        toast.success("User avatar photo uploaded!");
      } else {
        toast.error(data?.message || "Failed to upload avatar");
      }
    } catch {
      toast.error("Error uploading avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteUser = (user: UserItem) => {
    const roleLower = user.role.toLowerCase();
    if (user.id === 1 || user.id === 7 || roleLower === "admin" || roleLower === "super_admin") {
      toast.error("Super Admin account cannot be deleted!");
      return;
    }
    setDeleteError(null);
    setUserToDelete(user);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.status === "success") {
        toast.success("User account deleted successfully!");
        setUserToDelete(null);
        setCurrentPage(1);
        loadUsers();
      } else {
        setDeleteError(data?.message || `Failed to delete user account (Status ${res.status})`);
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Communication error deleting user account");
    } finally {
      setIsDeleting(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const url = selectedUser ? `/api/users/${selectedUser.id}` : "/api/users";
      const method = selectedUser ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.status !== "success") {
        setError(data?.message || `Failed to ${selectedUser ? "update" : "create"} user`);
        setSubmitting(false);
        return;
      }

      setModalOpen(false);
      toast.success(selectedUser ? "User updated successfully!" : "User created successfully!");
      resetForm();
      setCurrentPage(1);
      loadUsers();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  // Dynamic KPI Stats calculated from actual DB records
  const totalUsers = users.length;
  const adminCount = users.filter(
    (u) => u.role.toLowerCase() === "admin" || u.role.toLowerCase() === "super_admin"
  ).length;
  const cashierCount = users.filter(
    (u) => u.role.toLowerCase() === "cashier" || u.role.toLowerCase() === "pos_operator"
  ).length;
  const managerCount = users.filter(
    (u) => u.role.toLowerCase() === "manager" || u.role.toLowerCase() === "accountant"
  ).length;

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.mobile.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const startIndex = (currentPage - 1) * pageSize;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
      case "super_admin":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900";
      case "manager":
        return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-900";
      case "cashier":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900";
      case "accountant":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-900";
      default:
        return "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    }
  };

  const renderPermissionBadge = (user: UserItem) => {
    const role = user.role.toLowerCase();
    if (role === "admin" || role === "super_admin") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          <span>All Modules</span>
        </span>
      );
    }

    const perms = user.permissions;
    if (!perms) {
      if (role === "manager") {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>All Modules</span>
          </span>
        );
      }
      if (role === "cashier") {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>POS Only</span>
          </span>
        );
      }
      if (role === "staff" || role === "accountant") {
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-600 text-white shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
            <span>Accounts Only</span>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500 text-white">
          <span>Standard</span>
        </span>
      );
    }

    const activeKeys = Object.entries(perms)
      .filter(([_, v]) => Boolean(v))
      .map(([k]) => k);

    if (activeKeys.length >= 6) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          <span>All Modules</span>
        </span>
      );
    }
    if (activeKeys.length === 1 && activeKeys[0] === "pos") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          <span>POS Only</span>
        </span>
      );
    }
    if (
      !activeKeys.includes("pos") &&
      (activeKeys.includes("purchases") ||
        activeKeys.includes("expenses") ||
        activeKeys.includes("reports"))
    ) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-600 text-white shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
          <span>Accounts Only</span>
        </span>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {activeKeys.map((k) => (
          <span
            key={k}
            className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
          >
            {k}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Page Header matching MARSS CORPORATION Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-slate-800 shadow-xs shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-none m-0 p-0">
              User Role & Permission Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 mb-0">
              Configure module-based ON/OFF toggle permissions for system users
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleOpenAdd}
          className="h-[38px] px-4 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* 2. Metrics Summary Cards matching MARSS CORPORATION Screenshot 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Users */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 shadow-xs hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              TOTAL SYSTEM USERS
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 m-0">
            {totalUsers}
          </h2>
        </div>

        {/* Admin / Super Admin */}
        <div className="p-4 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/40 shadow-xs hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800 dark:text-sky-400">
              ADMIN / SUPER ADMIN
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-300 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-sky-700 dark:text-sky-300 m-0">
            {adminCount}
          </h2>
        </div>

        {/* Cashier / POS Operator */}
        <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 shadow-xs hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
              CASHIER / POS OPERATOR
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-300 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 m-0">
            {cashierCount}
          </h2>
        </div>

        {/* Accountant / Manager */}
        <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 shadow-xs hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-400">
              ACCOUNTANT / MANAGER
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-purple-700 dark:text-purple-300 m-0">
            {managerCount}
          </h2>
        </div>
      </div>

      {/* 3. User Table Box Container matching MARSS Screenshot 1 */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] shadow-xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white m-0">
              System Users & Permissions List
            </h3>
          </div>

          <div className="w-full sm:w-80 h-[38px] flex items-center px-3 bg-slate-50 dark:bg-[#1e293b] rounded-xl border border-[#cbd5e1] dark:border-[#334155] focus-within:ring-2 focus-within:ring-emerald-600/30 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search user..."
              className="w-full bg-transparent border-none outline-none text-xs text-slate-800 dark:text-white placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 font-bold whitespace-nowrap uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 text-center w-12">SL</th>
                <th className="py-3 px-4">User Info</th>
                <th className="py-3 px-3">Mobile Number</th>
                <th className="py-3 px-3 text-center">Role</th>
                <th className="py-3 px-3">Active Module Permissions</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Loading user list...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No system users found.
                  </td>
                </tr>
              ) : (
                displayedUsers.map((user, idx) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-bold text-slate-400">
                      {startIndex + idx + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {user.img_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.img_url}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200 dark:border-slate-700">
                            <User className="w-4 h-4 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {user.email || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold font-mono text-slate-800 dark:text-slate-200">
                      {user.mobile}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role.toLowerCase() === "admin" ||
                        user.role.toLowerCase() === "super_admin" ? (
                          <>
                            <Crown className="w-3.5 h-3.5 text-rose-600" />
                            <span>Super Admin</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span className="capitalize">{user.role}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {renderPermissionBadge(user)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${
                          user.status === "approved"
                            ? "text-emerald-700 bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                            : "text-amber-700 bg-amber-50 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                        }`}
                      >
                        {user.status === "approved" ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(user)}
                          className="w-7 h-7 rounded-lg border-[1.5px] border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit User & Permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {user.id === 1 ||
                        user.id === 7 ||
                        user.role.toLowerCase() === "admin" ||
                        user.role.toLowerCase() === "super_admin" ? (
                          <button
                            type="button"
                            disabled
                            className="w-7 h-7 rounded-lg border-[1.5px] border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-300 dark:text-slate-600 flex items-center justify-center cursor-not-allowed"
                            title="Super Admin cannot be deleted"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="w-7 h-7 rounded-lg border-[1.5px] border-rose-200 dark:border-rose-900/60 bg-rose-50/60 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {displayedUsers.map((user) => (
            <div key={user.id} className="p-3.5 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {user.img_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.img_url}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 flex items-center justify-center font-bold text-xs">
                      <User className="w-4 h-4 text-slate-500" />
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs text-slate-900 dark:text-white">
                      {user.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{user.mobile}</div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadge(
                    user.role
                  )}`}
                >
                  {user.role}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] text-slate-400">Permissions:</span>
                <div>{renderPermissionBadge(user)}</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(user)}
                  className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold"
                >
                  Edit
                </button>
                {!(
                  user.id === 1 ||
                  user.id === 7 ||
                  user.role.toLowerCase() === "admin" ||
                  user.role.toLowerCase() === "super_admin"
                ) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    className="px-3 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredUsers.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[20, 50, 100, 200]}
          />
        </div>
      </div>

      {/* 4. Role Permission Matrix Info Box */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-[#cbd5e1] dark:border-[#334155] p-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <span>Module Permission Guidelines (Live Module Access)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-rose-700 dark:text-rose-400 block mb-1">
              👑 Admin / Super Admin
            </span>
            <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
              Full access: POS, Inventory, Purchases, Customers, Expenses, Reports & Users.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-sky-700 dark:text-sky-400 block mb-1">
              💼 Store Manager
            </span>
            <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
              Operational control: POS, Products, Purchases, Customers & Reports ON.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-1">
              🧾 Cashier / POS
            </span>
            <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
              Counter billing: POS Billing & Sales Returns ON. Backoffice disabled.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-purple-700 dark:text-purple-400 block mb-1">
              📊 Accountant / Staff
            </span>
            <p className="text-[11px] text-slate-500 m-0 leading-relaxed">
              Financial auditing: Customer/Supplier Due, Daily Ledger & Reports ON.
            </p>
          </div>
        </div>
      </div>

      {/* 5. CREATE / EDIT USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-[16px] shadow-2xl overflow-hidden border border-[#cbd5e1] dark:border-[#334155] max-h-[90vh] flex flex-col">
            {/* Sticky Header */}
            <div className="bg-gradient-to-r from-[#0B3D91] to-[#1E65A0] px-5 py-3.5 flex items-center justify-between text-white shrink-0">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold tracking-wide uppercase m-0 text-white">
                  {selectedUser ? "Edit User Role & Permissions" : "Create New User & Permissions"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-[28px] h-[28px] rounded-full bg-[#dc2626] hover:bg-red-700 text-white flex items-center justify-center cursor-pointer transition-colors shadow-xs"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Personal Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter user full name"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="user@protikkhaelectric.com"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Password{" "}
                    {selectedUser ? (
                      "(Leave blank to keep unchanged)"
                    ) : (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="password"
                    required={!selectedUser}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    System Role <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={formData.role}
                    onChange={(val) => handleRoleChange(val)}
                    options={[
                      { value: "admin", label: "👑 Admin / Super Admin" },
                      { value: "manager", label: "💼 Store Manager" },
                      { value: "cashier", label: "🧾 Cashier / POS Operator" },
                      { value: "storekeeper", label: "📦 Storekeeper / Inventory" },
                      { value: "technician", label: "⚡ Electrician / Tech Lead" },
                      { value: "accountant", label: "📊 Accountant" },
                      { value: "staff", label: "👤 Staff" },
                      { value: "users", label: "👤 General User" },
                    ]}
                    placeholder="Select Role"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Account Status <span className="text-red-500">*</span>
                  </label>
                  <CustomSelect
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                    options={[
                      { value: "approved", label: "Approved / Active" },
                      { value: "pending", label: "Pending Approval" },
                    ]}
                    placeholder="Select Status"
                    className="w-full h-[42px] px-3 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-3">
                    {formData.img_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={formData.img_url}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover border border-slate-300"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                    <label className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingAvatar ? "Uploading..." : "Upload Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>
                    {formData.img_url && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, img_url: "" })}
                        className="text-xs text-rose-600 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Module Permission Switches */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Module Access Permissions
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Toggle individual modules for this user
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: "pos", label: "POS Billing & Sales", desc: "Sell tiles, cash receipts, sales returns" },
                    { key: "products", label: "Product & Inventory", desc: "View & edit tiles, brands, categories" },
                    { key: "purchases", label: "Purchase & Suppliers", desc: "Purchase inwards, supplier payables" },
                    { key: "customers", label: "Customers & Due Register", desc: "Customer list, due collection" },
                    { key: "expenses", label: "Expenses & Staff Payroll", desc: "Daily shop expenses, staff accounts" },
                    { key: "reports", label: "Reports & Analytics", desc: "Sales, income statement, ledger" },
                    { key: "users", label: "User & Role Management", desc: "Manage accounts and permissions" },
                  ].map((mod) => {
                    const isChecked = Boolean((formData.permissions as any)[mod.key]);
                    return (
                      <div
                        key={mod.key}
                        onClick={() => togglePermission(mod.key as any)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/60"
                            : "bg-slate-50 dark:bg-[#1e293b] border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {mod.label}
                          </div>
                          <div className="text-[10px] text-slate-500">{mod.desc}</div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                            isChecked
                              ? "bg-emerald-600 text-white"
                              : "border border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-[40px] px-5 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-[40px] px-6 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{selectedUser ? "Update User" : "Create User"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE USER CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Delete User Account"
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.mobile})` : ""}
        description="Are you sure you want to delete this user account? All assigned permissions and authentication access will be permanently revoked."
        loading={isDeleting}
        error={deleteError}
        onConfirm={confirmDeleteUser}
        onClose={() => {
          setUserToDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
