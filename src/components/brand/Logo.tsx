import React from "react";
import Link from "next/link";

interface LogoProps {
  badge?: "merchant-hub" | "none";
}

export const Logo: React.FC<LogoProps> = ({ badge = "none" }) => {
  return (
    <div className="flex items-center gap-3">
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-indigo-200 dark:shadow-none group-hover:bg-indigo-700 transition-colors">
          N
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          NESale
        </span>
      </Link>

      {badge === "merchant-hub" && (
        <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-[#1a202c] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
          Merchant Hub
        </span>
      )}
    </div>
  );
};
