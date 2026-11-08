"use client";

import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import { FileText, Shield, ArrowRight, ExternalLink } from "lucide-react";

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms" },
  { id: "accounts", title: "2. Merchant Accounts & Store Authentication" },
  { id: "indexing", title: "3. Catalog Ingestion & Public Data Authorization" },
  { id: "permitted-use", title: "4. Permitted Use & Anti-Abuse Policies" },
  { id: "billing", title: "5. Subscription Fees, Trials & Cancellation" },
  { id: "sla", title: "6. Uptime Service Level Agreement (SLA)" },
  { id: "ip", title: "7. Intellectual Property & Proprietary Rights" },
  { id: "liability", title: "8. Limitation of Liability & Warranties" },
  { id: "termination", title: "9. Termination & Data Deletion" },
  { id: "contact", title: "10. Legal Contact & Notices" },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
              <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Legal Agreement
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Last updated: October 5, 2026 • Effective for all active merchants and website visitors
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Quick Anchor Links */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="sticky top-24 p-6 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contents
                </h3>
                <nav className="space-y-1 text-xs">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block py-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
                <div className="pt-4 border-t border-slate-100 dark:border-white/[0.08]">
                  <Link
                    href="/privacy"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                  >
                    <span>Read Privacy Policy</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Legal Clauses Content */}
            <div className="lg:col-span-8 bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/[0.08] shadow-card dark:shadow-none space-y-10 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section id="acceptance" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  1. Acceptance of Terms
                </h2>
                <p>
                  By accessing, registering for, or using the NESale platform (&ldquo;Service&rdquo;), including any associated APIs, embeddable shopper widgets, web crawlers, or Shopify marketplace applications, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you are entering into this agreement on behalf of a business, merchant entity, or corporate employer, you represent that you possess the full legal authority to bind such entity.
                </p>
              </section>

              <section id="accounts" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  2. Merchant Accounts & Store Authentication
                </h2>
                <p>
                  To use the Service, you must create a Merchant Account and authenticate your digital storefront (e.g., via Shopify OAuth 2.0 or verified domain DNS records). You are solely responsible for safeguarding your master credentials and for all actions initiated under your account. NESale implements industry-standard encryption for store access tokens and webhooks.
                </p>
              </section>

              <section id="indexing" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  3. Catalog Ingestion & Public Data Authorization
                </h2>
                <p>
                  By connecting your storefront or supplying website URLs, you explicitly grant NESale a non-exclusive, worldwide authorization to crawl public product catalog pages, Schema.org/JSON-LD metadata, and support documentation for the sole purpose of indexing vector embeddings to power your store&apos;s shopping assistant.
                </p>
                <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200">
                  <span className="font-bold">Strict Isolation Guarantee:</span> NESale will never sell your catalog data, share internal inventory volumes with third parties, or train public AI foundation models on your proprietary business information.
                </div>
              </section>

              <section id="permitted-use" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  4. Permitted Use & Anti-Abuse Policies
                </h2>
                <p>
                  You agree not to use the Service to: (a) distribute fraudulent, defamatory, or harmful merchandise; (b) attempt prompt injection, jailbreaking, or reverse engineering of the AI reasoning pipeline; (c) bypass rate limits or query volume throttles; or (d) scrape competitor catalogs without legal entitlement.
                </p>
              </section>

              <section id="billing" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  5. Subscription Fees, Trials & Cancellation
                </h2>
                <p>
                  Paid subscription plans (Starter, Growth, Pro, Enterprise) are billed on a recurring monthly or annual basis via Stripe or Shopify App Billing. A 14-day free trial is available for select tiers. You may cancel your subscription at any time within your Merchant Dashboard; your access will continue through the end of the paid billing cycle without refund for unused fractions of the period.
                </p>
              </section>

              <section id="sla" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  6. Uptime Service Level Agreement (SLA)
                </h2>
                <p>
                  We strive to maintain 99.9% uptime for the client-facing Shopper Assistant widget across all modern browsers. Planned maintenance windows are communicated at least 48 hours in advance. Performance telemetry and live system health can be monitored on our public status page.
                </p>
              </section>

              <section id="ip" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  7. Intellectual Property & Proprietary Rights
                </h2>
                <p>
                  You retain all ownership rights in your product catalog, brand trademarks, and shopper conversation transcripts. NESale retains all proprietary rights, copyright, and patent interests in the platform architecture, widget software code, vector retrieval engines, and machine learning models.
                </p>
              </section>

              <section id="liability" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  8. Limitation of Liability & Warranties
                </h2>
                <p>
                  The Service is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. In no event shall NESale Inc., its officers, or its affiliates be liable for indirect, incidental, special, or consequential damages (including loss of profits, data corruption, or store downtime) exceeding the total amount paid by you to NESale in the 12 months preceding the claim.
                </p>
              </section>

              <section id="termination" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  9. Termination & Data Deletion
                </h2>
                <p>
                  You may close your account at any time via the Settings page. Upon verified termination, all vector embeddings, crawled document chunks, and merchant tokens will be purged from active database tables within thirty (30) days in compliance with GDPR Right to Erasure mandates.
                </p>
              </section>

              <section id="contact" className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  10. Legal Contact & Notices
                </h2>
                <p>
                  Questions or legal notices concerning these Terms of Service should be directed to our Legal Department at:
                </p>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/[0.08] text-xs font-mono space-y-1">
                  <div>NESale Inc. — Legal Counsel & Regulatory Compliance</div>
                  <div>548 Market St, Suite 29104</div>
                  <div>San Francisco, CA 94104</div>
                  <div>Email: legal@nesale.live</div>
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
