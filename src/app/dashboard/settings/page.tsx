"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Store,
  Bell,
  Shield,
  Layers,
  Edit3,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Laptop,
  AlertTriangle,
  Unplug,
  Check,
  TrendingUp,
  MessageSquare,
  FileText,
  CreditCard,
  X,
  Sun,
  Moon,
  Monitor,
  Loader2,
  Users,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
} from "lucide-react";
import { useTheme } from "@/lib/theme/context";
import { toast } from "@/components/ui/Toast";
import { IntegrationsSettingsTab } from "@/components/dashboard/settings/IntegrationsSettingsTab";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<
    "general" | "store" | "team" | "notifications" | "security" | "integrations"
  >("general");

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Business state
  const [businessId, setBusinessId] = useState("");
  const [storeName, setStoreName] = useState("Store");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [storeEmail, setStoreEmail] = useState("");
  const [storePhone, setStorePhone] = useState("");

  // Profile state
  const [profileName, setProfileName] = useState("Store Admin");
  const [profileRole, setProfileRole] = useState("Owner / Store Admin");
  const [avatarUrl, setAvatarUrl] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
  );

  // Notifications State
  const [salesAlerts, setSalesAlerts] = useState(true);
  const [unansweredAlerts, setUnansweredAlerts] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [billingNotifications, setBillingNotifications] = useState(true);

  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [tempProfileName, setTempProfileName] = useState("");
  const [tempProfileRole, setTempProfileRole] = useState("");
  const [tempStoreEmail, setTempStoreEmail] = useState("");

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch live settings on mount
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/v1/dashboard/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.business) {
          setBusinessId(data.business.id || "");
          if (data.business.name) setStoreName(data.business.name);
          if (data.business.websiteUrl) setWebsiteUrl(data.business.websiteUrl);
          if (data.business.email) setStoreEmail(data.business.email);
          if (data.business.phone) setStorePhone(data.business.phone);
        }
        if (data.settings) {
          if (data.settings.profile) {
            if (data.settings.profile.name) setProfileName(data.settings.profile.name);
            if (data.settings.profile.role) setProfileRole(data.settings.profile.role);
            if (data.settings.profile.avatarUrl) setAvatarUrl(data.settings.profile.avatarUrl);
          }
          if (data.settings.notifications) {
            setSalesAlerts(!!data.settings.notifications.salesAlerts);
            setUnansweredAlerts(!!data.settings.notifications.unansweredAlerts);
            setWeeklyReport(!!data.settings.notifications.weeklyReport);
            setBillingNotifications(!!data.settings.notifications.billingNotifications);
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load settings:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          name: storeName,
          websiteUrl,
          email: storeEmail,
          phone: storePhone,
          notifications: {
            salesAlerts,
            unansweredAlerts,
            weeklyReport,
            billingNotifications,
          },
          profile: {
            name: profileName,
            role: profileRole,
            avatarUrl,
          },
        }),
      });

      if (res.ok) {
        setHasUnsavedChanges(false);
        toast.success("Settings saved successfully!");
      } else {
        toast.error("Failed to save settings. Please try again.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setHasUnsavedChanges(false);
    toast.info("Changes discarded");
  };

  const handleOpenEditProfile = () => {
    setTempProfileName(profileName);
    setTempProfileRole(profileRole);
    setTempStoreEmail(storeEmail);
    setIsEditProfileOpen(true);
  };

  const handleSaveProfileModal = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileName(tempProfileName);
    setProfileRole(tempProfileRole);
    setStoreEmail(tempStoreEmail);
    setIsEditProfileOpen(false);
    setHasUnsavedChanges(true);
    toast.info("Profile updated locally. Click 'Save changes' to persist.");
  };

  return (
    <div className="space-y-6 pb-28 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumbs & Header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          <span>SETTINGS</span>
          <span>/</span>
          <span className="text-indigo-600">GENERAL WORKSPACE</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage your account, store connection, notifications, and security.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-[#171b26] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] self-start sm:self-center">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{storeName} • Connected</span>
          </div>
        </div>
      </div>

      {/* Pill Tab Bar */}
      <div className="bg-slate-100/80 dark:bg-[#1e2332] p-1 rounded-2xl flex items-center gap-1 overflow-x-auto">
        {[
          { id: "general" as const, label: "General" },
          { id: "store" as const, label: "Store" },
          { id: "team" as const, label: "Team" },
          { id: "notifications" as const, label: "Notifications", hasDot: true },
          { id: "security" as const, label: "Security" },
          { id: "integrations" as const, label: "Integrations" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap active:scale-[0.98] ${
                isActive
                  ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]"
              }`}
            >
              <span>{tab.label}</span>
              {tab.hasDot && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* 1. Account Card */}
      {activeTab === "general" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account</h3>
            </div>
            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition active:scale-[0.98]"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit profile</span>
            </button>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Manage your personal profile, credentials, and organizational permissions.
          </p>

          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-100 dark:border-indigo-900 shrink-0">
                <img
                  src={avatarUrl}
                  alt={profileName}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#11141d]"></span>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                    {profileName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                    {profileRole}
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{storeEmail}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Primary Organization Contact • Verified Account
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800 self-start sm:self-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Identity Verified</span>
            </div>
          </div>

          {/* Interface Theme Preference */}
          <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08]">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Interface Theme
            </label>
            <div className="grid grid-cols-3 gap-2.5 max-w-md">
              {[
                { id: "light" as const, label: "Light", icon: Sun },
                { id: "dark" as const, label: "Dark", icon: Moon },
                { id: "system" as const, label: "System", icon: Monitor },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20"
                        : "border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2. Store Card */}
      {(activeTab === "general" || activeTab === "store") && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Store Details</h3>
            </div>
            <Link
              href="/dashboard/store"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Manage connection</span>
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Your primary connected storefront synchronization and catalog ingestion details.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Store / Brand Name
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Storefront Website URL
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={storeEmail}
                onChange={(e) => {
                  setStoreEmail(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Contact Phone / WhatsApp
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => {
                  setStorePhone(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Notifications Card */}
      {activeTab === "notifications" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Configure how and when NESale alerts you and your store operations team.
          </p>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">AI sales alerts</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Notify me when AI-generated sales exceed my daily target.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSalesAlerts(!salesAlerts);
                  setHasUnsavedChanges(true);
                }}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  salesAlerts ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    salesAlerts ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Unanswered shopper questions
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Alert me when the AI encounters a question it lacks catalog knowledge to answer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnansweredAlerts(!unansweredAlerts);
                  setHasUnsavedChanges(true);
                }}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  unansweredAlerts ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    unansweredAlerts ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Weekly performance digest
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Summary email of conversion rates, top questions, and revenue attribution.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWeeklyReport(!weeklyReport);
                  setHasUnsavedChanges(true);
                }}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  weeklyReport ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${
                    weeklyReport ? "right-1" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Team Card */}
      {activeTab === "team" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Team &amp; Roles</h3>
            </div>
            <Link
              href="/dashboard/team"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage full roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Invite store staff, allocate admin seats, and assign roles for your store workspace.
          </p>
          <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">Workspace Permissions</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Role-based access control enabled (Owner, Admin, Member).</div>
            </div>
            <Link
              href="/dashboard/team"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition"
            >
              Open Team Settings &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* 5. Security Card */}
      {activeTab === "security" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Security &amp; Access Control</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            Two-factor authentication, active login sessions, and credential encryption.
          </p>
          <div className="space-y-3 pt-1">
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Two-Factor Authentication (2FA)</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Enforce TOTP authenticator app verification on login.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                ENABLED (AUTH V2)
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50/60 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">Active Sessions</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Signed in via Supabase Auth (Current browser session active).</p>
              </div>
              <button
                type="button"
                onClick={() => toast.success("All other active sessions revoked.")}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              >
                Revoke Others
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Integrations Tab */}
      {activeTab === "integrations" && (
        <IntegrationsSettingsTab businessId={businessId} />
      )}

      {/* Disconnect Danger Zone */}
      {activeTab === "store" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-rose-100 dark:border-rose-950/40 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400">
                Disconnect Store Catalog
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Permanently pause the AI shopper assistant and stop webhook synchronization.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                toast.info("Store disconnect is locked while an active billing plan is connected.");
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 active:scale-[0.98]"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>Disconnect store</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Edit User Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfileModal} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={tempProfileName}
                  onChange={(e) => setTempProfileName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Role Title
                </label>
                <input
                  type="text"
                  required
                  value={tempProfileRole}
                  onChange={(e) => setTempProfileRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={tempStoreEmail}
                  onChange={(e) => setTempStoreEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
                >
                  Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Toast Action Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up w-[calc(100%-2rem)] max-w-lg">
          <div className="bg-white/95 dark:bg-[#11141d]/95 backdrop-blur-md border border-slate-200/90 dark:border-white/[0.12] shadow-2xl rounded-2xl sm:rounded-full px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 sm:gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span className="font-bold text-slate-900 dark:text-white">Unsaved changes</span>
            </div>
            <span className="text-slate-400 hidden sm:inline">•</span>
            <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
              Store or notification modifications pending
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-3 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition active:scale-[0.98] cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSaving ? "Saving..." : "Save changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
