"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertCircle,
  HelpCircle,
  PlusCircle,
  Check,
  Search,
  Sparkles,
  DollarSign,
  PackageX,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  FileText,
  Tag,
  ArrowRight,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function DemandInsightsPage() {
  const [filterCategory, setFilterCategory] = useState<"all" | "missing" | "questions" | "objections">("all");
  const [addedFaqIndex, setAddedFaqIndex] = useState<number | null>(null);

  const defaultUnmetProducts = [
    {
      query: "Waterproof Camera Sling / Insert",
      volume: 184,
      missedRevenue: "$14,536.00",
      intent: "Camera accessory for TrailPro pack",
      status: "Catalog Gap",
      urgency: "High",
    },
    {
      query: "Merino Wool Beanie (Forest Green)",
      volume: 126,
      missedRevenue: "$4,410.00",
      intent: "Out-of-stock color variant",
      status: "Restock Priority",
      urgency: "High",
    },
    {
      query: "Rain Cover for 45L Duffel",
      volume: 98,
      missedRevenue: "$2,842.00",
      intent: "Add-on accessory request",
      status: "Bundle Opportunity",
      urgency: "Medium",
    },
    {
      query: "Extra Large (XXL) Thermal Base Layer",
      volume: 74,
      missedRevenue: "$4,810.00",
      intent: "Sizing extension demand",
      status: "Size Expansion",
      urgency: "Medium",
    },
  ];

  // Unanswered Questions (Knowledge Gaps)
  const defaultKnowledgeGaps = [
    {
      question: "Are customs duties and VAT prepaid on shipments to the UK and EU?",
      occurrences: 64,
      topic: "International Shipping",
      aiSuggestedAnswer: "Yes, all EU & UK orders are sent DDP (Delivered Duty Paid) with no surprise carrier fees upon arrival.",
    },
    {
      question: "Is the recycled nylon fabric certified OEKO-TEX Standard 100?",
      occurrences: 48,
      topic: "Materials & Sustainability",
      aiSuggestedAnswer: "Yes, all recycled nylon textiles are OEKO-TEX Standard 100 certified non-toxic and PFC-free.",
    },
    {
      question: "Can I machine wash the TrailPro backpack or is it spot-clean only?",
      occurrences: 41,
      topic: "Product Care & Maintenance",
      aiSuggestedAnswer: "We recommend hand washing with gentle soap and air drying to preserve the waterproof TPU membrane.",
    },
  ];

  // Rising Keywords
  const defaultRisingKeywords = [
    { keyword: "waterproof zippers", growth: "+142%", queries: "412 queries" },
    { keyword: "hypoallergenic lining", growth: "+88%", queries: "286 queries" },
    { keyword: "carry-on compliance", growth: "+76%", queries: "318 queries" },
    { keyword: "gift packaging", growth: "+64%", queries: "194 queries" },
    { keyword: "lifetime warranty", growth: "+51%", queries: "510 queries" },
  ];

  const [unmetProducts, setUnmetProducts] = useState(defaultUnmetProducts);
  const [knowledgeGaps, setKnowledgeGaps] = useState(defaultKnowledgeGaps);
  const [risingKeywords, setRisingKeywords] = useState(defaultRisingKeywords);

  useEffect(() => {
    fetch("/api/v1/dashboard/analytics")
      .then((res) => res.json())
      .then((data) => {
        if (data?.demandInsights) {
          if (data.demandInsights.unmetProducts?.length) {
            setUnmetProducts(data.demandInsights.unmetProducts);
          }
          if (data.demandInsights.knowledgeGaps?.length) {
            setKnowledgeGaps(data.demandInsights.knowledgeGaps);
          }
          if (data.demandInsights.risingKeywords?.length) {
            setRisingKeywords(data.demandInsights.risingKeywords);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleAddToFaq = async (index: number, item: any) => {
    try {
      const answerText = item.aiSuggestedAnswer || item.suggestedAnswer || "Pending merchant review.";
      await fetch("/api/v1/dashboard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `FAQ: ${item.topic || "Customer Inquiries"}`,
          type: "faq",
          content: `Question: ${item.question}\nAnswer: ${answerText}`,
        }),
      });
      setAddedFaqIndex(index);
      toast.success("FAQ created and indexed for AI retrieval!");
      setTimeout(() => {
        setAddedFaqIndex(null);
      }, 3000);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add FAQ");
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Demand & Opportunity Intelligence
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Unmet Intent
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Detect what shoppers ask for that you don't carry, identify out-of-stock lost revenue, and pinpoint high-priority knowledge gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/products"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98]"
          >
            <span>Update Catalog Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-[#1e2332] max-w-fit overflow-x-auto">
        {[
          { id: "all" as const, label: "All Insights" },
          { id: "missing" as const, label: "Unmet Demand (Catalog Gaps)" },
          { id: "questions" as const, label: "Knowledge Gaps (Unanswered)" },
          { id: "objections" as const, label: "Surging Trends" },
        ].map((tab) => {
          const isActive = filterCategory === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap active:scale-[0.98] ${
                isActive
                  ? "bg-white dark:bg-[#11141d] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Top 3 Impact Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Unmet Product Demand</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <PackageX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">$26,598.00</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Estimated lost revenue from out-of-stock items & missing catalog requests
          </p>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">High-Friction Knowledge Gaps</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">3 Questions</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Repeatedly asked by 150+ buyers without explicit documentation
          </p>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Fastest Rising Keyword</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">+142% WoW</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            "waterproof zippers" query surging across outerwear searches
          </p>
        </div>
      </div>

      {/* Unmet Catalog Demand Table */}
      {(filterCategory === "all" || filterCategory === "missing") && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PackageX className="w-4 h-4 text-rose-500" />
              <span>Unmet Catalog Demand & Zero-Result Searches</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specific products, variants, or bundles buyers wanted to purchase in chat conversations
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#171b26] px-3 py-1 rounded-xl border border-slate-100 dark:border-white/[0.08]">
            Last 30 Days
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold">
                <th className="pb-3 font-semibold">Buyer Requested Item</th>
                <th className="pb-3 font-semibold">Chat Inquiries</th>
                <th className="pb-3 font-semibold">Potential Value</th>
                <th className="pb-3 font-semibold">Identified Intent</th>
                <th className="pb-3 font-semibold">Opportunity Type</th>
                <th className="pb-3 font-semibold text-right">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
              {unmetProducts.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                  <td className="py-3 font-bold text-slate-900 dark:text-white">{item.query}</td>
                  <td className="py-3 font-semibold text-slate-700 dark:text-slate-300">{item.volume} shoppers</td>
                  <td className="py-3 font-bold text-rose-600 dark:text-rose-400">{item.missedRevenue}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-400">{item.intent}</td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.urgency === "High"
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                          : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                      }`}
                    >
                      {item.urgency}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* 2-Column Grid: Knowledge Gaps & Trending Keywords */}
      {(filterCategory === "all" || filterCategory === "questions" || filterCategory === "objections") && (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Unanswered Questions & Knowledge Gaps (7 Cols) */}
        {(filterCategory === "all" || filterCategory === "questions") && (
        <div className={`${filterCategory === "questions" ? "lg:col-span-12" : "lg:col-span-7"} bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5 animate-fade-in`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Repeated Inquiries Missing in Knowledge Base</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Shoppers repeatedly asked these questions. Add them to your Knowledge Base in 1 click.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {knowledgeGaps.map((item, idx) => {
              const isAdded = addedFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/40 dark:bg-[#171b26] space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                          {item.topic}
                        </span>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          Asked by {item.occurrences} shoppers
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.question}</h4>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    <span className="font-bold text-slate-900 dark:text-white block mb-0.5">AI Proposed Answer:</span>
                    {item.aiSuggestedAnswer || "Answer can be customized and indexed directly into the knowledge base."}
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleAddToFaq(idx, item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        isAdded
                          ? "bg-emerald-600 text-white"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs"
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Added to Knowledge Base!</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Add to Knowledge Base</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Right: Rising Search Keywords & Trends (5 Cols) */}
        {(filterCategory === "all" || filterCategory === "objections") && (
        <div className={`${filterCategory === "objections" ? "lg:col-span-12" : "lg:col-span-5"} bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5 animate-fade-in`}>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Surging Shopper Search Terms</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Features, specs, and materials gaining conversational traction
            </p>
          </div>

          <div className="space-y-3">
            {risingKeywords.map((kw, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">{kw.keyword}</div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">{kw.queries}</div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-100 dark:border-emerald-800">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{kw.growth}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-400">
              <Tag className="w-4 h-4" />
              <span>Catalog Strategy Advice</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Tagging products with "waterproof zippers" and adding "hypoallergenic" to material specifications will boost conversational conversion by an estimated <strong>12%</strong>.
            </p>
          </div>
        </div>
        )}
      </div>
      )}
    </div>
  );
}
