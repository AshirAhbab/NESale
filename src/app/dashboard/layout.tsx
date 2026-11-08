"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardSidebar } from "@/components/dashboard/Sidebar";
import { DashboardHeader } from "@/components/dashboard/Header";

const SIDEBAR_COLLAPSED_KEY = "nesale_sidebar_collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean | null>(null);
  const [isCollapsedReady, setIsCollapsedReady] = useState(false);

  // Initialize sidebar collapsed state from localStorage (client-only to avoid hydration mismatch)
  useEffect(() => {
    let initial = false;
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      initial = stored === null ? false : stored === "true";
    } catch {
      initial = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCollapsed(initial);
    setIsCollapsedReady(true);
  }, []);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = prev === null ? false : !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage unavailable; ignore
      }
      return next;
    });
  }, []);

  // While hydration is in progress, default to uncollapsed to avoid layout shift
  const resolvedCollapsed = isCollapsedReady ? (isCollapsed ?? false) : false;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 flex transition-colors duration-150">
      {/* Sidebar with Desktop Collapse & Mobile Drawer */}
      <DashboardSidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        isCollapsed={resolvedCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <DashboardHeader
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
