"use client";

import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import { Shield, Lock, FileCheck, ExternalLink } from "lucide-react";

const sections = [
  { id: "overview", title: "1. Overview & Privacy Commitment" },
  { id: "collection", title: "2. Information We Collect" },
  { id: "zero-training", title: "3. Zero Model Training Guarantee" },
  { id: "purpose", title: "4. How We Use Collected Data" },
  { id: "subprocessors", title: "5. Authorized Sub-processors" },
  { id: "cookies", title: "6. Cookies & Session Storage" },
  { id: "rights", title: "7. Your Rights (GDPR & CCPA)" },
  { id: "retention", title: "8. Data Retention & Deletion" },
  { id: "dpo", title: "9. Data Protection Officer (DPO)" },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Data Protection
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Last updated: October 5, 2026 • Compliant with GDPR, CCPA, and global commerce standards
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Sidebar Jump Navigation */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-24 p-6 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Sections
                </h3>
                <nav className="space-y-1 text-xs">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block py-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08]">
                  <Link
                    href="/terms"
                    className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                  >
                    <span>Read Terms of Service</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Policy Content */}
            <div className="lg:col-span-8 bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/[0.08] shadow-card dark:shadow-none space-y-10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section id="overview" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  1. Overview & Privacy Commitment
                </h2>
                <p>
                  At NESale Inc. (&ldquo;NESale&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;), we believe that data privacy and commercial success go hand in hand. This Privacy Policy details how we collect, process, and safeguard information when you use our website, merchant management platform, or when your store visitors interact with the NESale Shopper Assistant widget.
                </p>
              </section>

              <section id="collection" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  2. Information We Collect
                </h2>
                <p>
                  We collect information across three primary operational categories:
                </p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong className="text-slate-900 dark:text-white">Merchant Account Data:</strong> Name, work email address, company business name, billing records, and authentication tokens provided during account creation or Shopify OAuth installation.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">Store Catalog Knowledge:</strong> Public product titles, SKUs, inventory status, prices, return policies, FAQs, and documentation crawled or uploaded to vectorize your store&apos;s knowledge base.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">Shopper Conversation Interactions:</strong> Queries entered into the chat widget, recommended products clicked, items added to cart, and voluntary lead capture info (e.g., name/email submitted for callbacks).
                  </li>
                </ul>
              </section>

              <section id="zero-training" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  3. Zero Model Training Guarantee
                </h2>
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-950 dark:text-emerald-200">
                  <strong>Binding Commitment:</strong> NESale maintains zero-data-retention and zero-training agreements with foundation model providers. We never sell your store data, train public AI models on customer conversations, or share your catalog metrics with third-party advertisers.
                </div>
              </section>

              <section id="purpose" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  4. How We Use Collected Data
                </h2>
                <p>
                  Data is processed strictly for: (a) generating accurate, real-time product recommendations; (b) executing shopper-approved shopping actions (e.g. adding items to cart, generating checkout URLs); (c) providing merchants with conversion analytics and unanswered query intelligence; and (d) preventing fraud and prompt injection attacks.
                </p>
              </section>

              <section id="subprocessors" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  5. Authorized Sub-processors
                </h2>
                <p>
                  We partner with enterprise cloud and payment vendors operating under strict Data Processing Addendums (DPAs):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08]">
                    <div className="font-bold text-slate-900 dark:text-white">Amazon Web Services & Supabase</div>
                    <div className="text-[11px] text-slate-500">Cloud Hosting & PostgreSQL Database</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08]">
                    <div className="font-bold text-slate-900 dark:text-white">Google Cloud (Vertex AI)</div>
                    <div className="text-[11px] text-slate-500">Private Vector Inference (No Retention)</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08]">
                    <div className="font-bold text-slate-900 dark:text-white">Stripe Inc.</div>
                    <div className="text-[11px] text-slate-500">PCI-DSS Level 1 Subscription Billing</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08]">
                    <div className="font-bold text-slate-900 dark:text-white">Shopify Inc.</div>
                    <div className="text-[11px] text-slate-500">E-Commerce App Bridge Integration</div>
                  </div>
                </div>
              </section>

              <section id="cookies" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  6. Cookies & Session Storage
                </h2>
                <p>
                  The Shopper Widget utilizes client-side localStorage to maintain session continuity during active store browsing (e.g., preserving chat history as the shopper navigates between collection and product pages). No persistent cross-site tracking cookies are deployed.
                </p>
              </section>

              <section id="rights" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  7. Your Rights (GDPR & CCPA)
                </h2>
                <p>
                  Under European (GDPR) and California (CCPA/CPRA) regulations, merchants and shoppers have the right to:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Request access to all stored conversation logs and catalog embeddings.</li>
                  <li>Request correction of inaccurate merchant records.</li>
                  <li>Request permanent deletion of all store or shopper personal data (&ldquo;Right to Erasure&rdquo;).</li>
                  <li>Opt-out of telemetry tracking.</li>
                </ul>
              </section>

              <section id="retention" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  8. Data Retention & Deletion
                </h2>
                <p>
                  Conversation logs are retained for ninety (90) days by default to power your Merchant Intelligence analytics, after which message contents are automatically anonymized or purged. When an account is terminated, all store records are expunged within thirty (30) calendar days.
                </p>
              </section>

              <section id="dpo" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  9. Data Protection Officer (DPO)
                </h2>
                <p>
                  For privacy requests, GDPR inquiries, or to exercise your statutory rights, please contact our Data Protection Officer:
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono space-y-1">
                  <div>NESale Inc. — Office of the Data Protection Officer</div>
                  <div>Email: privacy@nesale.live</div>
                  <div>Subject Line: &ldquo;GDPR/CCPA Data Subject Request&rdquo;</div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
