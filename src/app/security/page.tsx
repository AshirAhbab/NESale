"use client";

import React from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import {
  ShieldCheck,
  Lock,
  Server,
  FileCheck,
  EyeOff,
  Key,
  Database,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

const securityFeatures = [
  {
    icon: Lock,
    title: "Multi-Tenant Data Isolation",
    description:
      "Every merchant catalog, customer chat session, and vector embedding is partitioned with strict PostgreSQL tenant isolation. Cross-tenant leakage is architecturally prohibited at the query layer.",
  },
  {
    icon: EyeOff,
    title: "Zero Model Training Guarantee",
    description:
      "We operate under strict zero-data-retention agreements with AI foundation providers. Your proprietary product margins, catalog secrets, and shopper queries are never used to train public or shared LLMs.",
  },
  {
    icon: Key,
    title: "End-to-End Encryption",
    description:
      "All traffic is secured via TLS 1.3 in transit with forward secrecy. At rest, database volumes and vector indexes are encrypted using AES-256 with automatically rotated hardware security keys.",
  },
  {
    icon: Database,
    title: "Encrypted Credential Vault",
    description:
      "Shopify Admin tokens, webhooks secrets, and third-party API keys are stored in an encrypted secrets vault. Raw keys are never logged in plaintext or returned to the browser client.",
  },
  {
    icon: Server,
    title: "Webhook HMAC Verification",
    description:
      "Every incoming Shopify order, catalog update, and Stripe subscription event is cryptographically verified against official HMAC-SHA256 signatures before triggering downstream ingestion.",
  },
  {
    icon: FileCheck,
    title: "Continuous Audit & Red Teaming",
    description:
      "We perform automated vulnerability scans, static code analysis (SAST), and periodic third-party penetration testing to identify and remediate potential security vectors.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Enterprise Security & Trust
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              Bank-Grade Security for Modern Commerce
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Leading merchants trust NESale with their catalog intelligence and high-volume checkout flows. Learn how we engineer data sovereignty, tenant isolation, and regulatory compliance into every layer of our platform.
            </p>
          </div>

          {/* Compliance Badges Bar */}
          <div className="bg-white dark:bg-[#11141d] rounded-2xl p-6 border border-slate-200/80 dark:border-white/[0.08] shadow-sm mb-16 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">SOC 2 Type II</div>
              <div className="text-xs text-slate-500">Security & Confidentiality</div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">GDPR & CCPA</div>
              <div className="text-xs text-slate-500">Full Shopper Privacy Rights</div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">TLS 1.3 & AES-256</div>
              <div className="text-xs text-slate-500">Industry-Standard Encryption</div>
            </div>
            <div className="space-y-1">
              <div className="text-base font-extrabold text-slate-900 dark:text-white">Shopify Verified</div>
              <div className="text-xs text-slate-500">OAuth & App Bridge Standards</div>
            </div>
          </div>

          {/* Security Architecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {securityFeatures.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={idx}
                  className="p-7 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:border-emerald-300 dark:hover:border-emerald-500/40 transition"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                      {feat.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prompt Injection & Guardrails Section */}
          <div className="p-8 sm:p-10 rounded-3xl bg-slate-900 text-white relative overflow-hidden mb-16">
            <div className="max-w-3xl space-y-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Defensive AI Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">
                Hardened Protection Against Prompt Injection
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Shoppers interact with your assistant directly in their browsers. To prevent jailbreaking or competitor price extraction, NESale treats all retrieved catalog chunks as untrusted data wrapped in strict delimiter boundaries. The AI cannot execute code or access internal endpoints.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Grounded RAG Only
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Strict Whitelisted Actions
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zero Raw SQL Access
                </span>
              </div>
            </div>
          </div>

          {/* Vulnerability Reporting & Contact */}
          <div className="p-8 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Have a Security Inquiry or Vulnerability Report?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                We operate a coordinated vulnerability disclosure policy with rewards for qualified security reports.
              </p>
            </div>
            <Link
              href="/contact"
              className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-sm transition active:scale-[0.99] shrink-0"
            >
              Contact Security Team
            </Link>
          </div>
        </div>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
