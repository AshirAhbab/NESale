"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  LifeBuoy,
  Search,
  BookOpen,
  Zap,
  Sliders,
  DollarSign,
  Code2,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
} from "lucide-react";

const categories = [
  {
    icon: Zap,
    title: "Getting Started & Shopify Setup",
    description: "Install via Shopify App Store, configure 1-click OAuth, and enable theme app embeds.",
    articles: [
      "Installing NESale on Shopify in under 2 minutes",
      "Enabling App Embed blocks in Shopify 2.0 themes",
      "Connecting multiple storefront domains to one workspace",
    ],
  },
  {
    icon: BookOpen,
    title: "Catalog Indexing & Knowledge Base",
    description: "Keep stock levels, variants, prices, and store return policies synchronized in real time.",
    articles: [
      "How automatic Shopify webhook catalog sync works",
      "Adding custom policy documents & PDF size charts",
      "Diagnosing unindexed products or missing variant tags",
    ],
  },
  {
    icon: Sliders,
    title: "Widget Customization & Personas",
    description: "Customize colors, launcher position, autonomous greeting timing, and tone of voice.",
    articles: [
      "Matching widget brand colors and hex codes",
      "Setting up high-intent hesitation triggers (PDP delay)",
      "Switching between Concise Sales Rep and Detailed Specialist",
    ],
  },
  {
    icon: MessageSquare,
    title: "Conversations & Lead Capture",
    description: "Review shopper transcripts, qualification forms, and human handoff routing.",
    articles: [
      "Exporting qualified shopper leads to CSV or Klaviyo",
      "Configuring WhatsApp or phone callback buttons",
      "Reviewing and answering unresolved shopper questions",
    ],
  },
  {
    icon: DollarSign,
    title: "Billing, Plans & Conversation Quotas",
    description: "Understand tiered conversation limits, annual discounts, and Stripe receipts.",
    articles: [
      "How conversation volume is counted and renewed",
      "Upgrading from Starter to Growth for cart actions",
      "Downloading VAT invoices and W-9 tax forms",
    ],
  },
  {
    icon: Code2,
    title: "API, Webhooks & Developer Hub",
    description: "Inspect payload schemas, cryptographic HMAC verification, and custom event tracking.",
    articles: [
      "Verifying Shopify & NESale webhook HMAC signatures",
      "Custom REST endpoint for headless Next.js storefronts",
      "Listening for client-side shopper widget custom events",
    ],
  },
];

export default function SupportPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.articles.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero & Search Bar */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
              <LifeBuoy className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Merchant Help Center
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              How can we help your store today?
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Browse setup tutorials, optimization guides, and developer documentation.
            </p>

            {/* Big Search Input */}
            <div className="mt-8 relative max-w-xl mx-auto">
              <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, Shopify setup, webhook HMAC, pricing..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.12] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-md shadow-slate-200/40 dark:shadow-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
              />
            </div>
          </div>

          {/* Status Banner */}
          <div className="mb-14 p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-slate-900 dark:text-white">All Systems Operational</span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                API Latency: 18ms • RAG Embeddings Queue: Normal
              </span>
            </div>
            <div className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 hover:underline cursor-pointer">
              <span>View Live Incident Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Documentation Category Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {filteredCategories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-500/40 transition"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                      {cat.description}
                    </p>

                    <div className="space-y-2 border-t border-slate-100 dark:border-white/[0.08] pt-4">
                      {cat.articles.map((art, aIdx) => (
                        <div
                          key={aIdx}
                          className="text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer flex items-center gap-1.5 group"
                        >
                          <span className="text-indigo-500 group-hover:translate-x-0.5 transition-transform">
                            →
                          </span>
                          <span className="truncate">{art}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Direct Support Contact Bar */}
          <div className="p-8 sm:p-10 rounded-3xl bg-indigo-600 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-indigo-600/20">
            <div>
              <h3 className="text-xl font-bold">Can&apos;t find what you&apos;re looking for?</h3>
              <p className="text-xs sm:text-sm text-indigo-100 mt-1">
                Our support engineers are available 24/7 to help resolve store integration questions.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/contact"
                className="px-6 py-3 rounded-xl bg-white text-indigo-600 font-bold text-xs hover:bg-indigo-50 transition active:scale-[0.99] shadow-sm"
              >
                Submit Support Ticket
              </Link>
            </div>
          </div>
        </div>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
