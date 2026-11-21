"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Globe,
  Store,
  Calendar,
  Mail,
  MessageSquare,
  Users,
  CheckCircle2,
  AlertCircle,
  Lock,
  Plus,
  Trash2,
  Play,
  Pause,
  ExternalLink,
  ShieldCheck,
  Loader2,
  X,
  Sliders,
  Key,
  Check,
  ArrowRight,
  Sparkles,
  Phone,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface IntegrationSlotData {
  usedSlots: number;
  maxSlots: number | string;
  canAddSlot: boolean;
  plan: string;
}

interface TeamItem {
  id: string;
  name: string;
  type: string;
}

interface IntegrationItem {
  id: string;
  provider: string;
  status: string;
  maskedSecret?: string;
  teamId?: string | null;
  team?: TeamItem | null;
  metadata?: any;
  createdAt: string;
}

interface CatalogEntry {
  id: string;
  title: string;
  category: "Team Alerts" | "Calendars" | "CRM & Webhooks" | "Storefronts" | "Advanced Handoff";
  description: string;
  icon: any;
  iconBg: string;
  iconText: string;
  minPlan: "free" | "starter" | "growth" | "pro";
  minPlanLabel: string;
  fields: {
    key: string;
    label: string;
    placeholder: string;
    type?: string;
    required?: boolean;
    helpText?: string;
  }[];
  isSpecialLink?: string;
}

