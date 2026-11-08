"use client";

import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

// Global Event Dispatcher
export const toast = {
  success: (message: string, duration = 3500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nesale-toast", {
          detail: { message, type: "success", duration },
        })
      );
    }
  },
  error: (message: string, duration = 4000) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nesale-toast", {
          detail: { message, type: "error", duration },
        })
      );
    }
  },
  info: (message: string, duration = 3500) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("nesale-toast", {
          detail: { message, type: "info", duration },
        })
      );
    }
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleToastEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        message: string;
        type: ToastType;
        duration?: number;
      }>;
      const { message, type, duration = 3500 } = customEvent.detail;
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      setToasts((prev) => [...prev, { id, message, type, duration }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    };

    window.addEventListener("nesale-toast", handleToastEvent);
    return () => window.removeEventListener("nesale-toast", handleToastEvent);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md animate-slide-up transition-all ${
              t.type === "success"
                ? "bg-white/95 dark:bg-[#11141d]/95 border-emerald-500/30 text-slate-900 dark:text-white"
                : t.type === "error"
                ? "bg-white/95 dark:bg-[#11141d]/95 border-rose-500/30 text-slate-900 dark:text-white"
                : "bg-white/95 dark:bg-[#11141d]/95 border-indigo-500/30 text-slate-900 dark:text-white"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {t.type === "success" && (
                <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
              {t.type === "error" && (
                <div className="w-7 h-7 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
              )}
              {t.type === "info" && (
                <div className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4" />
                </div>
              )}
              <span className="text-xs font-semibold leading-relaxed truncate">
                {t.message}
              </span>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
