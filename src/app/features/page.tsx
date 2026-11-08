"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  Sparkles,
  Database,
  ShoppingBag,
  BarChart3,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

interface Pillar {
  id: string;
  badge: string;
  tabTitle: string;
  title: string;
  description: string;
  icon: React.ElementType;
  gradient: string;
  bullets: string[];
  mockType: "cart" | "rag" | "shopify" | "routing" | "analytics";
}

const pillars: Pillar[] = [
  {
    id: "commerce",
    badge: "Conversational Commerce",
    tabTitle: "1-Click Cart & Checkout",
    title: "Convert Curious Visitors into Paying Customers Inside the Chat Drawer",
    description:
      "Unlike ordinary Q&A bots that merely paste plain text, NESale transforms conversations into autonomous transactions. Shoppers ask for product recommendations by budget, size, or style, inspect live product cards with variant dropdowns, and add items directly to their Shopify cart without bouncing from the page.",
    icon: ShoppingBag,
    gradient: "from-indigo-600 to-blue-600",
    bullets: [
      "Dynamic interactive product cards with high-resolution imagery and live price tags",
      "Direct Shopify cart injection via Storefront API with zero storefront redirects",
      "One-click pre-filled checkout link generation for instant impulsive purchasing",
      "Variant awareness: intelligent size, color, and material recommendations",
    ],
    mockType: "cart",
  },
  {
    id: "rag",
    badge: "AI Core & RAG Guardrails",
    tabTitle: "Zero-Hallucination RAG",
    title: "Strict Separation of Structured Catalog Truth from Semantic Knowledge",
    description:
      "Generic LLMs frequently hallucinate fake coupon codes, outdated pricing, or phantom inventory. NESale is engineered with a strict two-layer architecture: real-time SQL inventory data serves as immutable truth, while semantic vector embeddings handle store policies and return rules. If a detail is unverified, NESale admits it and captures a lead.",
    icon: Database,
    gradient: "from-blue-600 to-cyan-600",
    bullets: [
      "Sub-second vector retrieval powered by PostgreSQL and pgvector embeddings",
      "Deterministic SQL inventory and price matching that cannot be overridden by prompts",
      "Defensive prompt firewall against prompt injections and jailbreak attempts",
      "Smart fallback: graceful escalation to lead capture or live agent handoff",
    ],
    mockType: "rag",
  },
  {
    id: "shopify",
    badge: "Shopify 2.0 Integration",
    tabTitle: "Native Shopify Sync",
    title: "Zero-Code 2-Minute Setup with Automatic Real-Time Webhooks",
    description:
      "Connect your store with 1-click Shopify OAuth. NESale installs cleanly as a native Shopify 2.0 Theme App Extension—never touching or cluttering your theme code. Our resilient webhook listener syncs catalog updates, inventory decrements, and price alterations in sub-second timeframes.",
    icon: RefreshCw,
    gradient: "from-emerald-600 to-teal-600",
    bullets: [
      "Real-time catalog webhooks: product additions, edits, and deletions auto-synced",
      "Shopify 2.0 Theme App Extension: toggle on/off directly in your Shopify Theme Editor",
      "Automated order status self-service: shoppers lookup orders with Order # and email",
      "Multi-currency pricing and 40+ automatically localized customer languages",
    ],
    mockType: "shopify",
  },
  {
    id: "routing",
    badge: "Lead Capture & Escalation",
    tabTitle: "Smart Handoff & WhatsApp",
    title: "Route High-Intent Shoppers to WhatsApp, Phone Callbacks, or Live Agents",
    description:
      "When a shopper exhibits high buying intent or requests custom wholesale assistance, NESale immediately qualifies the lead, collects verified contact details, and triggers instant notifications or 1-tap WhatsApp handoffs with the complete conversational context attached.",
    icon: PhoneCall,
    gradient: "from-amber-600 to-rose-600",
    bullets: [
      "Configurable lead qualification triggers: budget, timeline, and purchase intention",
      "Instant 1-tap WhatsApp routing pre-populated with shopping intent and item links",
      "Automated phone callback scheduling for high-ticket service bookings",
      "Direct integration with Klaviyo, webhooks, and merchant email alerts",
    ],
    mockType: "routing",
  },
  {
    id: "analytics",
    badge: "Merchant Intelligence",
    tabTitle: "Revenue & Demand Telemetry",
    title: "Real-Time Revenue Attribution & Unmet Customer Demand Discovery",
    description:
      "Get complete visibility into how your AI employee drives bottom-line merchant value. Track exact assisted GMV, add-to-cart conversion lifts, and discover unmet demand signals—identifying the exact products, sizes, or variants your shoppers wanted that you don't currently stock.",
    icon: BarChart3,
    gradient: "from-purple-600 to-indigo-600",
    bullets: [
      "Precise AI-assisted conversion lift tracking and direct revenue attribution telemetry",
      "Unmet Demand Discovery: aggregate queries for missing stock to guide restocking",
      "Conversation intent clustering: understand what questions shoppers ask before buying",
      "Automated weekly executive performance digest delivered directly to your inbox",
    ],
    mockType: "analytics",
  },
];

