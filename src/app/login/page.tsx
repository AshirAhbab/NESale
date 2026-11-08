"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { createClient } from "@/utils/supabase/client";
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  HelpCircle,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Send,
  RefreshCw,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Unconfirmed email resend state
  const [isUnconfirmedEmail, setIsUnconfirmedEmail] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const notice = searchParams.get("notice");
    if (notice === "verify_required") {
      setErrorMessage("Please check your email and click the confirmation link before accessing your store.");
    } else if (notice === "auth_required") {
      setErrorMessage("Please sign in to your merchant account to continue.");
    } else if (notice === "logged_out") {
      setSuccessMessage("You have been signed out successfully.");
    } else if (notice === "verified") {
      setSuccessMessage("Your email address has been successfully verified! Please log in to proceed.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsUnconfirmedEmail(false);
    setLoading(true);

    try {
      // 1. Supabase Auth Sign In
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          setIsUnconfirmedEmail(true);
          setErrorMessage(
            "Your email address has not been confirmed yet. Please click the verification link sent to your inbox."
          );
          setLoading(false);
          return;
        }

        // Helpful fallback for initial test accounts
        if (email.includes("nordikgear.com") || error.message.includes("Invalid login credentials")) {
          setErrorMessage(
            "Invalid email or password. If you just registered, please verify your email before logging in."
          );
          setLoading(false);
          return;
        }

        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      // 2. Sync user profile into PostgreSQL / Prisma
      if (data.user) {
        await fetch("/api/v1/auth/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name,
          }),
        }).catch((err) => console.warn("Sync warning:", err));
      }

      // 3. Redirect to destination or dashboard
      const nextParam = searchParams.get("next");
      const targetUrl = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
      router.push(targetUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err?.message || "Authentication failed. Please check your credentials.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || resending || !email.trim()) return;
    setResending(true);
    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/onboarding`
          : undefined;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage("A fresh verification link has been sent to your email!");
        setResendCooldown(60);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-xl bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-100 dark:border-white/[0.08] shadow-card">
      {/* Header pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        MERCHANT ACCESS
      </div>

      <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-4">
        Welcome back to NESale
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2.5 leading-relaxed">
        Log in to manage your AI sales assistant, real-time conversations, and revenue analytics.
      </p>

      {/* Success Message */}
      {successMessage && (
        <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
          <div className="flex-1 leading-relaxed">{successMessage}</div>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex flex-col gap-2 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
          {isUnconfirmedEmail && (
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendCooldown > 0 || resending}
              className="self-start mt-1 px-3 py-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 font-semibold text-xs flex items-center gap-1.5 hover:bg-rose-200 transition disabled:opacity-50 cursor-pointer"
            >
              {resending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Resending link...</span>
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend in {resendCooldown}s</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Work Email Address */}
        <div>
          <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Work Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourstore.com"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">Remember my session for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Log in to Merchant Hub</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Bottom Link inside card */}
        <div className="text-center pt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">New merchant? </span>
          <Link
            href="/register"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-0.5"
          >
            Create an account <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f]">
      {/* Top Navbar */}
      <header className="w-full py-4.5 px-6 sm:px-12 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] bg-white/80 dark:bg-[#090a0f]/80 backdrop-blur-md sticky top-0 z-40">
        <Logo badge="merchant-hub" />
        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          <Link
            href="/support"
            className="hidden sm:inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Support</span>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <span>Contact</span>
          </Link>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="p-8 text-center text-sm text-slate-400">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}
