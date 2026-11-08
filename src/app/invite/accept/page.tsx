"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleAccept = async () => {
    if (!token) {
      setStatus("error");
      setMessage("Missing invitation token.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/v1/auth/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus("success");
        setMessage(
          data.message || "Invitation accepted. You have been added to the team."
        );
      } else if (res.status === 401) {
        setStatus("error");
        setMessage(
          "Please sign in or create an account with the invited email address, then open this link again."
        );
      } else {
        setStatus("error");
        setMessage(data?.error?.message || "Could not accept this invitation.");
      }
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "Could not accept this invitation.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0c0e15] p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-xl p-6 sm:p-8 space-y-5">
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Accept Invitation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You have been invited to join a NESale workspace team.
          </p>
        </div>

        {!token && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-xs font-semibold text-rose-700 dark:text-rose-300">
            This link is missing an invitation token. Ask the workspace owner to
            resend the invitation.
          </div>
        )}

        {message && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold ${
              status === "success"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300"
            }`}
          >
            {message}
          </div>
        )}

        {status === "success" ? (
          <Link
            href="/dashboard/team"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition min-h-[44px]"
          >
            Go to Team dashboard
          </Link>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAccept}
              disabled={!token || status === "loading"}
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold transition min-h-[44px] cursor-pointer"
            >
              {status === "loading" ? "Accepting..." : "Accept Invitation"}
            </button>
            <Link
              href={`/login?next=${encodeURIComponent(
                `/invite/accept?token=${token}`
              )}`}
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-white/[0.04] transition min-h-[44px]"
            >
              Sign in with the invited email
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvitationContent />
    </Suspense>
  );
}