const featureMatrix = [
  {
    category: "Conversational Commerce",
    icon: ShoppingBag,
    features: [
      {
        name: "1-Click Cart Injection",
        desc: "Adds items directly into the Shopify cart via Storefront API without page reload.",
        badge: "Core",
      },
      {
        name: "Dynamic Product Cards",
        desc: "Rich UI cards featuring real-time prices, variant pills, and high-res imagery.",
        badge: "Core",
      },
      {
        name: "Direct Checkout Links",
        desc: "Generates pre-filled Shopify checkout sessions for immediate conversion.",
        badge: "Core",
      },
      {
        name: "Order Tracking Self-Service",
        desc: "Shoppers verify order status and tracking URLs safely with Order # and Email.",
        badge: "Included",
      },
      {
        name: "Multi-Variant Matching",
        desc: "Intelligently suggests sizes, colors, and bundles matching customer prompts.",
        badge: "Included",
      },
      {
        name: "Cart Abandonment Recovery",
        desc: "Contextual nudge triggers when shoppers hesitate at high cart values.",
        badge: "Growth",
      },
    ],
  },
  {
    category: "AI Core & Grounding Guardrails",
    icon: Database,
    features: [
      {
        name: "Dual-Layer Grounded RAG",
        desc: "Separates SQL database truth (prices, stock) from semantic vector documents.",
        badge: "Patented",
      },
      {
        name: "Zero Hallucination Guarantee",
        desc: "Never invents fake discount codes, wrong dimensions, or phantom items.",
        badge: "Core",
      },
      {
        name: "Prompt Injection Firewall",
        desc: "Multi-stage token scanner preventing adversarial bypasses and system prompt leaks.",
        badge: "Security",
      },
      {
        name: "Sub-18ms pgvector Search",
        desc: "High-performance hybrid vector retrieval across catalog collections.",
        badge: "Performance",
      },
      {
        name: "Brand Persona Customization",
        desc: "Tailor the AI tone of voice: professional, friendly, luxury, or witty.",
        badge: "Core",
      },
      {
        name: "Automatic Knowledge Crawler",
        desc: "Crawls your store FAQ, return policy, and shipping pages in 1 click.",
        badge: "Included",
      },
    ],
  },
  {
    category: "Shopify Ecosystem & Integrations",
    icon: RefreshCw,
    features: [
      {
        name: "Shopify 2.0 App Embed",
        desc: "Native theme embed. Enable or disable directly from Shopify Theme Editor.",
        badge: "Native",
      },
      {
        name: "Real-Time Webhook Sync",
        desc: "Instant catalog updates whenever products, variants, or prices change.",
        badge: "Real-time",
      },
      {
        name: "Multi-Currency & FX",
        desc: "Automatically adapts currency symbols and localized pricing per shopper region.",
        badge: "Global",
      },
      {
        name: "40+ Language Auto-Detect",
        desc: "Detects visitor language seamlessly and replies fluently in native tongue.",
        badge: "Global",
      },
      {
        name: "WhatsApp Click-to-Chat",
        desc: "1-tap escalation to merchant WhatsApp with conversation summary pre-filled.",
        badge: "Growth",
      },
      {
        name: "Klaviyo & Webhook Export",
        desc: "Streams captured leads directly into email campaigns and external CRMs.",
        badge: "Growth",
      },
    ],
  },
  {
    category: "Widget UX & Merchant Controls",
    icon: SlidersHorizontal,
    features: [
      {
        name: "Ultra-Lightweight (<40kb)",
        desc: "Asynchronous loading bundle that delivers perfect 100 Lighthouse speed scores.",
        badge: "Speed",
      },
      {
        name: "Mobile Bottom-Sheet Drawer",
        desc: "Native mobile ergonomics with gesture dismiss and full-width touch targets.",
        badge: "Mobile",
      },
      {
        name: "Custom Merchant Styling",
        desc: "Match your store's exact brand color palette, fonts, launcher shape, and avatar.",
        badge: "Custom",
      },
      {
        name: "Unmet Demand Telemetry",
        desc: "Discover products shoppers asked for that you don't currently have in inventory.",
        badge: "Analytics",
      },
      {
        name: "Revenue Attribution Ledger",
        desc: "Correlates converted orders to assisted sessions with verifiable GMV lift.",
        badge: "Analytics",
      },
      {
        name: "Role-Based Team Access",
        desc: "Granular permissions for store managers, support agents, and billing owners.",
        badge: "Scale",
      },
    ],
  },
];

