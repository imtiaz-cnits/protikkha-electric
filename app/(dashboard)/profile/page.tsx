"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Camera,
  Mail,
  Phone,
  Store,
  IdCard,
  Lock,
  Key,
  User,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Loader2,
  ShieldAlert,
  Info,
  ArrowLeft,
  Shield,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";

interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  mobile: string;
  role: string;
  status: string;
  img_url?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Password Visibility Toggles
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const res = await fetch("/api/users/profile");
      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success" && data.data) {
        setProfile(data.data);
        setFullName(data.data.name || "");
        setMobileNumber(data.data.mobile || "");
        if (data.data.img_url) {
          setAvatarPreview(data.data.img_url);
        }
      } else {
        setErrorMsg(data?.message || "Failed to load user profile");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error loading profile");
    } finally {
      setLoading(false);
    }
  }

  // Handle immediate image upload to server on selection
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    // Immediate local preview
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    // Upload to server
    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/users/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success" && data.img_url) {
        toast.success("Profile photo uploaded successfully!");
        setAvatarPreview(data.img_url);
        if (profile) {
          setProfile({ ...profile, img_url: data.img_url });
        }
      } else {
        toast.error(data?.message || "Failed to upload profile photo");
      }
    } catch {
      toast.error("Communication error uploading profile image");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFullName(profile.name || "");
      setMobileNumber(profile.mobile || "");
      setAvatarPreview(profile.img_url || null);
    }
    setNewPassword("");
    setConfirmPassword("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !mobileNumber.trim()) {
      setErrorMsg("Full Name and Phone Number are required");
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setErrorMsg("New password must be at least 4 characters long");
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg("New password and confirmation password do not match");
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          mobile: mobileNumber.trim(),
          img_url: avatarPreview,
          new_password: newPassword,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.status === "success") {
        toast.success("Profile changes saved successfully!");
        setProfile(data.data);
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMsg(data?.message || "Failed to update profile");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Communication error updating profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-slate-500 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600 mb-2" />
        <p className="text-sm font-semibold">Loading profile information...</p>
      </div>
    );
  }

  const roleLabel =
    profile?.role === "admin" || profile?.role === "super_admin"
      ? "Store Administrator"
      : profile?.role === "manager"
      ? "Store Manager"
      : profile?.role === "cashier"
      ? "Cashier / POS Operator"
      : profile?.role === "accountant"
      ? "Accountant"
      : "Store User";

  return (
    <div className="space-y-4 max-w-6xl mx-auto font-sans pb-8">
      {/* 1. Header Toolbar matching MARSS CORPORATION Screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="h-[36px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="h-[36px] px-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>RUNA TRADERS</span>
          </div>
        </div>

        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white m-0 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>Account Profile & Settings</span>
          </h1>
          <p className="text-[11px] text-slate-500 m-0 text-right sm:text-left">
            RUNA TRADERS - {roleLabel} & Security Settings
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2. Main Content Grid (Left Profile Card + Right Form Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Profile Summary Card (lg:col-span-4) */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-[#0f172a] rounded-[20px] p-6 text-center border border-[#cbd5e1] dark:border-[#334155] shadow-xs relative overflow-hidden border-t-4 border-t-emerald-600">
            {/* Avatar Container with Camera Trigger */}
            <div className="relative inline-block mx-auto mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden shadow-md border-4 border-white dark:border-slate-800 bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto relative">
                {uploadingAvatar ? (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                ) : null}

                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarPreview}
                    alt={profile?.name || "Avatar"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white">
                    <span className="text-4xl font-black uppercase">
                      {profile?.name?.charAt(0) || "A"}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Trigger */}
              <label
                htmlFor="avatarUploadInput"
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md cursor-pointer hover:scale-105 transition-transform"
                title="Upload Profile Photo"
              >
                <Camera className="w-4 h-4" />
              </label>
              <input
                id="avatarUploadInput"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={uploadingAvatar}
                className="hidden"
              />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white m-0">
              {profile?.name || "User"}
            </h3>

            <div className="mt-1.5 mb-4">
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>{roleLabel}</span>
              </span>
            </div>

            {/* Profile Info Details List */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5 text-left">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    EMAIL ADDRESS
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                    {profile?.email || "No email assigned"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900/40">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    MOBILE NUMBER
                  </span>
                  <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {profile?.mobile || "N/A"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    STORE LOCATION
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    RUNA TRADERS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Column (lg:col-span-8) */}
        <div className="lg:col-span-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Personal Information Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[20px] p-5 sm:p-6 border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <IdCard className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  Personal Information
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full h-[42px] pl-10 pr-3.5 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full h-[42px] pl-10 pr-3.5 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      disabled
                      value={profile?.email || ""}
                      className="w-full h-[42px] pl-10 pr-3.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 font-medium cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Email address is used for login identification and cannot be changed.</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Security & Password Card */}
            <div className="bg-white dark:bg-[#0f172a] rounded-[20px] p-5 sm:p-6 border border-[#cbd5e1] dark:border-[#334155] shadow-xs">
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white m-0">
                  Security & Password
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full h-[42px] pl-10 pr-10 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full h-[42px] pl-10 pr-10 text-xs bg-slate-50 dark:bg-[#1e293b] border border-[#cbd5e1] dark:border-[#334155] rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Action Buttons matching MARSS Screenshot */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="h-[42px] px-6 rounded-xl bg-[#dc2626] hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-[42px] px-6 rounded-xl bg-[#15803d] hover:bg-[#166534] text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
