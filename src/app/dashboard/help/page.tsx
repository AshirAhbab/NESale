"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  HelpCircle,
  BookOpen,
  MessageCircle,
  ExternalLink,
  Bot,
  ShieldCheck,
  Zap,
  Code2,
  X,
  CheckCircle2,
} from "lucide-react";

export default function HelpCenterPage() {
  const [selectedGuide, setSelectedGuide] = useState<any | null>(null);

  const guides = [
    {
      title: "Connecting Shopify with Dawn & 2.0 Themes",
      desc: "Step-by-step setup guide for theme app extensions, 1-click cart permalinks, and inventory webhooks.",
      tag: "Shopify Integration",
      time: "4 min read",
      content: `### Integrating NESale into Dawn & Shopify 2.0 Themes\n\n1. **Add the Script Tag**: Paste your store's embed script into your theme's \`theme.liquid\` right before the closing \`</body>\` tag.\n2. **Enable Cart Permalinks**: In NESale Settings > Store, verify your myshopify domain is synced. Products added by shoppers in chat will automatically generate pre-filled checkout sessions.\n3. **Inventory Webhooks**: Whenever a product sells out or prices change on Shopify, NESale automatically updates your catalog within 60 seconds to prevent outdated pricing recommendations.`,
    },
    {
      title: "Configuring Zero-Hallucination Guardrails",
      desc: "How NESale grounds answers in catalog specs and prevents inaccurate discounts or prices.",
      tag: "AI Guardrails",
      time: "3 min read",
      content: `### Strict Catalog Grounding Architecture\n\nNESale uses a dual-pass verification pipeline:\n\n- **Fact Extraction**: Every answer given to a customer is cross-referenced with your synced product database.\n- **Discounts & Price Guarantee**: The assistant is strictly restricted from fabricating custom discount codes or promising free shipping unless configured in your store settings.\n- **Handoff Triggers**: When a shopper asks questions outside the catalog context, the widget offers an instant callback lead drawer to connect them with your human support team.`,
    },
    {
      title: "Embedding the Widget on Custom / Webflow Sites",
      desc: "Copy-paste standard HTML script tag instructions for non-Shopify ecommerce stores.",
      tag: "Developer Guide",
      time: "2 min read",
      content: `### Standard HTML & Webflow Embedding\n\nFor any custom website, Webflow, or headless storefront:\n\n\`\`\`html\n<script src="https://nesale.live/widget.js" data-business-id="YOUR_BUSINESS_ID" async defer></script>\n\`\`\`\n\nPlace this snippet in your global site settings before \`</body>\`. The widget self-initializes and loads your custom styling, position, and business branding automatically.`,
    },
    {
      title: "Maximizing Conversational Lead Capture",
      desc: "Best practices for proactive triggers, exit-intent prompts, and callback lead drawers.",
      tag: "Sales Conversion",
      time: "5 min read",
      content: `### Proven Strategies to Boost Chat Conversion\n\n1. **Personalize Your Welcome Greeting**: Mention current collections or seasonal promotions in your widget welcome message.\n2. **Leverage Proactive Prompts**: Prompt shoppers on high-value collection pages after 15 seconds of browsing.\n3. **Human Callback Lead Capture**: Enable the callback request form so high-intent shoppers with custom queries can leave their phone or email, which syncs directly to your Leads dashboard.`,
    },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-5xl animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Help Center &amp; Documentation
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Merchant Guides
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Everything you need to configure your AI employee, train catalog knowledge, and scale sales.
        </p>
      </div>

      {/* 3 Quick Help Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configure AI Persona</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Adjust tone, verbosity, and recommendation algorithms.
            </p>
          </div>
          <Link
            href="/dashboard/ai-assistant"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 inline-flex items-center gap-1 min-h-[44px]"
          >
            <span>Open AI Settings</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Widget Customization</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Customize colors, launchers, and proactive triggers.
            </p>
          </div>
          <Link
            href="/dashboard/widget"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 inline-flex items-center gap-1 min-h-[44px]"
          >
            <span>Open Widget Customizer</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Developer Script Tag</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Embed widget onto any website with a single snippet.
            </p>
          </div>
          <Link
            href="/dashboard/store"
            className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 inline-flex items-center gap-1 min-h-[44px]"
          >
            <span>View Integration Code</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Detailed Guides List */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Featured Implementation Guides</h3>

        <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
          {guides.map((g, i) => (
            <div
              key={i}
              onClick={() => setSelectedGuide(g)}
              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.03] -mx-3 px-3 rounded-2xl transition active:scale-[0.99]"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                    {g.tag}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{g.time}</span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  {g.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{g.desc}</p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 shrink-0">Read Guide →</span>
            </div>
          ))}
        </div>
      </div>

      {/* Guide Reader Modal */}
      {selectedGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.1] max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                  {selectedGuide.tag}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {selectedGuide.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-slate-600 dark:text-slate-300 space-y-3 whitespace-pre-line leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              {selectedGuide.content}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGuide(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-[0.99] cursor-pointer min-h-[44px]"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
