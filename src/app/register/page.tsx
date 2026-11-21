"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { createClient } from "@/utils/supabase/client";
import {
  Check,
  Zap,
  XCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Globe,
  Loader2,
  Mail,
  User,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  ExternalLink,
} from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Email verification screen state
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkNotice, setCheckNotice] = useState<string | null>(null);

  // Cooldown timer for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Dynamic password strength evaluator
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: "Empty", color: "bg-slate-200 dark:bg-slate-700", text: "text-slate-400" };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 1, label: "Weak (25%)", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
      case 2:
        return { score: 2, label: "Fair (50%)", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
      case 3:
        return { score: 3, label: "Good (75%)", color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
      case 4:
      default:
        return { score: 4, label: "Strong (92%)", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    // Password confirmation validation
    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      setLoading(false);
      return;
    }

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/onboarding`
          : undefined;

      // 1. Supabase Auth Sign Up
      const { data, error } = await supabase.auth.signUp({
        email: workEmail.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) {
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
            name: fullName.trim(),
            businessName: fullName.trim() ? `${fullName.trim()}'s Workspace` : "My Workspace",
          }),
        }).catch((err) => console.warn("Sync warning:", err));
      }

      // 3. Check if email confirmation is required by Supabase
      if (data.session) {
        // Immediate session granted (email confirmation disabled in Supabase)
        setSuccessMessage("Account created successfully! Redirecting to onboarding...");
        setTimeout(() => {
          router.push("/onboarding");
        }, 1000);
      } else {
        // Email confirmation is REQUIRED - do NOT log in or redirect directly!
        setIsEmailVerificationPending(true);
        setResendCooldown(60);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setResendSuccess(false);
    setCheckNotice(null);

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/onboarding`
          : undefined;

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: workEmail.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setCheckNotice(`Failed to resend: ${error.message}`);
      } else {
        setResendSuccess(true);
        setResendCooldown(60);
      }
    } catch (err: any) {
      setCheckNotice(err?.message || "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  const handleCheckSession = async () => {
    setChecking(true);
    setCheckNotice(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.push("/onboarding");
      } else {
        setCheckNotice("Verification not detected yet. Please click the link in your email, then click continue.");
      }
    } catch {
      setCheckNotice("Could not verify session. Please try clicking the link in your email.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f]">
      {/* Top Navbar */}
      <header className="w-full py-4.5 px-6 sm:px-12 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] bg-white/80 dark:bg-[#090a0f]/80 backdrop-blur-md sticky top-0 z-40">
        <Logo />
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">Already registered?</span>
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            Log in to Store <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex items-center justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 lg:p-12 border border-slate-100 dark:border-white/[0.08] shadow-card">
          {/* VIEW A: EMAIL VERIFICATION REQUIRED SCREEN */}
          {isEmailVerificationPending ? (
            <div className="text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 shadow-sm">
                <Mail className="w-8 h-8 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Action Required</span> • Email Verification
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Check your inbox to verify your account
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2.5 max-w-lg mx-auto leading-relaxed">
                We sent a confirmation link to <span className="font-semibold text-slate-900 dark:text-white font-mono">{workEmail}</span>.
                You must confirm your email before accessing your merchant store setup.
              </p>

              {/* Step instructions */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/[0.08] text-left max-w-lg mx-auto space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <span>Open your email client and look for an email from <strong>NESale</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <span>Click the <strong>Confirm your email</strong> link in the message.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <span>You will be verified immediately and brought to your store setup wizard.</span>
                </div>
              </div>

              {/* Feedback messages */}
              {resendSuccess && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>A fresh confirmation link has been dispatched to your email!</span>
                </div>
              )}

              {checkNotice && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{checkNotice}</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
                <button
                  type="button"
                  onClick={handleCheckSession}
                  disabled={checking}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  {checking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Checking verification...</span>
                    </>
                  ) : (
                    <>
                      <span>I've Verified My Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resending}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend in {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Resend Verification Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Return to login / edit email */}
              <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400">
                <button
                  onClick={() => setIsEmailVerificationPending(false)}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
                >
                  Change email address
                </button>
                <span>•</span>
                <Link
                  href="/login"
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
                >
                  Back to Log In
                </Link>
              </div>
            </div>
          ) : (
            /* VIEW B: STANDARD REGISTRATION FORM */
            <>
              {/* Header pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100/60 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                GET STARTER FOR FREE
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-4">
                Start turning questions into sales
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base mt-2.5 leading-relaxed">
                Join 2,400+ modern merchants scaling revenue with autonomous shopping conversations.
              </p>

              {/* Benefit Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> No credit card required
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                  <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> 2-minute setup
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                  <XCircle className="w-3.5 h-3.5 text-slate-400" /> Cancel anytime
                </span>
              </div>

              {/* Alerts */}
              {errorMessage && (
                <div className="mt-5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-600" />
                  <div className="flex-1 leading-relaxed">{errorMessage}</div>
                </div>
              )}
              {successMessage && (
                <div className="mt-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                  <div className="flex-1 leading-relaxed">{successMessage}</div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                {/* 2-Column: Full Name & Work Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="fullName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Alex Mercer"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="workEmail" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="workEmail"
                        type="email"
                        required
                        value={workEmail}
                        onChange={(e) => setWorkEmail(e.target.value)}
                        placeholder="you@yourstore.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* 2-Column: Master Password & Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Master Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Master Password
                      </label>
                      <span className={`text-[11px] font-semibold ${strength.text}`}>
                        {strength.label}
                      </span>
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

                    {/* Dynamic 4-bar password strength meter */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            strength.score >= level ? strength.color : "bg-slate-100 dark:bg-white/[0.06]"
                          }`}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Confirm Password
                      </label>
                      {confirmPassword && (
                        password === confirmPassword ? (
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Match
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-rose-500">
                            Mismatch
                          </span>
                        )
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 transition font-mono ${
                          confirmPassword && password !== confirmPassword
                            ? "border-rose-400 dark:border-rose-700 focus:ring-rose-500/20 focus:border-rose-500"
                            : confirmPassword && password === confirmPassword
                            ? "border-emerald-400 dark:border-emerald-700 focus:ring-emerald-500/20 focus:border-emerald-500"
                            : "border-slate-200 dark:border-white/[0.08] focus:ring-indigo-500/20 focus:border-indigo-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Re-enter your master password to verify.
                    </p>
                  </div>
                </div>

                {/* Checkbox */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="terms" className="text-xs text-slate-600 dark:text-slate-400 leading-snug cursor-pointer">
                    I agree to the{" "}
                    <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      Terms of Service
                    </Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      Privacy Policy
                    </Link>
                    . You can link your store domain or website anytime inside your dashboard integrations hub.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !agreed}
                  className="w-full mt-3 py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Account with Supabase...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Free Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Bottom Link inside card */}
                <div className="text-center pt-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Already have an active account? </span>
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-0.5"
                  >
                    Sign in <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <AuthFooter />
    </div>
  );
}
