"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  CheckCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@gmail.com");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || data.status !== "success") {
        setError(data.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Store token in localStorage for client-side API requests that use Bearer header
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("role", data.role);
      }

      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoading(false);
    }
  }

  function fillDemo() {
    setEmail("admin@gmail.com");
    setPassword("admin123");
    setError("");
  }

  return (
    <div className="min-h-screen flex w-full bg-slate-50 dark:bg-[#0b0f19]">
      {/* Left Hero Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[#7f1d1d] via-[#991b1b] to-[#881337] text-white p-12 flex-col justify-between">
        {/* Glow Blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
            <ShoppingBag className="w-6 h-6 text-rose-200" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-white leading-none">
              RUNA TRADERS
            </h2>
            <p className="text-xs text-rose-200/85 mt-1 font-medium">Retail Shop Management & POS</p>
          </div>
        </div>

        {/* Middle Feature Content */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-rose-100 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-rose-200" />
            Next-Generation Retail Automation
          </div>

          <h1 className="text-4xl xl:text-5xl font-black tracking-tight leading-tight text-white mb-6">
            Smart Retail & Point of Sale Operations.
          </h1>

          <p className="text-rose-100/90 text-sm xl:text-base leading-relaxed max-w-lg mb-8 font-normal">
            Streamlined high-speed checkout, barcode scanning, live inventory alerts, tiles box & unit calculations, and comprehensive financial reports.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-rose-50">
              <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400/40 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-rose-200" />
              </div>
              <span>100vh Ultra-fast POS with Instant Thermal Receipt</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-rose-50">
              <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400/40 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-rose-200" />
              </div>
              <span>Optimized for Tiles, Sanitary & Sanitary Fittings</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-rose-50">
              <div className="w-6 h-6 rounded-full bg-rose-500/30 border border-rose-400/40 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-rose-200" />
              </div>
              <span>Automated Daily Ledgers & Customer Due Collections</span>
            </div>
          </div>
        </div>

        {/* Bottom Security Badge */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-rose-200/80">
          <ShieldCheck className="w-4 h-4 text-rose-300" />
          <span>Protected with Role-Based Access Control (RBAC) & Next.js 15 Engine</span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] text-white flex items-center justify-center shadow-md">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
                RUNA TRADERS
              </h2>
              <p className="text-xs text-slate-500">Retail Shop Management</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Enter your credentials to access the POS & Admin Dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-rose-600" />
              Login successful! Redirecting to dashboard...
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Email / Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@gmail.com"
                  className="w-full h-[42px] pl-10 pr-3.5 rounded-xl bg-white dark:bg-slate-800/90 text-sm text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-[42px] pl-10 pr-10 rounded-xl bg-white dark:bg-slate-800/90 text-sm text-slate-800 dark:text-white border-[1.5px] border-[#cbd5e1] dark:border-[#334155] focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-600/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[42px] rounded-xl bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-70 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                  Quick Demo Access
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  admin@gmail.com / admin123
                </p>
              </div>
              <button
                type="button"
                onClick={fillDemo}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#991b1b] to-[#dc2626] hover:from-[#7f1d1d] hover:to-[#b91c1c] text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Auto Fill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
