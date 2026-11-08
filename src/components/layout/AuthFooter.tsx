import React from "react";
import Link from "next/link";

export const AuthFooter: React.FC = () => {
  return (
    <footer className="w-full py-8 px-4 sm:px-8 border-t border-slate-100 dark:border-white/[0.08] bg-white/70 dark:bg-[#11141d]/70 backdrop-blur-sm mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div>
          © 2026 NESale Inc. Autonomous Commerce Intelligence for Shopify.
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:gap-x-6">
          <Link href="/about" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            About Us
          </Link>
          <Link href="/contact" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Contact & Sales
          </Link>
          <Link href="/support" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Support Center
          </Link>
          <Link href="/security" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Security & Trust
          </Link>
          <Link href="/privacy" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="py-2.5 inline-flex items-center min-h-[44px] hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
            Terms of Service
          </Link>
          <div className="py-2.5 inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium min-h-[44px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            All Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
};
