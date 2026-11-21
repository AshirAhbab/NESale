"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { normalizeBusinessType } from "@/lib/business/types";
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Package,
  BarChart3,
  TrendingUp,
  Sliders,
  Store,
  CreditCard,
  Tag,
  Settings,
  HelpCircle,
  Users,
  ChevronsUpDown,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  BookOpen,
  CalendarDays,
  Clock,
  Globe,
} from "lucide-react";

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CORE_MAIN_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Assistant", href: "/dashboard/ai-assistant", icon: Bot },
  { label: "Conversations", href: "/dashboard/conversations", icon: MessageSquare },
];

const CORE_TAIL_ITEMS = [
  { label: "Knowledge Base", href: "/dashboard/knowledge", icon: BookOpen },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Demand Insights", href: "/dashboard/insights", icon: TrendingUp },
  { label: "Widget", href: "/dashboard/widget", icon: Sliders },
];

export const DashboardSidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const pathname = usePathname();
  const [storeName, setStoreName] = useState("Store Workspace");
  const [storeDomain, setStoreDomain] = useState("store.myshopify.com");
  const [businessType, setBusinessType] = useState<string>("ecommerce");

  useEffect(() => {
    fetch("/api/v1/dashboard/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.business?.name) setStoreName(data.business.name);
        if (data.business?.businessType) setBusinessType(data.business.businessType);
        if (data.business?.websiteUrl) {
          try {
            const h = new URL(
              data.business.websiteUrl.startsWith("http")
                ? data.business.websiteUrl
                : `https://${data.business.websiteUrl}`
            ).hostname;
            setStoreDomain(h);
          } catch {
            setStoreDomain(data.business.websiteUrl);
          }
        }
      })
      .catch(() => {});
  }, []);

  interface NavItem {
    label: string;
    href: string;
    icon: any;
    badge?: string;
  }

  interface NavSection {
    title: string;
    items: NavItem[];
  }

  const isServices = normalizeBusinessType(businessType) === "services";

  const catalogItems: NavItem[] = isServices
    ? [
        { label: "Appointments", href: "/dashboard/appointments", icon: CalendarDays },
        { label: "Services", href: "/dashboard/products", icon: Package },
        { label: "Schedule", href: "/dashboard/schedule", icon: Clock },
      ]
    : [{ label: "Products", href: "/dashboard/products", icon: Package }];

  const operationItems: NavItem[] = isServices
    ? [
        { label: "Websites", href: "/dashboard/integrations", icon: Globe },
        { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
        { label: "Affiliate", href: "/dashboard/affiliate", icon: Tag },
      ]
    : [
        { label: "Websites", href: "/dashboard/integrations", icon: Globe },
        { label: "Store", href: "/dashboard/store", icon: Store },
        { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
        { label: "Affiliate", href: "/dashboard/affiliate", icon: Tag },
      ];

  const navSections: NavSection[] = [
    {
      title: "MAIN",
      items: [...CORE_MAIN_ITEMS, ...catalogItems, ...CORE_TAIL_ITEMS],
    },
    {
      title: "OPERATIONS",
      items: operationItems,
    },
    {
      title: "SYSTEM",
      items: [
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
        { label: "Team", href: "/dashboard/team", icon: Users },
        { label: "Help", href: "/dashboard/help", icon: HelpCircle },
      ],
    },
  ];

  const renderContent = (collapsed: boolean) => (
    <div className="flex flex-col h-full bg-white dark:bg-[#11141d] border-r border-slate-100 dark:border-white/[0.08] select-none transition-all duration-300">
      {/* Brand Header & Collapse Toggle */}
      <div
        className={`h-16 flex items-center border-b border-slate-100 dark:border-white/[0.08] ${
          collapsed ? "px-3 justify-center" : "px-4 sm:px-5 justify-between"
        }`}
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-indigo-200 dark:shadow-none shrink-0">
            N
          </div>
          {!collapsed && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight truncate">
                NESale
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold uppercase border border-indigo-100 dark:border-indigo-500/30 shrink-0">
                AI
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Collapse / Expand Toggle Button */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.06] transition cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Mobile Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.06]"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <div
        className={`flex-1 overflow-y-auto space-y-6 ${
          collapsed ? "px-2 py-4" : "px-3.5 py-4"
        }`}
      >
        {navSections.map((section, idx) => (
          <div key={idx}>
            {!collapsed ? (
              <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                {section.title}
              </div>
            ) : (
              <div className="my-2 border-t border-slate-100 dark:border-white/[0.08]" />
            )}

            <div className="space-y-1">
              {section.items.map((item, itemIdx) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <div key={itemIdx} className="relative group">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center rounded-xl text-xs font-semibold transition active:scale-[0.99] ${
                        collapsed
                          ? "justify-center p-2.5"
                          : "justify-between px-3 py-2"
                      } ${
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 shadow-xs"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                          }`}
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </div>

                      {!collapsed && item.badge && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-500/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    {/* Collapsed Tooltip on Hover */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center z-50 pointer-events-none">
                        <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1.5 border border-slate-700">
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-[10px]">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tenant / Store Workspace Selector in Sidebar Footer */}
      <div className={`border-t border-slate-100 dark:border-white/[0.08] ${collapsed ? "p-2" : "p-3"}`}>
        <div className="relative group">
          <button
            className={`w-full flex items-center rounded-xl hover:bg-slate-50 dark:hover:bg-[#141A28] transition border border-slate-200/60 dark:border-white/[0.08] text-left cursor-pointer active:scale-[0.99] ${
              collapsed ? "justify-center p-2" : "justify-between p-2"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                {storeName.substring(0, 2)}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{storeName}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{storeDomain}</div>
                </div>
              )}
            </div>
            {!collapsed && <ChevronsUpDown className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 ml-1" />}
          </button>

          {/* Collapsed Store Tooltip */}
          {collapsed && (
            <div className="absolute left-full ml-2 bottom-2 hidden group-hover:flex items-center z-50 pointer-events-none">
              <div className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
                {storeName} ({storeDomain})
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (Collapsible: w-20 or w-64) */}
      <aside
        className={`hidden md:block shrink-0 h-screen sticky top-0 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderContent(isCollapsed)}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-64 max-w-xs h-full bg-white dark:bg-slate-900 z-10 shadow-xl">
            {renderContent(false)}
          </div>
        </div>
      )}
    </>
  );
};
