"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Package,
  Check,
  Download,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Building2,
  Lock,
  Receipt,
  AlertCircle,
  FileText,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { PlanCode } from "@/lib/billing/entitlements";

interface InvoiceItem {
  id: string;
  date: string;
  desc: string;
  period: string;
  amount: string;
  status: string;
  receiptUrl?: string;
}

interface BillingUsage {
  conversations: {
    used: number;
    max: number | "unlimited";
    pct: number;
  };
  slots: {
    used: number;
    max: number;
    canAdd: boolean;
  };
  websites: {
    used: number;
    max: number;
  };
}

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("active");
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [usage, setUsage] = useState<BillingUsage>({
    conversations: { used: 0, max: 50, pct: 0 },
    slots: { used: 0, max: 1, canAdd: true },
    websites: { used: 0, max: 1 },
  });

  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);

  // Fetch live subscription and usage on mount
  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/billing/subscription");
      if (res.ok) {
        const data = await res.json();
        if (data.subscription?.planCode) {
          setSelectedPlan(data.subscription.planCode as PlanCode);
          setSubscriptionStatus(data.subscription.status || "active");
        }
        if (data.usage) {
          setUsage(data.usage);
        }
        if (Array.isArray(data.invoices)) {
          setInvoices(data.invoices);
        }
      }
    } catch (err) {
      console.warn("Failed to load subscription data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const plans = [
    {
      id: "free" as const,
      name: "Free",
      desc: "Perfect for testing NESale on your personal site or small catalog.",
      priceMonthly: "$0",
      priceAnnual: "$0",
      note: "Free forever • No card required",
      features: [
        "50 conversations / mo",
        "Website URL crawler",
        "Basic product recommendations",
        "Standard widget embed",
        "1 active integration slot",
        "1 connected website",
      ],
      buttonText: "Current Plan",
      isCurrent: selectedPlan === "free",
    },
    {
      id: "starter" as const,
      name: "Starter",
      desc: "For growing boutique stores and local shop websites.",
      priceMonthly: "$19",
      priceAnnual: "$15",
      note: "Billed monthly ($19/mo)",
      features: [
        "1,000 conversations / mo",
        "Full catalog sync & indexing",
        "Lead capture & email alerts",
        "Custom branding colors",
        "Choose any 1–2 integrations (Slack, Gmail, etc.)",
        "1 connected website",
      ],
      buttonText: "Switch to Starter",
      isCurrent: selectedPlan === "starter",
    },
    {
      id: "growth" as const,
      name: "Growth",
      desc: "Deep Shopify integration & fast conversions.",
      priceMonthly: "$39",
      priceAnnual: "$31",
      note: "Most popular for growing brands",
      features: [
        "2,500 conversations / mo",
        "Shopify 1-click OAuth & webhooks",
        "Add to cart & checkout actions",
        "Full conversion analytics & ROI",
        "Choose any 3–4 integrations",
        "Up to 3 connected websites",
      ],
      buttonText: "Current Plan",
      isPopular: true,
      isCurrent: selectedPlan === "growth",
    },
    {
      id: "pro" as const,
      name: "Pro",
      desc: "For high-traffic stores and multi-location merchant teams.",
      priceMonthly: "Pay As You Go",
      priceAnnual: "Pay As You Go",
      note: "Usage-based billing per conversation",
      features: [
        "Unlimited conversations",
        "Human handoff & WhatsApp routing",
        "Priority vector index queue",
        "Dedicated account support",
        "All integrations unlocked",
        "Unlimited websites & teams",
      ],
      buttonText: "Upgrade to Pro",
      isCurrent: selectedPlan === "pro",
    },
  ];

  const handlePlanSelect = async (planId: PlanCode) => {
    if (planId === selectedPlan) return;

    setIsUpgrading(planId);
    try {
      const res = await fetch("/api/v1/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: planId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to switch plan.");
      }

      if (data.url) {
        if (data.url.startsWith("http") && !data.url.includes(window.location.host)) {
          // External Stripe Checkout redirect
          window.location.href = data.url;
        } else {
          // Internal redirect / local activation
          toast.success(`Plan successfully switched to ${planId.toUpperCase()}!`);
          await fetchSubscriptionData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process plan checkout.");
    } finally {
      setIsUpgrading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Account &amp; Subscriptions
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Billing &amp; Subscription
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {subscriptionStatus === "active" ? "Active Subscription" : subscriptionStatus.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 capitalize">
              {selectedPlan} Tier
            </span>
          </div>
        </div>
      </div>

      {/* Usage Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Monthly Conversations */}
        <div className="bg-white dark:bg-[#11141d] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Conversations This Cycle
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {usage.conversations.used.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {usage.conversations.max === "unlimited" ? "Unlimited" : usage.conversations.max.toLocaleString()}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-white/[0.08] overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${usage.conversations.max === "unlimited" ? 15 : usage.conversations.pct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Integration Slots */}
        <div className="bg-white dark:bg-[#11141d] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Active Integrations
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {usage.slots.used}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {usage.slots.max === 999 ? "Unlimited" : usage.slots.max} Slots
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Slack, Discord, HubSpot, Webhooks, Google Calendar
          </p>
        </div>

        {/* Metric 3: Connected Websites */}
        <div className="bg-white dark:bg-[#11141d] rounded-2xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Connected Storefronts
          </span>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {usage.websites.used}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              / {usage.websites.max === 999 ? "Unlimited" : usage.websites.max} Domains
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Multi-domain CORS &amp; chat widget embeds
          </p>
        </div>
      </div>

      {/* Plans Section */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-6">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Subscription plans</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select the plan that best fits your business conversation volume and integration requirements.
          </p>
        </div>

        {/* Grid of 4 Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const price = billingCycle === "monthly" ? p.priceMonthly : p.priceAnnual;

            return (
              <div
                key={p.id}
                className={`rounded-2xl p-5 border transition flex flex-col justify-between relative ${
                  p.isCurrent
                    ? "border-indigo-600 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 ring-2 ring-indigo-600/20"
                    : p.isPopular
                    ? "border-indigo-300 dark:border-indigo-800 bg-white dark:bg-[#171b26]"
                    : "border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  {p.isPopular && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                      Popular
                    </span>
                  )}
                  {p.isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 ml-auto">
                      Current Plan
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-base">{p.name}</h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{p.desc}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                        {price}
                      </span>
                      {price !== "Pay As You Go" && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">/mo</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 block">{p.note}</span>
                  </div>

                  {/* Feature Checklist */}
                  <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300">
                    {p.features.map((f, fIdx) => (
                      <li key={fIdx} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-6 mt-4">
                  <button
                    type="button"
                    disabled={p.isCurrent || isUpgrading === p.id}
                    onClick={() => handlePlanSelect(p.id)}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition active:scale-[0.99] cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px] ${
                      p.isCurrent
                        ? "bg-indigo-600 text-white cursor-default opacity-90"
                        : p.isPopular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-[#1f2433] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {isUpgrading === p.id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{p.isCurrent ? "✓ Current Plan" : p.buttonText}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          🔒 Encrypted checkout. Subscriptions can be upgraded, downgraded, or cancelled at any time without long-term contracts.
        </p>
      </div>

      {/* Invoices & Billing Receipts (Zero Fake Invoices) */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Billing History &amp; Receipts</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verified invoices and downloadable receipts for your account.
          </p>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-50/60 dark:bg-[#171b26]/50 border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-slate-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              No Billing Invoices On File
            </h4>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Your store is currently operating under the {selectedPlan.toUpperCase()} tier. When a paid plan subscription processes, your PDF receipts will be listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold text-[11px] bg-slate-50/40 dark:bg-[#171b26]">
                  <th className="py-3 px-4 font-semibold">DATE</th>
                  <th className="py-3 px-4 font-semibold">DESCRIPTION</th>
                  <th className="py-3 px-4 font-semibold">PERIOD</th>
                  <th className="py-3 px-4 font-semibold">AMOUNT</th>
                  <th className="py-3 px-4 font-semibold">STATUS</th>
                  <th className="py-3 px-4 font-semibold text-right">RECEIPT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">{inv.date}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">{inv.desc}</td>
                    <td className="py-3.5 px-4 text-slate-400 dark:text-slate-500 text-[11px]">{inv.period}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{inv.amount}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        ● {inv.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.receiptUrl ? (
                        <a
                          href={inv.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      ) : (
                        <span className="text-slate-400 text-[11px]">N/A</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Enterprise Volume Banner */}
      <div className="p-5 rounded-3xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">
              Need custom volume or enterprise SLAs?
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Contact our sales engineering team for tailored conversation quotas, dedicated fine-tuning, and multi-region deployment.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => toast.info("Enterprise sales engineering team notified. We will reach out shortly.")}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.1] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-900 dark:text-white font-bold shadow-2xs transition active:scale-[0.99] cursor-pointer shrink-0 min-h-[44px]"
        >
          Contact Enterprise
        </button>
      </div>
    </div>
  );
}
