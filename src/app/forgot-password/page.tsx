"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { createClient } from "@/utils/supabase/client";
import {
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  KeyRound,
} from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const redirectUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?next=/dashboard/settings`
          : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        setErrorMessage(error.message);
      } else {
        setSubmitted(true);
      }
    } catch {
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <span>Support Center</span>
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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-white/[0.08] shadow-card">
          {submitted ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Reset Link Dispatched
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
                We sent a secure password reset link to{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{email}</span>. Click the link in your email to choose a new password.
              </p>
              <div className="pt-4 flex flex-col gap-2">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] min-h-[44px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Login</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition min-h-[44px] flex items-center justify-center"
                >
                  Didn&apos;t get it? Try another email
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Reset your password
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-2">
                  Enter your registered merchant work email and we&apos;ll send you instructions to recover your account.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Merchant Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="reset-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@yourstore.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition min-h-[44px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending reset email...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Recovery Instructions</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-2">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 min-h-[44px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to login</span>
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