const CATALOG_ENTRIES: CatalogEntry[] = [
  {
    id: "slack",
    title: "Slack Incoming Webhook",
    category: "Team Alerts",
    description: "Broadcast instant shopper leads, hot cart notices, and checkout alerts to any Slack channel.",
    icon: MessageSquare,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
    minPlan: "starter",
    minPlanLabel: "Starter ($19/mo)",
    fields: [
      {
        key: "webhookUrl",
        label: "Slack Incoming Webhook URL",
        placeholder: "https://hooks.slack.com/services/T00/B00/XXXX",
        type: "password",
        required: true,
        helpText: "Create in Slack: Apps > Incoming Webhooks > Add New Webhook to Channel",
      },
    ],
  },
  {
    id: "discord",
    title: "Discord Channel Alerts",
    category: "Team Alerts",
    description: "Post instant buyer notifications, conversion notices, and customer messages into your Discord server.",
    icon: MessageSquare,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800/40",
    iconText: "text-indigo-600 dark:text-indigo-400",
    minPlan: "starter",
    minPlanLabel: "Starter ($19/mo)",
    fields: [
      {
        key: "webhookUrl",
        label: "Discord Webhook URL",
        placeholder: "https://discord.com/api/webhooks/...",
        type: "password",
        required: true,
        helpText: "Create in Discord: Channel Settings > Integrations > Webhooks > New Webhook",
      },
    ],
  },
  {
    id: "gmail",
    title: "Gmail & Custom SMTP",
    category: "Team Alerts",
    description: "Dispatch automated email confirmations, order alerts, and lead round-robin notices via your SMTP server.",
    icon: Mail,
    iconBg: "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800/40",
    iconText: "text-rose-600 dark:text-rose-400",
    minPlan: "starter",
    minPlanLabel: "Starter ($19/mo)",
    fields: [
      {
        key: "host",
        label: "SMTP Host Server",
        placeholder: "smtp.gmail.com",
        required: true,
      },
      {
        key: "port",
        label: "SMTP Port",
        placeholder: "587 or 465",
        required: true,
      },
      {
        key: "user",
        label: "Username / Email Address",
        placeholder: "notifications@yourdomain.com",
        required: true,
      },
      {
        key: "password",
        label: "Password or App Password",
        placeholder: "••••••••••••••••",
        type: "password",
        required: true,
        helpText: "For Gmail, generate an App Password in your Google Account Security settings.",
      },
    ],
  },
  {
    id: "google_calendar",
    title: "Google Calendar Sync",
    category: "Calendars",
    description: "Sync AI chat appointments directly into staff Google calendars with 2-way real-time scheduling.",
    icon: Calendar,
    iconBg: "bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800/40",
    iconText: "text-blue-600 dark:text-blue-400",
    minPlan: "starter",
    minPlanLabel: "Starter ($19/mo)",
    fields: [
      {
        key: "calendarId",
        label: "Calendar ID",
        placeholder: "primary or calendar-id@group.calendar.google.com",
        required: true,
        helpText: "Found under Google Calendar Settings > Integrate Calendar > Calendar ID",
      },
      {
        key: "apiKey",
        label: "Google API Key / Service Account Key",
        placeholder: "AIzaSy...",
        type: "password",
        required: true,
      },
    ],
  },
  {
    id: "webhook",
    title: "Custom Webhook & Zapier",
    category: "CRM & Webhooks",
    description: "Forward live JSON event payloads to Zapier, Make.com, n8n, or internal API endpoints.",
    icon: Zap,
    iconBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800/40",
    iconText: "text-amber-600 dark:text-amber-400",
    minPlan: "free",
    minPlanLabel: "Free ($0/mo)",
    fields: [
      {
        key: "webhookUrl",
        label: "Target Webhook Endpoint URL",
        placeholder: "https://api.yourdomain.com/webhooks/ne-sale",
        required: true,
        helpText: "Accepts HTTP POST requests with JSON body containing event data.",
      },
      {
        key: "secret",
        label: "HMAC Signature Secret (Optional)",
        placeholder: "whsec_...",
        type: "password",
        required: false,
        helpText: "Used to compute X-NE-Sale-Signature header for verifying payload authenticity.",
      },
    ],
  },
  {
    id: "hubspot",
    title: "HubSpot CRM",
    category: "CRM & Webhooks",
    description: "Automatically create or update leads, customer properties, and deal notes in HubSpot CRM.",
    icon: Users,
    iconBg: "bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800/40",
    iconText: "text-orange-600 dark:text-orange-400",
    minPlan: "starter",
    minPlanLabel: "Starter ($19/mo)",
    fields: [
      {
        key: "accessToken",
        label: "HubSpot Private App Access Token",
        placeholder: "pat-na1-...",
        type: "password",
        required: true,
        helpText: "Generated in HubSpot Settings > Integrations > Private Apps (requires crm.objects.contacts.write scope).",
      },
    ],
  },
  {
    id: "shopify",
    title: "Shopify Storefront & Admin API",
    category: "Storefronts",
    description: "Deep Shopify catalog indexing, live inventory sync, and instant add-to-cart checkout links.",
    icon: Store,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800/40",
    iconText: "text-emerald-600 dark:text-emerald-400",
    minPlan: "growth",
    minPlanLabel: "Growth ($39/mo)",
    fields: [],
    isSpecialLink: "/dashboard/store",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Business API",
    category: "Advanced Handoff",
    description: "Human handoff and VIP shopper routing directly to your merchant WhatsApp Business numbers.",
    icon: Phone,
    iconBg: "bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800/40",
    iconText: "text-teal-600 dark:text-teal-400",
    minPlan: "pro",
    minPlanLabel: "Pro (Pay As You Go)",
    fields: [
      {
        key: "phoneNumberId",
        label: "WhatsApp Phone Number ID",
        placeholder: "109823482736",
        required: true,
        helpText: "Found in Meta for Developers > WhatsApp > API Setup > Phone Number ID.",
      },
      {
        key: "accessToken",
        label: "Permanent System User Token",
        placeholder: "EAAB...",
        type: "password",
        required: true,
        helpText: "Permanent access token with whatsapp_business_messaging permissions.",
      },
      {
        key: "recipientPhone",
        label: "Destination Staff Phone Number",
        placeholder: "+14155552671",
        required: false,
        helpText: "E.164 formatted number where escalation alerts will be sent.",
      },
    ],
  },
];

