"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  HelpCircle,
  Menu,
  Sun,
  Moon,
  LogOut,
  Settings,
  Bot,
  ShoppingBag,
  Users,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { useTheme } from "@/lib/theme/context";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/components/ui/Toast";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const DashboardHeader: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const router = useRouter();
  const { theme, resolvedTheme, toggleTheme } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const [userData, setUserData] = useState({
    name: "Merchant",
    email: "merchant@store.com",
    initials: "ME",
    businessName: "Storefront",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch live logged in user info from Database & Supabase
  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 1. Fetch live database merchant & business details
        const res = await fetch("/api/v1/dashboard/overview?range=today", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.name && data.user.name !== "Merchant") {
            const uName = data.user.name;
            const uEmail = data.user.email || "";
            const bName = data.business?.name || "TechNexaHub";
            const parts = uName.trim().split(" ");
            let initials = data.user.initials || "ME";
            if (!initials || initials === "ME") {
              if (parts.length >= 2 && parts[0] && parts[1]) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
              } else if (parts[0]) {
                initials = parts[0].substring(0, 2).toUpperCase();
              }
            }

            setUserData({
              name: uName,
              email: uEmail,
              initials,
              businessName: bName,
            });
            return;
          }
        }

        // 2. Fallback to Supabase client session
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const user = session.user;
          const meta = user.user_metadata || {};
          const name = meta.full_name || user.email?.split("@")[0] || "Merchant";
          const email = user.email || "";

          // Extract initials
          const parts = name.trim().split(" ");
          let initials = "ME";
          if (parts.length >= 2 && parts[0] && parts[1]) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
          } else if (parts[0]) {
            initials = parts[0].substring(0, 2).toUpperCase();
          }

          setUserData({
            name,
            email,
            initials,
            businessName: meta.business_name || (meta.website_url ? meta.website_url.replace(/^https?:\/\//, "").split("/")[0] : "NESale Store"),
          });
        }
      } catch (err) {
        console.warn("Could not retrieve user session in header:", err);
      }
    };

    fetchUser();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSignOut = async () => {
    try {
      // 1. Call server-side logout route to clear HTTP-only nesale_session cookie
      await fetch("/api/v1/auth/logout", {
        method: "POST",
      }).catch((err) => console.warn("Logout route warning:", err));

      // 2. Clear client-side Supabase session
      const supabase = createClient();
      await supabase.auth.signOut();

      toast.success("Signed out successfully.");
      setProfileOpen(false);
      router.push("/login?notice=logged_out");
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to log out. Please try again.");
    }
  };

  return (
    <header className="h-16 px-4 sm:px-8 border-b border-slate-100 dark:border-white/[0.08] bg-white/80 dark:bg-[#11141d]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between transition-colors duration-150">
      {/* Left Breadcrumb & Mobile toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
          <span>Dashboard</span>
          <span className="text-slate-300 dark:text-slate-700">&gt;</span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">Overview</span>
        </div>
      </div>

      {/* Right Search & Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Global Search Bar */}
        <div className="relative hidden sm:flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search signals..."
            className="w-48 lg:w-60 pl-9 pr-10 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/[0.08] text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
          />
          <span className="absolute right-2.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-400 dark:text-slate-500 bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs">
            ⌘K
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition active:scale-95 cursor-pointer"
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode (Current: ${theme})`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"></span>
        </button>

        {/* Help Link */}
        <Link
          href="/dashboard/help"
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
          aria-label="Help & Documentation"
          title="Help & Documentation"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>

        {/* User Profile Avatar with Dropdown */}
        <div className="relative pl-1" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-indigo-500/20 transition cursor-pointer active:scale-95"
            aria-label="User profile menu"
            aria-expanded={profileOpen}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-xs font-bold shadow-xs">
                {userData.initials}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-2xl p-2 z-50 animate-scale-in">
              {/* User Bio Header */}
              <div className="p-3 border-b border-slate-100 dark:border-white/[0.06] mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                    {userData.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {userData.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {userData.email}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold tracking-wide">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Merchant
                  </span>
                  <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                    Store Owner
                  </span>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="space-y-0.5">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Store Settings</span>
                </Link>

                <Link
                  href="/dashboard/ai-assistant"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <Bot className="w-4 h-4 text-slate-400" />
                  <span>AI Sales Persona</span>
                </Link>

                <Link
                  href="/dashboard/products"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <span>Products & Offerings</span>
                </Link>

                <Link
                  href="/dashboard/team"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.05] hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                >
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Team Members</span>
                </Link>
              </div>

              {/* Divider & Sign Out */}
              <div className="mt-1 pt-1 border-t border-slate-100 dark:border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Store</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
