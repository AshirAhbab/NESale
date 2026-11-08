"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  Check,
  Zap,
  XCircle,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Bot,
  ShieldCheck,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [cartState, setCartState] = useState<{ id: string; name: string; price: string } | null>(null);

  const faqs = [
    {
      q: "Does NESale invent or hallucinate product prices and availability?",
      a: "Never. NESale enforces hard data-grounding rules. Exact prices, variant inventory, and stock levels are queried directly from your structured catalog database. The AI model is strictly prohibited from guessing or fabricating pricing."
    },
    {
      q: "How does the Shopify integration work?",
      a: "Connecting takes less than 60 seconds via Shopify OAuth. NESale automatically syncs your products, descriptions, variants, options, and images, and subscribes to real-time webhooks so inventory is always up-to-date."
    },
    {
      q: "Can I use NESale if I run a service or appointment business instead of a store?",
      a: "Yes! NESale has built-in support for service menus, booking URLs (Calendly, Cal.com), lead capture forms, and direct WhatsApp/phone call actions tailored for salons, clinics, agencies, and contractors."
    },
    {
      q: "How do I embed the chat assistant onto my website?",
      a: "Simply paste a single lightweight script tag into your website's header or use our Shopify App embed toggle. No coding or complex configuration required."
    },
    {
      q: "What happens when a customer asks a question the AI cannot answer?",
      a: "NESale politely explains that the information is currently unavailable and offers an immediate fallback action—such as capturing the customer's contact details or handing off to human support."
    }
  ];

  const handleAddToCart = (id: string, name: string, price: string) => {
    setCartState({ id, name, price });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-300">
      {/* 1. Shared Unified Header / Navbar */}
      <MarketingHeader />

      {/* 2. Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-slate-50/60 to-white dark:from-[#11141d] dark:to-[#090a0f]">
        <div className="max-w-5xl mx-auto text-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            NEXT-GEN COMMERCE AGENT
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
            Turn Customer Questions <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Into Direct Sales
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            An action-oriented AI employee that answers questions, recommends products, qualifies leads, and closes sales 24/7 on your website.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-base shadow-lg shadow-indigo-600/25 transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Start Free for 14 Days</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#preview"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-base shadow-sm transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Live Interactive Demo</span>
            </a>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-600" /> No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" /> 2-minute setup
            </span>
            <span className="flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-slate-400" /> Cancel anytime
            </span>
          </div>

          {/* Interactive Hero Widget Preview */}
          <div id="preview" className="mt-14 max-w-4xl mx-auto bg-slate-900 rounded-3xl p-3 shadow-2xl border border-slate-800">
            {/* Fake browser bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-800/80 rounded-t-2xl text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="px-6 py-1 rounded-md bg-slate-900 text-slate-300 text-[11px] font-mono border border-slate-700/60">
                https://store.nordikgear.com
              </div>
              <div className="w-12"></div>
            </div>

            {/* Browser Content Area */}
            <div className="bg-slate-50 rounded-b-2xl p-6 sm:p-8 text-left text-slate-900 min-h-[480px] flex flex-col justify-between">
              <div className="space-y-4 max-w-2xl">
                {/* User Bubble */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="bg-indigo-600 text-white text-sm py-2.5 px-4 rounded-2xl rounded-tr-sm shadow-sm max-w-md">
                    Looking for a durable waterproof backpack for weekend hikes under $150.
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                    U
                  </div>
                </div>

                {/* AI Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    S
                  </div>
                  <div className="space-y-3 max-w-xl">
                    <div className="bg-white border border-slate-200 text-sm text-slate-800 py-3 px-4 rounded-2xl rounded-tl-sm shadow-sm">
                      I found 2 top-rated waterproof backpacks matching your criteria:
                    </div>

                    {/* Product Cards Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Card 1 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-indigo-300 transition">
                        <div className="h-32 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mb-2.5 relative">
                          <ShoppingBag className="w-12 h-12 text-slate-300" />
                          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            In Stock
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-900 truncate">
                          Nordik Trailpack 30L Pro
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-sm text-indigo-600">$129.00</span>
                          <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-0.5">
                            ★ 4.9 (128)
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddToCart("item-1", "Nordik Trailpack 30L Pro", "$129.00")}
                          className={`w-full mt-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.99] cursor-pointer ${
                            cartState?.id === "item-1"
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {cartState?.id === "item-1" ? "Added to Cart ✓" : "Add to Cart"}
                        </button>
                      </div>

                      {/* Card 2 */}
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-indigo-300 transition">
                        <div className="h-32 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden mb-2.5 relative">
                          <ShoppingBag className="w-12 h-12 text-slate-300" />
                          <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            In Stock
                          </span>
                        </div>
                        <h4 className="font-semibold text-xs text-slate-900 truncate">
                          Alpine Drybag 25L Commuter
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="font-bold text-sm text-indigo-600">$89.00</span>
                          <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-0.5">
                            ★ 4.8 (94)
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddToCart("item-2", "Alpine Drybag 25L Commuter", "$89.00")}
                          className={`w-full mt-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-[0.99] cursor-pointer ${
                            cartState?.id === "item-2"
                              ? "bg-emerald-600 text-white"
                              : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          }`}
                        >
                          {cartState?.id === "item-2" ? "Added to Cart ✓" : "Add to Cart"}
                        </button>
                      </div>
                    </div>

                    {/* Interactive Action Response Toast */}
                    {cartState && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 transition-all animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>
                            <strong>{cartState.name}</strong> added to cart ({cartState.price})
                          </span>
                        </div>
                        <Link
                          href="/register"
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                        >
                          Checkout Now &rarr;
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chat action bar */}
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 gap-2">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Exact prices verified against database catalog
                </span>
                <span className="font-medium text-indigo-600">
                  Try clicking &quot;Add to Cart&quot; above to see real-time action handling
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Core Feature Pillars */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-100 dark:border-white/[0.08] bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Engineered for Conversions
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Turn Abandoned Carts & Search Straight into Shopping
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Shoppers leave when they cannot quickly find answers. NESale acts as your highest-performing sales rep.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-14">
            {/* Card 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition hover:shadow-card">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Instant Product Matching</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Combines structured database filters (exact pricing, variant availability, sizes) with vector embeddings to recommend exactly what your customer needs.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition hover:shadow-card">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Conversational Checkout</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Directly triggers action buttons in the chat drawer—from adding items to cart, opening checkout URLs, to scheduling service bookings.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-indigo-300 transition hover:shadow-card">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Zero Hallucinations</h3>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                Hard grounding rules ensure prices, policies, and stock are strictly factual. If information is missing, it captures the lead and hands off to human support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Journey Pipeline */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/50 border-t border-slate-100 dark:bg-[#171b26] dark:border-white/[0.08]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Full Funnel Automation
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              From Question to Purchase
            </h2>
            <p className="mt-3 text-base text-slate-600">
              A frictionless customer experience that drives measurable sales.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-14">
            {[
              { step: "01", title: "Visitor Lands", desc: "Shopper opens your website or Shopify store." },
              { step: "02", title: "Asks Question", desc: "Customer queries about sizing, materials, or recommendations." },
              { step: "03", title: "Hybrid Search", desc: "NESale queries both live database & knowledge base." },
              { step: "04", title: "Action Card", desc: "Displays rich interactive product cards & buy actions." },
              { step: "05", title: "Conversion", desc: "Item added to cart, lead recorded, or booking finalized." },
            ].map((s, idx) => (
              <div
                key={idx}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden"
              >
                <span className="text-3xl font-black text-indigo-100">{s.step}</span>
                <h4 className="font-bold text-base text-slate-900 mt-2">{s.title}</h4>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Analytics Dashboard Preview */}
      <section id="analytics" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Real Impact
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              See Exactly What Your AI Is Driving
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Track conversion outcomes, revenue influence, and customer conversations in real-time.
            </p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">AI-Assisted Conversions</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">2,847</div>
              <span className="text-xs font-semibold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
                +24.8% vs last month
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Qualified Leads Captured</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">1,264</div>
              <span className="text-xs font-semibold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
                +18.2% vs last month
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">Add-to-Cart Conversion</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">+48%</div>
              <span className="text-xs font-semibold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
                High shopper engagement
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-xs font-medium text-indigo-700">AI-Assisted Revenue</span>
              <div className="text-3xl font-extrabold text-indigo-900 mt-1">$68,420</div>
              <span className="text-xs font-semibold text-emerald-600 mt-1 inline-flex items-center gap-0.5">
                +31.5% this quarter
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Pricing Section (Matches spec exact tiers) */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/60 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Simple Pricing for Stores of Every Size
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Start free today and scale as your AI assistant converts more visitors into customers.
            </p>

            {/* Monthly / Annual toggle */}
            <div className="mt-8 inline-flex items-center p-1 rounded-2xl bg-slate-200/80 dark:bg-[#1e2332] text-xs font-semibold">
              <button
                type="button"
                onClick={() => setBillingPeriod("monthly")}
                className={`px-4 py-2.5 rounded-xl transition cursor-pointer min-h-[44px] flex items-center justify-center ${
                  billingPeriod === "monthly" ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingPeriod("annual")}
                className={`px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer min-h-[44px] justify-center ${
                  billingPeriod === "annual" ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-sm font-bold" : "text-slate-600 dark:text-slate-400"
                }`}
              >
                <span>Annual Billing</span>
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-14">
            {/* Free Tier */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Free</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">$0</span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Perfect for trying out NESale on your site.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> 100 conversations / mo</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Website URL crawler</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Basic product recommendations</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Standard widget embed</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 hover:border-slate-400 font-semibold text-xs text-slate-700 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Start Free
              </Link>
            </div>

            {/* Starter Tier */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Starter</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    {billingPeriod === "annual" ? "$15" : "$19"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {billingPeriod === "annual" ? "Billed annually ($180/yr)" : "Billed monthly"}
                </p>
                <p className="text-xs text-slate-500 mt-2">For growing online businesses and local shops.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> 1,000 conversations / mo</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Full catalog sync & indexing</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Lead capture & email alerts</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Custom branding colors</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 hover:border-slate-400 font-semibold text-xs text-slate-700 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Get Started
              </Link>
            </div>

            {/* Growth Tier (Highlighted) */}
            <div className="bg-white p-7 rounded-2xl border-2 border-indigo-600 relative flex flex-col justify-between shadow-xl shadow-indigo-600/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold tracking-wide uppercase">
                Most Popular
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Growth</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    {billingPeriod === "annual" ? "$31" : "$39"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {billingPeriod === "annual" ? "Billed annually ($372/yr)" : "Billed monthly"}
                </p>
                <p className="text-xs text-slate-500 mt-2">Deep Shopify integration & fast conversions.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> 5,000 conversations / mo</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Shopify 1-click OAuth & webhooks</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Add to cart & checkout actions</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Full conversion analytics & ROI</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-xs text-white text-center min-h-[44px] flex items-center justify-center transition shadow-md shadow-indigo-600/20 active:scale-[0.99]"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pro</span>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">
                    {billingPeriod === "annual" ? "$63" : "$79"}
                  </span>
                  <span className="text-xs text-slate-500">/mo</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {billingPeriod === "annual" ? "Billed annually ($756/yr)" : "Billed monthly"}
                </p>
                <p className="text-xs text-slate-500 mt-2">For high-traffic stores and multi-location teams.</p>
                <ul className="mt-6 space-y-3 text-xs text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Unlimited conversations</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Human handoff & WhatsApp routing</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Priority vector index queue</li>
                  <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600" /> Dedicated account support</li>
                </ul>
              </div>
              <Link
                href="/register"
                className="mt-8 w-full py-3 rounded-xl border border-slate-300 hover:border-slate-400 font-semibold text-xs text-slate-700 text-center min-h-[44px] flex items-center justify-center transition active:scale-[0.99]"
              >
                Upgrade to Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-t border-slate-100 dark:border-white/[0.08]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
              Got Questions?
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-4 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Everything you need to know about the NESale platform and integration.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  type="button"
                  aria-expanded={openFaq === idx}
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full py-4.5 px-6 text-left flex items-center justify-between font-semibold text-slate-900 text-sm sm:text-base hover:bg-slate-50/70 transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      openFaq === idx ? "rotate-180 text-indigo-600" : ""
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA Banner */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            Ready to turn more conversations into sales?
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
            Install NESale in under 2 minutes and watch your autonomous AI shopping assistant convert visitors right away.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition active:scale-[0.99] flex items-center justify-center"
            >
              Log In to Merchant Hub
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Shared Footer */}
      <AuthFooter />

      {/* 10. Live Floating Shopper Assistant Widget */}
      <ShopperWidget />
    </div>
  );
}
