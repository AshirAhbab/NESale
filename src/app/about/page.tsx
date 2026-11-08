"use client";

import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Cpu,
  Users,
  Target,
  ArrowRight,
  CheckCircle2,
  Lock,
  Globe2,
  Award,
  BarChart3,
  Building2,
} from "lucide-react";

const stats = [
  { value: "2,400+", label: "Active Merchants", change: "Across 42 countries" },
  { value: "$48.2M", label: "Attributed Revenue", change: "Direct AI conversions" },
  { value: "18.6M", label: "Questions Answered", change: "With zero hallucinations" },
  { value: "< 1.2s", label: "Median Response Latency", change: "Grounded RAG retrieval" },
];

const pillars = [
  {
    icon: ShieldCheck,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    title: "100% Grounded Catalog Accuracy",
    description:
      "Unlike generic chatbots that guess specifications and hallucinate discounts, NESale only answers from verified merchant data. If a product detail or policy is not in your verified index, the AI gracefully clarifies or triggers a human callback.",
  },
  {
    icon: Lock,
    color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
    title: "Tenant Isolation & Privacy By Design",
    description:
      "Your store data, proprietary inventory margins, and customer conversations are strictly isolated with row-level PostgreSQL security. We never pool, share, or train foundation models on your private store intelligence.",
  },
  {
    icon: TrendingUp,
    color: "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    title: "Conversion-First Autonomous Actions",
    description:
      "Every conversation has a commercial purpose. NESale doesn't just chat—it dynamically injects verified product cards, adds items directly to the shopper's cart, calculates bundle savings, and routes high-value shoppers to WhatsApp or sales staff.",
  },
];

const leadership = [
  {
    name: "Alex Mercer",
    role: "Co-Founder & CEO",
    bio: "Former Head of Growth at Nordik Commerce. Scaled direct-to-consumer operations from $0 to $35M GMV.",
    avatar: "AM",
  },
  {
    name: "Dr. Elena Rostova",
    role: "Co-Founder & Chief AI Scientist",
    bio: "PhD in Natural Language Processing from Stanford. Published author on grounded Retrieval-Augmented Generation.",
    avatar: "ER",
  },
  {
    name: "Marcus Vance",
    role: "VP of Product Engineering",
    bio: "Ex-Shopify Principal Architect. Led real-time storefront checkout infrastructure for Black Friday volume.",
    avatar: "MV",
  },
  {
    name: "Sophia Chen",
    role: "Head of Merchant Success",
    bio: "Over 10 years guiding enterprise retail transitions into conversational commerce across US and EMEA.",
    avatar: "SC",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative pt-16 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 dark:from-indigo-950/20 via-transparent to-transparent pointer-events-none"></div>
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Our Mission & Philosophy
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
              Turning Every Website Visitor into a{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600">
                Delighted, High-Intent Customer
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto leading-relaxed">
              We started NESale with a single observation: modern e-commerce stores spend thousands driving traffic, yet 97% of visitors leave without buying because static pages cannot answer their unique questions in real time.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition active:scale-[0.99] flex items-center gap-2"
              >
                <span>Deploy Your AI Sales Assistant</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="px-6 py-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200 font-semibold text-sm transition active:scale-[0.99]"
              >
                Talk to Our Founders
              </Link>
            </div>
          </div>
        </section>

        {/* 2. Key Metrics Bar */}
        <section className="py-12 border-y border-slate-100 dark:border-white/[0.08] bg-white/70 dark:bg-[#11141d]/70 backdrop-blur-sm px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((s, idx) => (
              <div key={idx} className="text-center sm:text-left">
                <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {s.value}
                </div>
                <div className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
                  {s.label}
                </div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {s.change}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. The Story & The Problem We Solve */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-6 space-y-5">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                The Origin Story
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Built by merchants frustrated with useless, generic chat bubbles.
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                In 2024, our founding team operated a high-growth Nordic outdoor brand. Customers constantly bounced because they couldn&apos;t quickly verify waterproof ratings, sizing dimensions, or compatibility with their existing gear.
              </p>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Standard chatbots sent links to 2,000-word FAQ pages. Human support agents were overwhelmed or offline after 6 PM. We built NESale to bridge that gap: an autonomous commerce employee with instant access to every SKU, variant, review, and policy in the catalog.
              </p>
              <div className="pt-2 flex items-center gap-6 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>2-Minute Setup</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero Code Required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Shopify Certified</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-6">
              <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-white/[0.08] shadow-card dark:shadow-none space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                    AI
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      The NESale Difference
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Standard Chatbots vs. Autonomous Sales Agent
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-300">
                    <span className="font-bold">❌ Legacy Bots:</span> Generic responses, hallucinates discounts, cannot add to cart, requires weeks of manual rule trees.
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-300">
                    <span className="font-bold">✅ NESale:</span> Real-time Shopify inventory sync, exact variant recommendations, 1-click cart actions, and multi-tenant isolation.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Core Architectural Pillars */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50/60 dark:bg-[#171b26]/50 border-t border-slate-100 dark:border-white/[0.08]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
                Core Engineering Pillars
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
                Designed for Reliability, Speed, and Truth
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
                We treat merchant data with bank-grade seriousness. Here are the core tenets that dictate every architectural decision we make.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {pillars.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div
                    key={idx}
                    className="p-8 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:border-indigo-300 dark:hover:border-indigo-500/40 transition"
                  >
                    <div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${p.color} mb-6`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                        {p.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {p.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 5. Leadership & Team */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800/50">
              The Builders
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
              Experienced Minds in Commerce & AI
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
              Our team consists of engineers and operators who have built high-scale systems at Shopify, Stripe, and top research labs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {leadership.map((member, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm text-center flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center mb-4 shadow-sm">
                  {member.avatar}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {member.name}
                </h3>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                  {member.role}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Bottom CTA Banner */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 pointer-events-none"></div>
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
              Ready to give your store an autonomous sales rep?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-300 max-w-xl mx-auto">
              Join thousands of merchants turning conversations into sales today. Setup takes under 2 minutes.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 transition active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Start 14-Day Free Trial</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-base transition active:scale-[0.99] flex items-center justify-center"
              >
                Schedule an Architecture Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
