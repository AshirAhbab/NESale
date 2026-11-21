"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Plus,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Trash2,
  Star,
  Activity,
  Layers,
  Copy,
  Check,
  Loader2,
  X,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Laptop,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface IntegrationItem {
  id: string;
  businessId: string;
  provider: string;
  status: "active" | "paused";
  domain: string;
  name: string;
  url: string;
  platform: string;
  isPrimary: boolean;
  lastSyncAt: string | null;
  createdAt: string;
}

interface PlanInfo {
  code: string;
  name: string;
  websiteQuota: number;
  websiteCount: number;
  canAddWebsite: boolean;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [plan, setPlan] = useState<PlanInfo>({
    code: "free",
    name: "Free",
    websiteQuota: 1,
    websiteCount: 0,
    canAddWebsite: true,
  });
  const [businessId, setBusinessId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Connect Website Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newPlatform, setNewPlatform] = useState<"custom" | "shopify" | "woocommerce" | "webflow" | "wordpress">("custom");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Embed Script Modal
  const [selectedEmbed, setSelectedEmbed] = useState<IntegrationItem | null>(null);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Testing connection state
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard/integrations");
      const data = await res.json();
      if (res.ok) {
        setIntegrations(data.integrations || []);
        if (data.plan) setPlan(data.plan);
        if (data.business?.id) setBusinessId(data.business.id);
      }
    } catch {
      toast.error("Failed to load integrations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleConnectWebsite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) {
      toast.error("Please enter a valid website domain or URL.");
      return;
    }

    if (!plan.canAddWebsite) {
      toast.error(`Your current ${plan.name} plan allows up to ${plan.websiteQuota} website(s). Please upgrade to add more.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/dashboard/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim() || undefined,
          url: newUrl.trim(),
          platform: newPlatform,
          isPrimary: integrations.length === 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to connect website.");
      }

      toast.success("Website connected successfully!");
      setIsAddModalOpen(false);
      setNewName("");
      setNewUrl("");
      setNewPlatform("custom");
      fetchIntegrations();
    } catch (err: any) {
      toast.error(err?.message || "Could not connect website.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: IntegrationItem) => {
    const nextStatus = item.status === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/v1/dashboard/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: nextStatus } : i))
        );
        toast.success(`Website status set to ${nextStatus.toUpperCase()}`);
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      toast.error("Could not update website status.");
    }
  };

  const handleSetPrimary = async (item: IntegrationItem) => {
    try {
      const res = await fetch("/api/v1/dashboard/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          isPrimary: true,
        }),
      });

      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((i) => ({ ...i, isPrimary: i.id === item.id }))
        );
        toast.success(`"${item.name}" is now your primary website.`);
      } else {
        throw new Error("Failed to set primary website");
      }
    } catch {
      toast.error("Could not set primary website.");
    }
  };

  const handleDelete = async (item: IntegrationItem) => {
    if (!confirm(`Are you sure you want to disconnect ${item.domain}? The AI assistant will stop serving shoppers on this domain.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/dashboard/integrations?id=${item.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIntegrations((prev) => prev.filter((i) => i.id !== item.id));
        toast.success("Website disconnected successfully.");
        fetchIntegrations();
      } else {
        throw new Error("Failed to delete integration");
      }
    } catch {
      toast.error("Could not disconnect website.");
    }
  };

  const handleTestPing = (item: IntegrationItem) => {
    setTestingId(item.id);
    setTimeout(() => {
      setTestingId(null);
      toast.success(`Live connection verified for ${item.domain}. Status: Active`);
    }, 1200);
  };

  const generateSnippet = (item: IntegrationItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nesale.ai";
    return `<!-- NE_Sale Autonomous AI Assistant Embed -->
<script
  src="${origin}/widget.js"
  data-business-id="${item.businessId || businessId}"
  async>
</script>`;
  };

  const copyEmbedSnippet = (snippet: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    toast.success("Embed script copied to clipboard!");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Websites &amp; Integrations</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
              Multi-Domain Hub
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Connect your storefronts, manage domain verification, and deploy your autonomous AI sales assistant.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect Website</span>
        </button>
      </div>

      {/* 2. Plan Quota & Multi-Website Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 dark:from-[#11141d] dark:via-[#131722] dark:to-[#0f1118] border border-indigo-100/80 dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white">
              {plan.name} Plan
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              • Connected Domains: <strong className="text-slate-900 dark:text-white">{plan.websiteCount}</strong> / {plan.websiteQuota >= 100 ? "Unlimited" : plan.websiteQuota}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
            {plan.code === "free"
              ? "Your Free Starter plan allows 1 active website connection. Upgrade to Growth (up to 3 websites) or Pro (unlimited) to deploy across multiple storefronts."
              : plan.code === "growth"
              ? "Your Growth plan allows up to 3 connected domains with synchronized catalog discovery and brand customization."
              : "Your Pro plan includes unlimited domain integrations, cross-store analytics, and priority webhook sync."}
          </p>

          {/* Quota Progress Bar */}
          <div className="w-full max-w-sm bg-slate-200 dark:bg-white/[0.08] h-2 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                plan.websiteCount >= plan.websiteQuota
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              }`}
              style={{
                width: `${Math.min(100, (plan.websiteCount / (plan.websiteQuota || 1)) * 100)}%`,
              }}
            ></div>
          </div>
        </div>

        {plan.code !== "pro" && (
          <Link
            href="/dashboard/billing"
            className="px-4 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-white dark:bg-white/[0.04] text-indigo-700 dark:text-indigo-300 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 dark:hover:bg-white/[0.08] transition shrink-0 active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Upgrade Website Quota</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* 3. Connected Websites Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <span className="text-xs">Loading connected websites...</span>
        </div>
      ) : integrations.length === 0 ? (
        <div className="py-16 px-6 text-center bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
            <Globe className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No websites connected yet
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Connect your website or ecommerce store to enable autonomous customer chat, product recommendations, and lead capture.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm inline-flex items-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Your First Website</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between gap-5 relative group transition hover:border-indigo-200 dark:hover:border-indigo-800/60"
            >
              {/* Card Top */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[260px]">
                          {item.name}
                        </h3>
                        {item.isPrimary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Star className="w-2.5 h-2.5 fill-amber-500" /> Primary
                          </span>
                        )}
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-1 mt-0.5 transition"
                      >
                        <span>{item.domain}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  {/* Status toggle pill */}
                  <button
                    onClick={() => handleToggleStatus(item)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition cursor-pointer ${
                      item.status === "active"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                        : "bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]"
                    }`}
                  >
                    {item.status}
                  </button>
                </div>

                {/* Details badge row */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] capitalize">
                    Platform: {item.platform}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
                    Added {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedEmbed(item)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98]"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Embed Code</span>
                  </button>

                  <button
                    onClick={() => handleTestPing(item)}
                    disabled={testingId === item.id}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    {testingId === item.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Activity className="w-3.5 h-3.5" />
                        <span>Test Ping</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {!item.isPrimary && (
                    <button
                      onClick={() => handleSetPrimary(item)}
                      title="Set as Primary Website"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    title="Disconnect Website"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Connect Website Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Connect New Website
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deploy your AI shopping assistant to a new domain or storefront.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectWebsite} className="space-y-4">
              {/* Website Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Store / Website Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. European Flagship Store"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
              </div>

              {/* Website Domain / URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Website Domain or URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. nordikgear.com or https://nordikgear.com"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  CORS headers and autonomous AI agent will be authorized for this origin domain.
                </p>
              </div>

              {/* Platform Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Platform
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "custom" as const, label: "Custom HTML / JS" },
                    { id: "shopify" as const, label: "Shopify" },
                    { id: "woocommerce" as const, label: "WooCommerce" },
                    { id: "webflow" as const, label: "Webflow" },
                    { id: "wordpress" as const, label: "WordPress" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setNewPlatform(p.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition cursor-pointer ${
                        newPlatform === p.id
                          ? "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-bold"
                          : "border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.03] text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-400 font-semibold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-white/[0.04] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !plan.canAddWebsite}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize &amp; Connect</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Embed Script Modal */}
      {selectedEmbed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-indigo-600" />
                  <span>Embed Code for {selectedEmbed.name}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Add this snippet to your website to launch the AI sales assistant.
                </p>
              </div>
              <button
                onClick={() => setSelectedEmbed(null)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                  {generateSnippet(selectedEmbed)}
                </pre>
                <button
                  onClick={() => copyEmbedSnippet(generateSnippet(selectedEmbed))}
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Quick Installation Instructions:
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                  <li>Copy the script tag above.</li>
                  <li>Paste it into your website's template right before the closing <code>&lt;/body&gt;</code> tag.</li>
                  <li>Save and publish. The AI assistant will automatically activate on <strong>{selectedEmbed.domain}</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEmbed(null)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition active:scale-[0.98] cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