export function IntegrationsSettingsTab({ businessId }: { businessId?: string }) {
  // Slots & Active Integrations
  const [slots, setSlots] = useState<IntegrationSlotData>({
    usedSlots: 0,
    maxSlots: 1,
    canAddSlot: true,
    plan: "free",
  });
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Modal Configuration State
  const [activeCatalogItem, setActiveCatalogItem] = useState<CatalogEntry | null>(null);
  const [activeExistingItem, setActiveExistingItem] = useState<IntegrationItem | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Form State
  const [formFields, setFormFields] = useState<Record<string, string>>({});
  const [formTeamId, setFormTeamId] = useState<string>("");
  const [formTriggers, setFormTriggers] = useState({
    leadCaptured: true,
    appointmentBooked: true,
    highIntentQuery: false,
  });

  // Action states
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Integrations on Mount
  const fetchIntegrations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard/integrations");
      if (res.ok) {
        const data = await res.json();
        setSlots({
          usedSlots: data.slots?.usedSlots || 0,
          maxSlots: data.slots?.maxSlots ?? 1,
          canAddSlot: data.slots?.canAddSlot ?? true,
          plan: data.slots?.plan || "free",
        });
        setIntegrations(data.integrations || []);
        setTeams(data.teams || []);
      }
    } catch (err) {
      console.warn("Failed to load integrations:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchIntegrations();
  }, []);

  // Check if a plan tier qualifies
  const planRank = (plan: string): number => {
    const p = plan.toLowerCase();
    if (p === "pro") return 3;
    if (p === "growth") return 2;
    if (p === "starter") return 1;
    return 0; // free
  };

  const isPlanQualified = (requiredPlan: string): boolean => {
    return planRank(slots.plan) >= planRank(requiredPlan);
  };

  // Find if a catalog entry is currently connected
  const getExistingIntegration = (providerId: string): IntegrationItem | undefined => {
    return integrations.find((i) => i.provider.toLowerCase() === providerId.toLowerCase());
  };

  // Open Modal to Configure or Connect
  const handleOpenConfig = (entry: CatalogEntry) => {
    const existing = getExistingIntegration(entry.id);

    // If it's a special link (Shopify)
    if (entry.isSpecialLink) {
      return;
    }

    // Check plan tier eligibility
    if (!isPlanQualified(entry.minPlan)) {
      setIsUpgradeModalOpen(true);
      return;
    }

    // If not connected yet, check if slot limit reached
    if (!existing && !slots.canAddSlot) {
      setIsUpgradeModalOpen(true);
      return;
    }

    setActiveCatalogItem(entry);
    setActiveExistingItem(existing || null);
    setTestResult(null);

    // Initialize form fields
    const initialValues: Record<string, string> = {};
    entry.fields.forEach((f) => {
      initialValues[f.key] = "";
    });

    if (existing) {
      // If editing existing, prefill metadata
      const meta = existing.metadata || {};
      entry.fields.forEach((f) => {
        if (meta[f.key]) {
          initialValues[f.key] = meta[f.key];
        }
      });
      // If masked secret exists, show placeholder for password fields
      setFormTeamId(existing.teamId || "");
      if (meta.triggers) {
        setFormTriggers({
          leadCaptured: meta.triggers.leadCaptured ?? true,
          appointmentBooked: meta.triggers.appointmentBooked ?? true,
          highIntentQuery: meta.triggers.highIntentQuery ?? false,
        });
      }
    } else {
      setFormTeamId("");
      setFormTriggers({
        leadCaptured: true,
        appointmentBooked: true,
        highIntentQuery: false,
      });
    }

    setFormFields(initialValues);
    setIsConfigModalOpen(true);
  };

  // Run Live Connection Test
  const handleTestConnection = async () => {
    if (!activeCatalogItem) return;

    // Pick primary credential string (either password or webhookUrl or first field)
    let credential = "";
    for (const f of activeCatalogItem.fields) {
      if (f.type === "password" || f.key.includes("webhook") || f.key.includes("Token") || f.key.includes("apiKey")) {
        if (formFields[f.key]) {
          credential = formFields[f.key];
          break;
        }
      }
    }
    if (!credential) {
      credential = Object.values(formFields)[0] || "";
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/dashboard/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeCatalogItem.id,
          credential,
          metadata: formFields,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "Connection verified! Everything is working correctly.",
        });
        toast.success("Connection test passed!");
      } else {
        setTestResult({
          success: false,
          message: data.error || data.message || "Failed to reach destination. Please check your credentials.",
        });
        toast.error("Connection test failed");
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while verifying connection.",
      });
      toast.error("Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  // Save Integration (Create or Update)
  const handleSaveIntegration = async () => {
    if (!activeCatalogItem) return;

    // Validate required fields
    for (const f of activeCatalogItem.fields) {
      if (f.required && !formFields[f.key] && !activeExistingItem) {
        toast.error(`Please provide ${f.label}`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Find primary credential for encryption
      let credential = "";
      for (const f of activeCatalogItem.fields) {
        if (f.type === "password" || f.key.includes("webhook") || f.key.includes("Token") || f.key.includes("apiKey")) {
          if (formFields[f.key]) {
            credential = formFields[f.key];
            break;
          }
        }
      }
      if (!credential && Object.values(formFields).length > 0) {
        credential = Object.values(formFields)[0];
      }

      if (activeExistingItem) {
        // Update existing integration
        const res = await fetch("/api/v1/dashboard/integrations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: activeExistingItem.id,
            status: "active",
            teamId: formTeamId || null,
            credential: credential || undefined,
            triggers: formTriggers,
            metadata: formFields,
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update integration");
        }
        toast.success(`${activeCatalogItem.title} updated successfully!`);
      } else {
        // Create new integration
        const res = await fetch("/api/v1/dashboard/integrations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: activeCatalogItem.id,
            credential,
            teamId: formTeamId || null,
            metadata: {
              ...formFields,
              triggers: formTriggers,
              name: activeCatalogItem.title,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to save integration");
        }
        toast.success(`${activeCatalogItem.title} connected successfully!`);
      }

      setIsConfigModalOpen(false);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to save integration");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle Pause/Resume Integration
  const handleToggleStatus = async () => {
    if (!activeExistingItem || !activeCatalogItem) return;
    const newStatus = activeExistingItem.status === "active" ? "paused" : "active";
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/dashboard/integrations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: activeExistingItem.id,
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to change status");
      toast.success(newStatus === "active" ? "Integration resumed" : "Integration paused");
      setIsConfigModalOpen(false);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to change status");
    } finally {
      setIsSaving(false);
    }
  };

  // Disconnect / Delete Integration
  const handleDeleteIntegration = async () => {
    if (!activeExistingItem || !activeCatalogItem) return;
    if (!confirm(`Are you sure you want to disconnect ${activeCatalogItem.title}? This will free up 1 integration slot.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/dashboard/integrations?id=${activeExistingItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect integration");
      toast.success(`${activeCatalogItem.title} disconnected.`);
      setIsConfigModalOpen(false);
      await fetchIntegrations();
    } catch (err: any) {
      toast.error(err.message || "Failed to disconnect integration");
    } finally {
      setIsDeleting(false);
    }
  };

  // Categories
  const categories = ["All", "Team Alerts", "Calendars", "CRM & Webhooks", "Storefronts", "Advanced Handoff"];

  const filteredCatalog = CATALOG_ENTRIES.filter((item) => {
    if (selectedCategory === "All") return true;
    return item.category === selectedCategory;
  });

  const planDisplayName =
    slots.plan === "pro"
      ? "Pro (Pay As You Go)"
      : slots.plan === "growth"
      ? "Growth ($39/mo)"
      : slots.plan === "starter"
      ? "Starter ($19/mo)"
      : "Free ($0/mo)";

  return (
    <div className="space-y-6">
      {/* 1. Integration Slots & Quota Banner */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Integrations &amp; Custom BYO-Keys
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                {planDisplayName}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Bring your own API keys, webhooks, or calendar credentials. All secrets are encrypted via AES-256-GCM and scoped by team.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
            >
              <span>Manage Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Slot Progress Bar */}
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">Active Third-Party Slots:</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                {slots.usedSlots} / {slots.maxSlots === 999 ? "Unlimited" : slots.maxSlots} Connected
              </span>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {slots.plan === "free" && "Free tier includes 1 custom webhook slot."}
              {slots.plan === "starter" && "Starter tier includes 2 selectable integration slots."}
              {slots.plan === "growth" && "Growth tier includes 4 integration slots + Shopify OAuth."}
              {slots.plan === "pro" && "Pro tier includes unlimited slots & WhatsApp routing."}
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                !slots.canAddSlot && slots.maxSlots !== 999
                  ? "bg-amber-500"
                  : "bg-indigo-600 dark:bg-indigo-500"
              }`}
              style={{
                width:
                  slots.maxSlots === 999
                    ? "25%"
                    : `${Math.min(100, (slots.usedSlots / Number(slots.maxSlots)) * 100)}%`,
              }}
            />
          </div>

          {!slots.canAddSlot && slots.maxSlots !== 999 && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-amber-700 dark:text-amber-400">
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Slot limit reached. Upgrade to Growth or Pro to connect additional platforms, or disconnect an active slot.
              </span>
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(true)}
                className="font-bold underline cursor-pointer hover:text-amber-800 dark:hover:text-amber-300 ml-2"
              >
                Upgrade now &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Connected Domains Quick Link Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">Connected Storefront Websites</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Manage website domains, live chat widget embed scripts, and domain CORS whitelists.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/integrations"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition shrink-0 self-start sm:self-center"
        >
          <span>Manage Websites</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 3. Filter Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98] ${
              selectedCategory === cat
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xs font-bold"
                : "bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-100 dark:border-white/[0.08]"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 4. Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCatalog.map((item) => {
          const existing = getExistingIntegration(item.id);
          const isConnected = !!existing;
          const isPaused = existing?.status === "paused";
          const qualifies = isPlanQualified(item.minPlan);
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className={`bg-white dark:bg-[#11141d] rounded-2xl p-5 border shadow-sm transition hover:shadow-md flex flex-col justify-between gap-4 ${
                isConnected
                  ? isPaused
                    ? "border-amber-200 dark:border-amber-900/40"
                    : "border-indigo-200 dark:border-indigo-900/40 ring-1 ring-indigo-500/10"
                  : "border-slate-100 dark:border-white/[0.08]"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${item.iconBg}`}
                    >
                      <Icon className={`w-5 h-5 ${item.iconText}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{item.category}</span>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div>
                    {isConnected ? (
                      isPaused ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                          <Pause className="w-2.5 h-2.5" />
                          Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Active
                        </span>
                      )
                    ) : !qualifies ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400">
                        <Lock className="w-2.5 h-2.5" />
                        {item.minPlanLabel}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400">
                        Ready
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>

                {/* Team & Masked Info if connected */}
                {isConnected && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      {existing.team?.name || "All Teams"}
                    </span>
                    {existing.maskedSecret && (
                      <span className="font-mono text-[10px] bg-slate-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded">
                        {existing.maskedSecret}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                {item.isSpecialLink ? (
                  <Link
                    href={item.isSpecialLink}
                    className="w-full py-2 px-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
                  >
                    <span>Store Settings</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                ) : isConnected ? (
                  <button
                    type="button"
                    onClick={() => handleOpenConfig(item)}
                    className="w-full py-2 px-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Configure Settings</span>
                  </button>
                ) : !qualifies ? (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Unlock in {item.minPlanLabel.split(" ")[0]}</span>
                  </button>
                ) : !slots.canAddSlot ? (
                  <button
                    type="button"
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Slot Limit Reached</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenConfig(item)}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect &rarr;</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. Configuration & BYO-Key Modal */}
      {isConfigModalOpen && activeCatalogItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 max-w-lg w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${activeCatalogItem.iconBg}`}
                >
                  <activeCatalogItem.icon className={`w-5 h-5 ${activeCatalogItem.iconText}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {activeExistingItem ? "Configure" : "Connect"} {activeCatalogItem.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    AES-256 encrypted • Scoped by business &amp; team
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Masked Secret Alert */}
            {activeExistingItem?.maskedSecret && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Currently saved:{" "}
                    <code className="font-mono text-[11px] font-bold text-slate-900 dark:text-white">
                      {activeExistingItem.maskedSecret}
                    </code>
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">Encrypted</span>
              </div>
            )}

            {/* Dynamic Credential Inputs */}
            <div className="space-y-3">
              {activeCatalogItem.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type={field.type || "text"}
                    value={formFields[field.key] || ""}
                    onChange={(e) =>
                      setFormFields({ ...formFields, [field.key]: e.target.value })
                    }
                    placeholder={
                      activeExistingItem && field.type === "password"
                        ? "Enter new value to update secret, or leave blank to keep current"
                        : field.placeholder
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  {field.helpText && (
                    <p className="text-[10px] text-slate-400">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Team Scoping Selector */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Team Scoping &amp; Notification Assignment
              </label>
              <select
                value={formTeamId}
                onChange={(e) => setFormTeamId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">All Teams (Global Storewide)</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.type})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400">
                Choose which internal team receives events and lead handoffs from this integration.
              </p>
            </div>

            {/* Event Trigger Toggles */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Event Dispatch Triggers
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.06] text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTriggers.leadCaptured}
                    onChange={(e) =>
                      setFormTriggers({ ...formTriggers, leadCaptured: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Lead Captured (Shopper email, name or phone shared in chat)
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.06] text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTriggers.appointmentBooked}
                    onChange={(e) =>
                      setFormTriggers({ ...formTriggers, appointmentBooked: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    Appointment / Consultation Booked
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.06] text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formTriggers.highIntentQuery}
                    onChange={(e) =>
                      setFormTriggers({ ...formTriggers, highIntentQuery: e.target.checked })
                    }
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-slate-700 dark:text-slate-300">
                    High Purchase Intent / Human Operator Request
                  </span>
                </label>
              </div>
            </div>

            {/* Test Connection Live Ping Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
              >
                {isTesting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>{isTesting ? "Testing live connection..." : "Test Connection (Live Ping)"}</span>
              </button>

              {testResult && (
                <div
                  className={`mt-2 p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40"
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/[0.08]">
              {activeExistingItem ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteIntegration}
                    disabled={isDeleting}
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition cursor-pointer"
                    title="Disconnect integration"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                  >
                    {activeExistingItem.status === "active" ? "Pause" : "Resume"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveIntegration}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{activeExistingItem ? "Save Changes" : "Save & Activate"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Upgrade Entitlement Prompt Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-100 dark:border-white/[0.08] shadow-2xl space-y-4 animate-scale-in text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Unlock More Integrations &amp; Workflows
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your current plan ({planDisplayName}) has reached its active integration quota or does not include this connector.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] text-left text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Starter Plan ($19/mo)</span>
                <span className="text-indigo-600 font-bold">2 Slots</span>
              </div>
              <p className="text-[11px] text-slate-500">Pick any 2 connectors (Slack, Gmail, Google Calendar, HubSpot).</p>
              
              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2 flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Growth Plan ($39/mo)</span>
                <span className="text-indigo-600 font-bold">4 Slots</span>
              </div>
              <p className="text-[11px] text-slate-500">Pick any 4 connectors + Shopify 1-click OAuth.</p>

              <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2 flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200">
                <span>Pro Plan (Pay As You Go)</span>
                <span className="text-indigo-600 font-bold">Unlimited</span>
              </div>
              <p className="text-[11px] text-slate-500">All connectors + WhatsApp routing &amp; human handoff.</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer"
              >
                Close
              </button>
              <Link
                href="/dashboard/billing"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.98]"
              >
                View Plans &amp; Upgrade &rarr;
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
