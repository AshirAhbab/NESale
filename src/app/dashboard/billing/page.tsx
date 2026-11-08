"use client";

import React, { useState } from "react";
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
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "starter" | "growth" | "pro">("growth");
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);

  const plans = [
    {
      id: "free" as const,
      name: "Free",
      desc: "For testing NESale",
      priceMonthly: "$0",
      priceAnnual: "$0",
      note: "No credit card needed",
      features: [
        "500 AI conversations",
        "Basic recommendations",
        "Basic analytics",
        "1 store connection",
      ],
      buttonText: "Downgrade",
      isCurrent: selectedPlan === "free",
    },
    {
      id: "starter" as const,
      name: "Starter",
      desc: "For small stores",
      priceMonthly: "$19",
      priceAnnual: "$15",
      note: "Billed monthly via Shopify",
      features: [
        "2,000 AI conversations",
        "Product recommendations",
        "Conversation analytics",
        "Revenue attribution",
        "1 store connection",
      ],
      buttonText: "Switch to Starter",
      isCurrent: selectedPlan === "starter",
    },
    {
      id: "growth" as const,
      name: "Growth",
      desc: "For growing stores",
      priceMonthly: "$39",
      priceAnnual: "$31",
      note: "Billed monthly via Shopify",
      features: [
        "5,000 AI conversations",
        "Advanced recommendations",
        "Revenue attribution",
        "Demand insights",
        "Custom widget styling",
        "Priority email support",
      ],
      buttonText: "Current plan",
      isPopular: true,
      isCurrent: selectedPlan === "growth",
    },
    {
      id: "pro" as const,
      name: "Pro",
      desc: "For high-volume brands",
      priceMonthly: "$79",
      priceAnnual: "$63",
      note: "Billed monthly via Shopify",
      features: [
        "15,000 AI conversations",
        "Multi-agent recommendation logic",
        "Real-time CRM & Zapier sync",
        "Custom zero-hallucination guardrails",
        "Dedicated onboarding specialist",
        "24/7 Priority support SLA",
      ],
      buttonText: "Upgrade to Pro",
      isCurrent: selectedPlan === "pro",
    },
  ];

  const invoices = [
    {
      date: "Oct 4, 2026",
      desc: "Growth Plan — Monthly",
      period: "Oct 4 – Nov 4, 2026",
      amount: "$39.00",
      status: "Paid",
    },
    {
      date: "Sep 4, 2026",
      desc: "Growth Plan — Monthly",
      period: "Sep 4 – Oct 4, 2026",
      amount: "$39.00",
      status: "Paid",
    },
    {
      date: "Aug 4, 2026",
      desc: "Starter Plan — Monthly",
      period: "Aug 4 – Sep 4, 2026",
      amount: "$19.00",
      status: "Paid",
    },
  ];

  const handlePlanSelect = (planId: "free" | "starter" | "growth" | "pro") => {
    setIsUpgrading(planId);
    setTimeout(() => {
      setSelectedPlan(planId);
      setIsUpgrading(null);
      toast.success(
        `Plan updated to ${planId.toUpperCase()}! Shopify recurring application charge updated.`
      );
    }, 800);
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
              Shopify App Billing Synced
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40">
              Active Subscription
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your NESale recurring plan and real-time usage telemetry.
          </p>
        </div>
      </div>

      {/* Current Active Plan Card */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white capitalize">
                {selectedPlan} Plan{" "}
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  / {selectedPlan === "pro" ? "$79" : selectedPlan === "starter" ? "$19" : selectedPlan === "free" ? "$0" : "$39"} mo
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                ● ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              For stores scaling real-time conversational sales &amp; automated checkout.
            </p>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
              <span>🕒 Next billing cycle:</span>
              <strong className="text-slate-700 dark:text-slate-300">November 4, 2026</strong>
              <span>(Billed via Shopify App Subscription)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toast.info("Shopify App Subscription management portal opened.")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-[#171b26] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-semibold transition active:scale-[0.99] cursor-pointer min-h-[44px]"
            >
              <span>Manage subscription</span>
            </button>
            <a
              href="https://admin.shopify.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <span>Update payment method</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 3 Telemetry Usage Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Card 1: AI Conversations */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px]">AI Conversations</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Resets in 11d</span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              2,847 <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/ 5,000</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
              <div className="w-[57%] h-full bg-indigo-600 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>57% quota utilized</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">2,153 left</span>
            </div>
          </div>

          {/* Card 2: AI-Attributed Revenue */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px]">AI-Attributed Revenue</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                📈 +24.8%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              $18,420 <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">this cycle</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              <strong>384 purchases</strong> generated autonomously via conversational assistant.
            </p>
          </div>

          {/* Card 3: Products Synced */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px]">Products Synced</span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                <Check className="w-3 h-3" />
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              1,284 <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">/ 5,000</span>
            </div>
            <div className="w-full h-2 bg-slate-200 dark:bg-white/[0.1] rounded-full overflow-hidden">
              <div className="w-[26%] h-full bg-emerald-500 rounded-full"></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>26% catalog quota</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Synced 4m ago</span>
            </div>
          </div>
        </div>

        {/* ROI Callout Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Your <strong>{selectedPlan} plan</strong> has unlocked <strong>472× ROI</strong> based on{" "}
              <strong>$18,420</strong> in direct attributed revenue this billing cycle.
            </span>
          </div>
          <Link
            href="/dashboard/analytics"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0"
          >
            <span>View conversion analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Choose your plan Section */}
      <div className="space-y-5 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Choose your plan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scale your conversational AI as your store grows. Upgrade or downgrade instantly.
            </p>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-[#171b26] p-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 self-start sm:self-center border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer min-h-[36px] ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs font-bold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 min-h-[36px] ${
                billingCycle === "annual"
                  ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs font-bold"
                  : "hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annual</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => {
            const price = billingCycle === "monthly" ? p.priceMonthly : p.priceAnnual;
            return (
              <div
                key={p.id}
                className={`rounded-3xl p-6 border transition flex flex-col justify-between relative ${
                  p.isPopular
                    ? "border-indigo-600 bg-white dark:bg-[#11141d] ring-2 ring-indigo-600/10 shadow-lg"
                    : "border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] shadow-2xs hover:shadow-sm"
                }`}
              >
                {/* Popular & Your Plan Badges */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  {p.isPopular && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white uppercase tracking-wider">
                      Most popular
                    </span>
                  )}
                  {p.isCurrent && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/40 ml-auto">
                      Your plan
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
                      <span className="text-xs text-slate-400 dark:text-slate-500">/mo</span>
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
                        ? "bg-indigo-600 text-white cursor-default"
                        : p.isPopular
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                        : "bg-slate-100 dark:bg-[#171b26] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {isUpgrading === p.id && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{p.isCurrent ? "✓ Current plan" : p.buttonText}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          🔒 Plans can be changed or cancelled at any time. Prorated charges are handled seamlessly through your Shopify billing account.
        </p>
      </div>

      {/* Usage & Billing History */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Usage &amp; billing history</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Invoices processed automatically through Shopify App Billing.
          </p>
        </div>

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
              {invoices.map((inv, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
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
                    <button
                      type="button"
                      onClick={() => toast.success(`Downloading PDF receipt for ${inv.date}`)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition cursor-pointer min-h-[44px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enterprise SLA Banner */}
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
