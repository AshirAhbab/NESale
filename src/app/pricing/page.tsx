"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  Check,
  Sparkles,
  ArrowRight,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  Building2,
  Zap,
} from "lucide-react";

const pricingFaqs = [
  {
    q: "How does the 14-day free trial work?",
    a: "You can start using NESale immediately with full access to Growth tier features for 14 days. No credit card is required to sign up. If you choose not to subscribe after 14 days, your store automatically transitions to the Free plan with zero disruption to your store.",
  },
  {
    q: "What counts as a 'conversation'?",
    a: "A conversation is an active shopper session where the customer asks one or more questions. Whether a shopper asks 1 question or 15 questions in the same session to make a buying decision, it counts as a single conversation.",
  },
  {
    q: "What happens if my store exceeds its monthly conversation quota?",
    a: "Your assistant will never suddenly stop converting shoppers. If you reach 90% and 100% of your plan limit, we send you an alert. You can upgrade seamlessly in 1-click or allow affordable volume increments ($5 per additional 500 conversations).",
  },
  {
    q: "Can I install NESale on multiple Shopify stores?",
    a: "Yes! You can connect and manage multiple store domains and catalog indexes within a single Merchant Hub workspace. Each store can have independent branding, primary colors, and AI personas.",
  },
  {
    q: "Can I cancel or switch billing plans at any time?",
    a: "Yes. You can switch between monthly and annual billing, upgrade, or downgrade anytime directly in your Settings > Billing tab. Cancellations take effect at the conclusion of the active paid period.",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Simple, Transparent Pricing
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Invest in Revenue, Not Just Another Chatbot
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Start free with no credit card required. Upgrade as your AI assistant converts more store visitors into paying customers.
            </p>

            {/* Monthly / Annual Billing Toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-[#1e2332] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-5 py-2.5 rounded-xl transition cursor-pointer ${
                  billingPeriod === "monthly"
                    ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`px-5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer ${
                  billingPeriod === "annual"
                    ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-sm font-bold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {/* 1. Free Tier */}
            <div className="bg-white dark:bg-[#11141d] p-7 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">$0</span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Perfect for testing NESale on your personal site or small catalog.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 100 conversations / mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Website URL crawler
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Basic product recommendations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Standard widget embed
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold text-xs text-slate-700 dark:text-slate-200 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Start Free
              </Link>
            </div>

            {/* 2. Starter Tier */}
            <div className="bg-white dark:bg-[#11141d] p-7 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {billingPeriod === "annual" ? "$15" : "$19"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  For growing boutique stores and local shop websites.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 1,000 conversations / mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Full catalog sync & indexing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Lead capture & email alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Custom branding colors
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold text-xs text-slate-700 dark:text-slate-200 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Get Started
              </Link>
            </div>

            {/* 3. Growth Tier (Highlighted) */}
            <div className="bg-white dark:bg-[#11141d] p-7 rounded-3xl border-2 border-indigo-600 relative flex flex-col justify-between shadow-xl shadow-indigo-600/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wide uppercase">
                Most Popular
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Growth
                </span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {billingPeriod === "annual" ? "$31" : "$39"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Deep Shopify integration & fast conversions.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> 5,000 conversations / mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Shopify 1-click OAuth & webhooks
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Add to cart & checkout actions
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Full conversion analytics & ROI
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white text-center min-h-[44px] flex items-center justify-center transition shadow-md shadow-indigo-600/20 active:scale-[0.99]"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* 4. Pro Tier */}
            <div className="bg-white dark:bg-[#11141d] p-7 rounded-3xl border border-slate-200/80 dark:border-white/[0.08] flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pro</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900 dark:text-white">
                    {billingPeriod === "annual" ? "$63" : "$79"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  For high-traffic stores and multi-location merchant teams.
                </p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Unlimited conversations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Human handoff & WhatsApp routing
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Priority vector index queue
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Dedicated account support
                  </li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-2.5 rounded-xl border border-slate-300 dark:border-white/[0.12] hover:bg-slate-50 dark:hover:bg-white/[0.04] font-semibold text-xs text-slate-700 dark:text-slate-200 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>

          {/* Enterprise Custom SLA Banner */}
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 mb-20">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" />
                Enterprise Tier
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Have more than 50,000 monthly store visitors?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                We provide custom vector capacity, custom fine-tuned guardrails, dedicated solution architects, and 99.99% uptime guarantees for Shopify Plus and multi-brand retail groups.
              </p>
            </div>
            <Link
              href="/contact"
              className="px-6 py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-sm transition active:scale-[0.99] shrink-0"
            >
              Talk to Enterprise Sales
            </Link>
          </div>

          {/* Frequently Asked Questions */}
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                FAQ
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
                Frequently Asked Pricing Questions
              </h2>
            </div>

            <div className="space-y-4">
              {pricingFaqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] rounded-2xl overflow-hidden transition"
                >
                  <button
                    type="button"
                    aria-expanded={openFaq === idx}
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full py-4.5 px-6 text-left flex items-center justify-between font-semibold text-slate-900 dark:text-white text-xs sm:text-sm hover:bg-slate-50/70 dark:hover:bg-white/[0.04] transition cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        openFaq === idx ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/40 dark:bg-white/[0.02]">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