const faqs = [
  {
    q: "How does NESale guarantee zero hallucinations on pricing and coupons?",
    a: "NESale uses a dual-engine architecture. When a shopper inquires about prices, discounts, or stock, the AI does not generate numbers from LLM memory. Instead, it queries the deterministic PostgreSQL database synchronized directly with your Shopify catalog. If an item or coupon does not exist in your database, the AI explicitly states it and offers to connect with human support.",
  },
  {
    q: "Will installing the widget slow down my Shopify store's page load speed?",
    a: "No. The NESale widget bundle is strictly under 40kb gzipped and loads asynchronously via Shopify 2.0 Theme App Extension. It executes only after the browser has finished rendering critical storefront assets, guaranteeing zero impact on your Core Web Vitals or Google Lighthouse score.",
  },
  {
    q: "What happens when a shopper asks a question the AI doesn't know?",
    a: "NESale never gives vague or made-up answers. When confidence falls below 95%, the assistant gracefully admits it and offers two immediate paths: collecting the shopper's email/phone for a guaranteed human response, or opening a 1-tap WhatsApp conversation with the store team.",
  },
  {
    q: "Can I customize the assistant to match our brand's voice and colors?",
    a: "Yes. From the Merchant Hub dashboard, you can configure the primary brand hex color, custom launcher icon, welcome greeting, suggested starter questions, and the AI's persona (from relaxed and playful to authoritative luxury).",
  },
  {
    q: "How does order status lookup protect customer privacy?",
    a: "Order lookup requires double verification: both the Shopify Order Number (e.g., #1042) and the corresponding customer email address. The assistant verifies these against your Shopify Admin API before displaying tracking details, preventing unauthorized tracking disclosures.",
  },
];

export default function FeaturesPage() {
  const [activePillar, setActivePillar] = useState<string>("commerce");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [cartCount, setCartCount] = useState<number>(0);
  const [cartToast, setCartToast] = useState<string | null>(null);

  const selectedPillar = pillars.find((p) => p.id === activePillar) || pillars[0];

  const handleSimulateCart = (productName: string) => {
    setCartCount((prev) => prev + 1);
    setCartToast(`Added "${productName}" to cart!`);
    setTimeout(() => setCartToast(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative pt-16 sm:pt-24 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle Ambient Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[480px] bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10"></div>

          <div className="max-w-5xl mx-auto text-center relative z-10">
            {/* Pill Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>The Autonomous AI Sales Engine</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.12]">
              Engineered to Turn Browsers into Buyers with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600">
                Verifiable Commerce Truth
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              NESale connects cutting-edge conversational AI directly to your live Shopify catalog. From grounded product recommendations to 1-click cart injection and revenue telemetry—everything built to scale conversions.
            </p>

            {/* Action Buttons */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition active:scale-[0.99] flex items-center gap-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="px-7 py-3.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200 font-semibold text-sm transition active:scale-[0.99] shadow-sm"
              >
                <span>View Plans & Pricing</span>
              </Link>
            </div>

            {/* Metric Highlights Strip */}
            <div className="mt-14 pt-8 border-t border-slate-200/80 dark:border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-3 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">&lt; 18ms</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Vector Query Retrieval</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">99.8%</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Factual Catalog Accuracy</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">+48%</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Add-to-Cart Conversion Lift</div>
              </div>
              <div className="p-3 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">2 Mins</div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Shopify 1-Click Install</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Interactive Feature Pillars (Tabs + Deep Dive Showcases) */}
        <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-[#0c0e15] border-y border-slate-200/80 dark:border-white/[0.08] transition-colors">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                Core Architectural Pillars
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
                Designed Around Commercial Outcomes, Not Casual Chat
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Explore how each pillar works under the hood to ensure factual accuracy, merchant control, and frictionless checkout.
              </p>
            </div>

            {/* Interactive Tab Navigation */}
            <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-4 gap-2 no-scrollbar">
              {pillars.map((pillar) => {
                const isActive = activePillar === pillar.id;
                const Icon = pillar.icon;
                return (
                  <button
                    key={pillar.id}
                    onClick={() => setActivePillar(pillar.id)}
                    type="button"
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer active:scale-[0.99] border ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30"
                        : "bg-slate-50 dark:bg-[#11141d] text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{pillar.tabTitle}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Pillar Spotlight Container */}
            <div className="mt-10 p-6 sm:p-10 rounded-3xl bg-[#F8FAFC] dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Left Detail Description */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-100 dark:border-indigo-800/50">
                    <selectedPillar.icon className="w-3.5 h-3.5" />
                    <span>{selectedPillar.badge}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                    {selectedPillar.title}
                  </h3>

                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedPillar.description}
                  </p>

                  <div className="space-y-3 pt-2">
                    {selectedPillar.bullets.map((b, idx) => (
                      <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <Link
                      href="/register"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition active:scale-[0.99] flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Try on Your Store</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Zero technical knowledge required
                    </span>
                  </div>
                </div>

                {/* Right Interactive Mockup Simulation */}
                <div className="lg:col-span-6">
                  {/* Toast Notification if Simulated */}
                  {cartToast && (
                    <div className="mb-3 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        <span>{cartToast}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded-full">Cart: {cartCount}</span>
                    </div>
                  )}

                  {/* Mockup Variation based on Active Pillar */}
                  {selectedPillar.mockType === "cart" && (
                    <div className="rounded-2xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.08] shadow-md p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Live Shopper Session</span>
                        </div>
                        <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Cart: {cartCount} items</span>
                        </div>
                      </div>

                      {/* Chat Bubbles */}
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-end">
                          <div className="bg-indigo-600 text-white px-3.5 py-2 rounded-2xl rounded-tr-sm max-w-[80%]">
                            I need cushioned running shoes under $130 with breathable mesh.
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 text-[10px] font-bold">
                            S
                          </div>
                          <div className="bg-slate-100 dark:bg-[#1a202c] text-slate-800 dark:text-slate-200 px-3.5 py-2.5 rounded-2xl rounded-tl-sm max-w-[88%] space-y-3">
                            <p>Here are two top-rated verified options currently in stock in your size:</p>

                            {/* Product Card Inside Chat */}
                            <div className="p-3 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="font-bold text-slate-900 dark:text-white">AeroGlide Pro Runner</div>
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">$119.00</span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Ultra-cushioned midsole, 280g weight, 14 units left in stock.
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() => handleSimulateCart("AeroGlide Pro Runner")}
                                  type="button"
                                  className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>Add to Cart</span>
                                </button>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded">
                                  Shopify Verified
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPillar.mockType === "rag" && (
                    <div className="rounded-2xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.08] shadow-md p-5 space-y-4 font-mono text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <Database className="w-4 h-4" />
                          <span>Grounded RAG Pipeline Trace</span>
                        </span>
                        <span className="text-[11px] text-emerald-500 font-bold">✓ Latency 14.2ms</span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] space-y-1">
                          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            Step 1: Input Firewall &amp; Intent Classifier
                          </div>
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            QUERY: &quot;Can I get 50% discount on order #2910?&quot;
                          </div>
                          <div className="text-amber-600 dark:text-amber-400 text-[11px]">
                            ⚠ Policy guard triggered: Unauthorized discount request blocked
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] space-y-1">
                          <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            Step 2: Deterministic Catalog Truth
                          </div>
                          <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                            SELECT id, price, active_discount FROM products WHERE sku = &apos;RUN-402&apos;
                          </div>
                          <div className="text-[11px] text-slate-500">
                            → Returned: standard_price=$119.00, active_discount=null
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200">
                          <div className="font-bold text-[11px] uppercase tracking-wider">
                            Step 3: Grounded Truth Response Output
                          </div>
                          <div className="text-xs mt-0.5">
                            &quot;We don&apos;t currently have an active 50% promo code, but we do offer 10% off your first order! Would you like the code?&quot;
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPillar.mockType === "shopify" && (
                    <div className="rounded-2xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.08] shadow-md p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 text-emerald-600" />
                          <span>Shopify Webhook Stream</span>
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                          Sync Status: LIVE
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">webhook/products_update</div>
                            <div className="text-[11px] text-slate-500">SKU #FL-889 price adjusted $89 &rarr; $79</div>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-600">Synced 2s ago</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">webhook/inventory_decrement</div>
                            <div className="text-[11px] text-slate-500">Size &apos;M&apos; quantity decremented to 0 (Out of stock)</div>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-600">Synced 14s ago</span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">theme_app_extension.json</div>
                            <div className="text-[11px] text-slate-500">Shopify 2.0 Theme Embed Active</div>
                          </div>
                          <span className="text-[11px] font-semibold text-indigo-600">No Theme Code Edits</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPillar.mockType === "routing" && (
                    <div className="rounded-2xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.08] shadow-md p-5 space-y-4 text-xs">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <PhoneCall className="w-4 h-4 text-rose-500" />
                          <span>High-Intent Handoff Modal</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                          Intent Score: 96%
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06] space-y-2">
                        <div className="text-slate-700 dark:text-slate-300">
                          <strong>Trigger:</strong> Shopper requested bulk pricing for 50 corporate units ($4,200 estimated GMV).
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <a
                            href="https://wa.me"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 transition"
                          >
                            <span>WhatsApp 1-Tap Handoff</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            className="py-2 px-3 rounded-xl border border-slate-200 dark:border-white/[0.08] font-bold text-slate-700 dark:text-slate-300"
                          >
                            Callback
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-[11px] space-y-1">
                        <div className="font-bold">Captured Lead Details:</div>
                        <div>Name: Marcus Vance | Email: m.vance@acme.com</div>
                        <div>Summary auto-forwarded to sales@yourstore.com</div>
                      </div>
                    </div>
                  )}

                  {selectedPillar.mockType === "analytics" && (
                    <div className="rounded-2xl bg-white dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.08] shadow-md p-5 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-purple-600" />
                          <span>Merchant Revenue Lift Dashboard</span>
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600">+31.5% this month</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06]">
                          <span className="text-slate-500 text-[11px]">AI-Assisted Sales</span>
                          <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">$68,420</div>
                          <span className="text-[10px] text-emerald-600 font-bold">142 orders closed</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#11141d] border border-slate-200/60 dark:border-white/[0.06]">
                          <span className="text-slate-500 text-[11px]">Unmet Demand</span>
                          <div className="text-xl font-black text-rose-600 mt-0.5">84 queries</div>
                          <span className="text-[10px] text-slate-500">Missing SKU requests</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/50 text-xs">
                        <div className="font-bold text-purple-900 dark:text-purple-300">Top Unmet Demand Signal:</div>
                        <p className="text-[11px] text-purple-800 dark:text-purple-400 mt-0.5">
                          38 shoppers asked for &quot;Oversized Fleece Hoodie in Sand&quot; this week. Potential $3,400 inventory opportunity.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Comprehensive Feature Matrix (All 24 Capabilities) */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
              Complete Feature Spectrum
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              24 Powerful Capabilities Engineered for High-Growth Brands
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              From front-end shopper ergonomics to deep backend data pipelines and compliance.
            </p>
          </div>

          <div className="space-y-12">
            {featureMatrix.map((group, groupIdx) => {
              const GroupIcon = group.icon;
              return (
                <div key={groupIdx} className="space-y-6">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <GroupIcon className="w-4 h-4" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {group.category}
                    </h3>
                  </div>

                  {/* 6 Feature Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {group.features.map((feat, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600/50 transition flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {feat.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/[0.06]">
                              {feat.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {feat.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Technical FAQ Accordion */}
        <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#0c0e15] border-t border-slate-200/80 dark:border-white/[0.08]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                Frequently Asked Technical Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
                Everything You Need to Know About the Architecture
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] overflow-hidden transition shadow-sm"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      type="button"
                      className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 dark:text-white cursor-pointer select-none"
                    >
                      <span>{faq.q}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-indigo-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.04] pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Closing High-Impact CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 dark:bg-[#07080c] text-white relative overflow-hidden border-t border-slate-800 dark:border-white/[0.08]">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-indigo-900/40 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 px-3.5 py-1 rounded-full border border-indigo-800">
              Risk-Free 14-Day Trial
            </span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mt-4">
              Turn Your Storefront into an Autonomous AI Sales Machine Today
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Install in under 2 minutes with Shopify 1-click install. No code changes, no credit card required, and zero risk.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Start Free 14-Day Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/pricing"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition active:scale-[0.99] flex items-center justify-center border border-white/[0.08]"
              >
                Compare All Plans
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                No credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Shopify Plus &amp; 2.0 Ready
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Cancel anytime with 1 click
              </span>
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
