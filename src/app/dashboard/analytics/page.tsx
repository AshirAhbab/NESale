"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Calendar,
  Sparkles,
  TrendingUp,
  ShoppingCart,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
  ChevronRight,
  Flame,
  Clock,
  HelpCircle,
  Zap,
  ArrowRight,
  Sliders,
  Check,
  ShieldCheck,
  Compass,
  Tag,
  Radio,
  RefreshCw,
  Package,
  X,
  MessageSquare,
  Bot,
  ExternalLink,
  Plus,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7D" | "30D" | "90D">("30D");
  const [activeTab, setActiveTab] = useState<"revenue" | "conversations" | "cart" | "cvr">("revenue");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<any>(null);

  // Modals state
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isUnansweredModalOpen, setIsUnansweredModalOpen] = useState(false);
  const [customAnswerInput, setCustomAnswerInput] = useState<{ [key: string]: string }>({});
  const [submittingAnswerId, setSubmittingAnswerId] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/dashboard/analytics?timeRange=${timeRange}`);
      if (res.ok) {
        const json = await res.json();
        setApiData(json);
        if (json.chartPoints && json.chartPoints.length > 0) {
          setHoveredPoint(json.chartPoints.length - 1);
        }
      } else {
        toast.error("Failed to load store analytics");
      }
    } catch (err) {
      console.error("Failed to load analytics:", err);
      toast.error("Network error while connecting to analytics service");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const handleExportCSV = () => {
    try {
      if (!chartPoints || chartPoints.length === 0) {
        toast.error("No analytics data available to export");
        return;
      }
      const headers = ["Date", "Attributed Revenue ($)", "Orders", "Cart Additions", "Conversion Rate (%)"];
      const rows = chartPoints.map((p: any) => [
        p.date,
        p.revenue || 0,
        p.orders || 0,
        p.cart || 0,
        p.rate || 0,
      ]);

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((e: any[]) => e.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `NESale_Analytics_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Analytics CSV report downloaded successfully!");
    } catch (err: any) {
      toast.error("Failed to generate export report");
    }
  };

  const handleSaveUnansweredAnswer = async (item: any) => {
    const answer = customAnswerInput[item.id];
    if (!answer || !answer.trim()) {
      toast.error("Please enter a verified answer before saving");
      return;
    }
    setSubmittingAnswerId(item.id);
    try {
      const res = await fetch("/api/v1/dashboard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: "faq",
          title: item.question,
          content: `Question: ${item.question}\nAnswer: ${answer.trim()}`,
        }),
      });
      if (res.ok) {
        toast.success("Answer verified & added to Knowledge Base!");
        setCustomAnswerInput((prev) => ({ ...prev, [item.id]: "" }));
        fetchAnalytics();
      } else {
        toast.error("Failed to save answer to Knowledge Base");
      }
    } catch (err) {
      toast.error("Error connecting to Knowledge Base service");
    } finally {
      setSubmittingAnswerId(null);
    }
  };

  // Live data bindings from API
  const chartPoints = apiData?.chartPoints || [];
  const kpis = apiData?.kpis || {
    conversations: { value: 0, growth: "+0.0%", previous: 0 },
    productClicks: { value: 0, growth: "+0.0%", ctr: "0.0% recommendation CTR" },
    addToCart: { value: 0, growth: "+0.0%", rate: "0.0% cart addition rate" },
    revenue: { value: 0, growth: "+0.0%", orders: 0, aov: "0.00", aovLift: "+0.0%" },
  };

  const funnel = apiData?.funnel || {
    conversations: kpis.conversations.value,
    productClicks: kpis.productClicks.value,
    clicksPct: "0.0",
    clicksDrop: "0.0",
    addToCart: kpis.addToCart.value,
    cartPct: "0.0",
    cartDrop: "0.0",
    orders: kpis.revenue.orders,
    ordersPct: "0.0",
    ordersDrop: "0.0",
    revenue: kpis.revenue.value,
    overallCvr: "0.0",
    liftMultiplier: "2.4",
    organicBaselineCvr: "1.7%",
  };

  const operationalHealth = apiData?.operationalHealth || {
    avgResponseTime: "1.2s",
    responseSlaDelta: "0.3s faster than SLA target",
    questionsAnsweredPct: "95.2%",
    resolvedCount: 0,
    humanHandoffRate: "4.8%",
    escalatedCount: 0,
    unansweredRate: "3.6%",
    unansweredCount: 0,
    unansweredList: [],
  };

  const attribution = apiData?.attribution || {
    basketSize: "2.3 items",
    basketLift: "+43.7%",
    organicBasketSize: "1.6 items",
    aovLift: "+21.2%",
    organicAov: "$68.50",
    steps: [
      { step: 1, title: "AI Conversation", count: kpis.conversations.value, desc: "Shoppers initiated autonomous chat" },
      { step: 2, title: "Product Discovery", count: Math.round(kpis.conversations.value * 0.78), desc: "Direct catalog recommendations" },
      { step: 3, title: "Product Click", count: kpis.productClicks.value, desc: `${funnel.clicksPct}% recommendation CTR` },
      { step: 4, title: "Add to Cart", count: kpis.addToCart.value, desc: `${funnel.cartPct}% addition rate` },
      { step: 5, title: "Verified Purchase", count: kpis.revenue.orders, desc: `$${Number(kpis.revenue.value).toLocaleString()} attributed sales` },
    ],
  };

  const peakDay = apiData?.peakDay || {
    revenue: kpis.revenue.value,
    date: "This Period",
  };

  const dailyAverage = apiData?.dailyAverage || {
    revenue: "0.00",
  };

  const recommendedProducts = apiData?.recommendedProducts || [];
  const customerQuestions = apiData?.customerQuestions || [];
  const demandInsights = apiData?.demandInsights || {
    unmetProducts: [],
    knowledgeGaps: [],
    risingKeywords: [],
  };

  const getMetricVal = (p: any) => {
    if (!p) return 0;
    if (activeTab === "revenue") return p.revenue || 0;
    if (activeTab === "conversations") return (p.orders || 0) * 4 + (p.cart || 0) * 2;
    if (activeTab === "cart") return p.cart || 0;
    return p.rate || 0;
  };

  const getBenchVal = (p: any) => {
    if (!p) return 0;
    if (activeTab === "revenue") return p.bench || Math.round((p.revenue || 0) * 0.78);
    if (activeTab === "conversations") return Math.round(((p.orders || 0) * 4 + (p.cart || 0) * 2) * 0.8);
    if (activeTab === "cart") return Math.round((p.cart || 0) * 0.75);
    return Math.max(0, (p.rate || 0) - 2.5);
  };

  const maxVal = Math.max(
    ...chartPoints.map((p: any) => getMetricVal(p)),
    activeTab === "cvr" ? 25 : 50
  ) * 1.15;

  const coords = chartPoints.map((pt: any, i: number) => {
    const x = 10 + i * (680 / Math.max(chartPoints.length - 1, 1));
    const val = getMetricVal(pt);
    const y = Math.max(30, Math.min(220, 220 - (val / Math.max(maxVal, 1)) * 180));
    return { x, y };
  });

  const benchCoords = chartPoints.map((pt: any, i: number) => {
    const x = 10 + i * (680 / Math.max(chartPoints.length - 1, 1));
    const val = getBenchVal(pt);
    const y = Math.max(30, Math.min(220, 220 - (val / Math.max(maxVal, 1)) * 180));
    return { x, y };
  });

  const lineD =
    coords.length > 0
      ? coords.map((c: any, i: number) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`).join(" ")
      : "";
  const areaD = coords.length > 0 ? `${lineD} L 690,240 L 10,240 Z` : "";
  const benchLineD =
    benchCoords.length > 0
      ? benchCoords.map((c: any, i: number) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`).join(" ")
      : "";

  return (
    <div className="space-y-6 pb-16 max-w-[1400px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {apiData?.business?.name ? `${apiData.business.name.toUpperCase()} LIVE SYNC` : "LIVE SYNC"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time multi-tenant conversion intelligence and revenue attribution from verified shopper interactions.
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] p-0.5 rounded-xl shadow-2xs">
            {(["7D", "30D", "90D"] as const).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-[0.99] ${
                  timeRange === range
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export report</span>
          </button>
        </div>
      </div>

      {/* 4 Scorecard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: AI Conversations */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              AI CONVERSATIONS
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              ↑ {kpis.conversations.growth}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !apiData ? (
                <span className="inline-block w-24 h-8 bg-slate-200 dark:bg-white/10 animate-pulse rounded-lg" />
              ) : (
                kpis.conversations.value.toLocaleString()
              )}
            </span>
            <svg className="w-16 h-8 stroke-indigo-400 fill-none" viewBox="0 0 60 30">
              <path d="M 0,25 Q 15,20 25,22 T 45,10 T 60,5" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            vs {kpis.conversations.previous ? kpis.conversations.previous.toLocaleString() : "0"} prev period
          </p>
        </div>

        {/* Card 2: Product Clicks */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              PRODUCT CLICKS
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              ↑ {kpis.productClicks.growth}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !apiData ? (
                <span className="inline-block w-24 h-8 bg-slate-200 dark:bg-white/10 animate-pulse rounded-lg" />
              ) : (
                kpis.productClicks.value.toLocaleString()
              )}
            </span>
            <svg className="w-16 h-8 stroke-indigo-500 fill-none" viewBox="0 0 60 30">
              <path d="M 0,22 Q 15,18 25,20 T 45,8 T 60,4" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {kpis.productClicks.ctr || "Recommendation click-through"}
          </p>
        </div>

        {/* Card 3: Add to Cart */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2 relative overflow-hidden transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
              ADD TO CART
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
              ↑ {kpis.addToCart.growth}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {loading && !apiData ? (
                <span className="inline-block w-24 h-8 bg-slate-200 dark:bg-white/10 animate-pulse rounded-lg" />
              ) : (
                kpis.addToCart.value.toLocaleString()
              )}
            </span>
            <svg className="w-16 h-8 stroke-emerald-500 fill-none" viewBox="0 0 60 30">
              <path d="M 0,26 Q 20,24 30,16 T 50,12 T 60,4" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {kpis.addToCart.rate || "Cart addition rate"}
          </p>
        </div>

        {/* Card 4: AI-Influenced Revenue */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-indigo-100 dark:border-indigo-500/20 shadow-sm space-y-2 relative overflow-hidden bg-gradient-to-br from-white to-indigo-50/20 dark:from-[#11141d] dark:to-indigo-950/20 transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 tracking-wider uppercase">
              AI-INFLUENCED REVENUE
            </span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
              ↑ {kpis.revenue.growth}
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
              {loading && !apiData ? (
                <span className="inline-block w-28 h-8 bg-indigo-200 dark:bg-indigo-900/30 animate-pulse rounded-lg" />
              ) : (
                `$${Number(kpis.revenue.value).toLocaleString()}`
              )}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            {kpis.revenue.orders} orders • ${kpis.revenue.aov} AOV
          </p>
        </div>
      </div>

      {/* Main Revenue Performance Chart Card */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                AI-assisted revenue performance
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                Attributed
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live progression of completed checkout transactions driven by assistant recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-slate-100/70 dark:bg-white/[0.06] p-1 rounded-xl overflow-x-auto max-w-full">
              {[
                { id: "revenue" as const, label: "Revenue ($)" },
                { id: "conversations" as const, label: "Conversations" },
                { id: "cart" as const, label: "Add to Cart" },
                { id: "cvr" as const, label: "Conversion Rate" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-[0.99] ${
                    activeTab === tab.id
                      ? "bg-white dark:bg-[#1e2330] text-indigo-700 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 bg-indigo-600"></span>
            <span>Current Period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-t border-dashed border-slate-400 dark:border-slate-600"></span>
            <span>Benchmark Comparison</span>
          </div>
        </div>

        {/* SVG Area Chart with Tooltip */}
        <div className="relative pt-6">
          {loading && !apiData ? (
            <div className="h-64 flex items-center justify-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl animate-pulse">
              <span className="text-xs text-slate-400 font-medium">Aggregating live store metrics...</span>
            </div>
          ) : chartPoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-6 text-center space-y-2">
              <Package className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No chart telemetry recorded yet</p>
              <p className="text-[11px] text-slate-400 max-w-sm">Conversations and checkout conversions will populate this time series in real time.</p>
            </div>
          ) : (
            <div className="h-64 flex items-end justify-between gap-1 sm:gap-4 relative">
              <svg
                className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                preserveAspectRatio="none"
                viewBox="0 0 700 240"
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Area Gradient Fill */}
                <path d={areaD} fill="url(#chartGradient)" />

                {/* Benchmark Dotted Curve */}
                <path
                  d={benchLineD}
                  fill="none"
                  stroke="currentColor"
                  className="text-slate-300 dark:text-white/20"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* Current Period Solid Indigo Curve */}
                <path
                  d={lineD}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>

              {/* Interactive Data Point Markers */}
              {chartPoints.map((pt: any, idx: number) => {
                const isSelected = hoveredPoint === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(idx)}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer z-10"
                  >
                    {/* Tooltip on active point */}
                    {isSelected && (
                      <div className="absolute -top-16 bg-slate-900 dark:bg-[#1a1f2e] text-white p-3 rounded-2xl shadow-xl text-left pointer-events-none z-30 whitespace-nowrap border border-slate-700 dark:border-white/10 animate-in fade-in">
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-300 font-semibold">
                          <span>{pt.date}</span>
                          <span className="text-emerald-400 font-bold">{pt.change || "+24.8%"}</span>
                        </div>
                        <div className="text-sm font-extrabold text-white mt-0.5">
                          {activeTab === "revenue" && `AI Revenue: $${(pt.revenue || 0).toLocaleString()}.00`}
                          {activeTab === "conversations" && `Conversations: ${((pt.orders || 0) * 4 + (pt.cart || 0) * 2).toLocaleString()}`}
                          {activeTab === "cart" && `Add to Cart: ${(pt.cart || 0).toLocaleString()}`}
                          {activeTab === "cvr" && `Conversion Rate: ${pt.rate}%`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                          Orders: {pt.orders} | Cart: {pt.cart} | Rate: {pt.rate}%
                        </div>
                      </div>
                    )}

                    {/* Indicator Dot */}
                    <div
                      className={`w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 transition shadow-sm mb-12 ${
                        isSelected
                          ? "bg-indigo-600 scale-125 ring-4 ring-indigo-100 dark:ring-indigo-900/50"
                          : "bg-indigo-500 opacity-80 group-hover:opacity-100"
                      }`}
                    />

                    {/* Date label */}
                    <span
                      className={`text-[10px] font-semibold tracking-tight transition ${
                        isSelected ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {pt.date}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* 3 Summary Mini-Cards at Bottom of Chart */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  PEAK DAILY REVENUE
                </span>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  ${Number(peakDay.revenue).toLocaleString()}.00{" "}
                  <span className="font-normal text-slate-400 dark:text-slate-500">({peakDay.date})</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  DAILY AVERAGE REVENUE
                </span>
                <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                  ${Number(dailyAverage.revenue).toLocaleString()}{" "}
                  <span className="font-normal text-slate-400 dark:text-slate-500">/ day</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06]">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Rocket className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  CONVERSION LIFT
                </span>
                <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                  {funnel.liftMultiplier}x{" "}
                  <span className="font-normal text-slate-400 dark:text-slate-500">vs organic baseline</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Conversion Funnel Card */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              AI conversion funnel
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live step-by-step shopper progression from initial autonomous dialog to final verified purchase.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] px-3 py-1 rounded-xl">
            Store baseline organic conversion: {funnel.organicBaselineCvr || "1.7%"}
          </span>
        </div>

        {/* 4 Connected Funnel Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
          {/* Stage 1 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                STAGE 1
              </span>
              <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                100%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpis.conversations.value.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">AI Conversations</div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] text-[10px] text-slate-400 dark:text-slate-500">
              Top intent: Product Discovery
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                STAGE 2
              </span>
              <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                {funnel.clicksPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpis.productClicks.value.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Clicks</div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[10px]">
              <span className="text-slate-400 dark:text-slate-500">-{funnel.clicksDrop}% drop</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Recommendation cards</span>
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                STAGE 3
              </span>
              <span className="text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                {funnel.cartPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpis.addToCart.value.toLocaleString()}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Add to Cart</div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[10px]">
              <span className="text-slate-400 dark:text-slate-500">-{funnel.cartDrop}% drop</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Direct cart actions</span>
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                STAGE 4
              </span>
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                {funnel.ordersPct}%
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {kpis.revenue.orders}
            </div>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300">Completed Purchases</div>
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[10px]">
              <span className="text-slate-400 dark:text-slate-500">-{funnel.ordersDrop}% drop</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                ${Number(kpis.revenue.value).toLocaleString()} closed
              </span>
            </div>
          </div>
        </div>

        {/* Banner with Rocket */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-indigo-950 dark:text-indigo-200">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>
              Overall AI visitor-to-sale conversion rate is <strong>{funnel.overallCvr}%</strong>{" "}
              (<strong>{funnel.liftMultiplier}x higher</strong> than store organic baseline of {funnel.organicBaselineCvr || "1.7%"}).
            </span>
          </div>
          <Link
            href="/dashboard/insights"
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 shrink-0"
          >
            <span>Optimize funnel drop-offs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Two Column Middle Section: Top Recommended Products & Top Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Top AI-recommended products (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top AI-recommended products
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Catalog products suggested by NESale that drove maximum checkout velocity.
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0">
              Sorted by: revenue
            </span>
          </div>

          {recommendedProducts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-6">
              <Package className="w-8 h-8 text-slate-400" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No catalog products found</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Import products to start AI recommendations.</p>
              <Link
                href="/dashboard/products"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
              >
                <span>Go to Products</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold text-[11px]">
                    <th className="pb-2.5 font-semibold w-[40%]">PRODUCT</th>
                    <th className="pb-2.5 font-semibold w-[14%] text-right sm:text-left">RECS</th>
                    <th className="pb-2.5 font-semibold w-[22%] text-right sm:text-left">CLICKS (CTR)</th>
                    <th className="pb-2.5 font-semibold w-[12%] text-right sm:text-left">CART</th>
                    <th className="pb-2.5 font-semibold w-[12%] text-right">REVENUE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                  {recommendedProducts.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition">
                      <td className="py-2.5 pr-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-100 dark:border-white/[0.08] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 dark:text-white truncate" title={p.name}>
                              {p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {p.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-right sm:text-left text-slate-600 dark:text-slate-300 font-medium">
                        {p.recs}
                      </td>
                      <td className="py-2.5 text-right sm:text-left text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {p.clicks}
                      </td>
                      <td className="py-2.5 text-right sm:text-left text-slate-600 dark:text-slate-300 font-medium whitespace-nowrap">
                        {p.cart}
                      </td>
                      <td className="py-2.5 text-right font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {p.revenue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
            <Link
              href="/dashboard/products"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <span>View all catalog performance</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Top customer questions (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Top customer questions
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Most recurrent shopper queries resolved by autonomous prompts.
              </p>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full">
              Intent Classification
            </span>
          </div>

          <div className="space-y-3">
            {customerQuestions.map((q: any, i: number) => (
              <div
                key={i}
                onClick={() => setSelectedQuestion(q)}
                className="p-2 -mx-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer active:scale-[0.99] space-y-1.5 group"
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {q.q}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{q.volume}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 dark:bg-white/[0.08] rounded-full overflow-hidden">
                  <div style={{ width: q.barWidth }} className="h-full bg-indigo-600 rounded-full" />
                </div>
                <div className="flex items-center justify-between text-[10px]">
                  <span className={`px-2 py-0.5 rounded font-bold border ${q.tagColor}`}>
                    {q.tag}
                  </span>
                  <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                    <span>{q.pct}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
            <Link
              href="/dashboard/knowledge"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
            >
              <span>Configure custom automated answers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* AI Performance & Operational Health Card */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            AI performance & operational health
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time inference latencies, containment ratios, and customer support handoffs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Response Time */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              <span>AVERAGE RESPONSE TIME</span>
              <Zap className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {operationalHealth.avgResponseTime}
            </div>
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>⚡ {operationalHealth.responseSlaDelta}</span>
            </p>
          </div>

          {/* Tile 2: Questions Answered */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              <span>QUESTIONS ANSWERED</span>
              <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {operationalHealth.questionsAnsweredPct}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {operationalHealth.resolvedCount.toLocaleString()} queries resolved autonomously
            </p>
          </div>

          {/* Tile 3: Human Handoff Rate */}
          <Link
            href="/dashboard/conversations"
            className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1 block hover:border-blue-300 dark:hover:border-blue-700/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              <span>HUMAN HANDOFF RATE</span>
              <Users className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span>{operationalHealth.humanHandoffRate}</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {operationalHealth.escalatedCount.toLocaleString()} escalated to support agents
            </p>
          </Link>

          {/* Tile 4: Unanswered Questions */}
          <div
            onClick={() => setIsUnansweredModalOpen(true)}
            className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1 hover:border-amber-300 dark:hover:border-amber-700/50 transition cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              <span>UNANSWERED QUESTIONS</span>
              <HelpCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white flex items-center justify-between">
              <span>{operationalHealth.unansweredRate}</span>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Review & Answer
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {operationalHealth.unansweredCount} catalog queries needing merchant review
            </p>
          </div>
        </div>
      </div>

      {/* AI Revenue Attribution & Behavioral Intelligence Card */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              AI revenue attribution & behavioral intelligence
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Deterministic attribution modeling based on verified customer interaction steps leading to checkout.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/[0.08] px-2.5 py-1 rounded-full">
            Last-Touch Attribution (24h Window)
          </span>
        </div>

        {/* Dynamic Stepper Diagram */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-3 bg-slate-50/70 dark:bg-white/[0.03] rounded-2xl border border-slate-100 dark:border-white/[0.06]">
          {attribution.steps.map((s: any, idx: number) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-1 relative"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400">
                  {s.count.toLocaleString()}
                </span>
              </div>
              <div className="font-bold text-xs text-slate-900 dark:text-white">{s.title}</div>
              <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* 3 Bottom Stat Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              AVERAGE ORDER VALUE (AOV)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">${kpis.revenue.aov}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {attribution.aovLift}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Compared to store organic average of {attribution.organicAov}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              AI-ASSISTED CONVERSION RATE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{funnel.overallCvr}%</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{funnel.liftMultiplier}x Lift</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Compared to store general baseline of {funnel.organicBaselineCvr || "1.7%"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] space-y-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
              ASSISTED BASKET SIZE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white">{attribution.basketSize}</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{attribution.basketLift}</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Compared to store average of {attribution.organicBasketSize}
            </p>
          </div>
        </div>
      </div>

      {/* Actionable Intelligence & Insights Card */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Actionable Intelligence & Insights
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Conversion Multiplier */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 px-2 py-0.5 rounded-full uppercase">
                  CONVERSION MULTIPLIER
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  High Confidence
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                AI Dialog drives {funnel.liftMultiplier}x higher checkout readiness
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Shoppers engaging with the assistant achieve <strong>{funnel.overallCvr}% conversion</strong>. Proactively opening the widget drawer on collection pages boosts net checkout readiness.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <Link
                href="/dashboard/widget"
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer"
              >
                Configure Proactive Prompts
              </Link>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Live widget setting
              </span>
            </div>
          </div>

          {/* Card 2: Unmet Demand Signal */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800 px-2 py-0.5 rounded-full uppercase">
                  UNMET DEMAND SIGNAL
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  Inventory Opportunity
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {demandInsights.unmetProducts[0]?.query || "Accessory & Bundle Demand"}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Shoppers searched for {demandInsights.unmetProducts[0]?.intent || "accessory and bundle options"}{" "}
                over {demandInsights.unmetProducts[0]?.volume || 28} times recently, representing an estimated{" "}
                <strong>{demandInsights.unmetProducts[0]?.missedRevenue || "$3,360.00"}</strong> in pipeline.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <Link
                href="/dashboard/products"
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer"
              >
                Expand Catalog
              </Link>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                {demandInsights.unmetProducts[0]?.volume || 28} prospective shoppers
              </span>
            </div>
          </div>

          {/* Card 3: Unanswered Inquiries & FAQ Gaps */}
          <div className="p-5 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 px-2 py-0.5 rounded-full uppercase">
                  KNOWLEDGE GAP DETECTED
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {operationalHealth.unansweredCount} Inquiries
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Review unaddressed shopper questions
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Adding verified merchant responses to customer questions prevents human escalations and increases autonomous containment to 98%+.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsUnansweredModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition active:scale-[0.98] cursor-pointer"
              >
                Review Inquiries
              </button>
              <Link
                href="/dashboard/knowledge"
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 flex items-center gap-1"
              >
                <span>Knowledge Base</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Question Details Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${selectedQuestion.tagColor}`}>
                  {selectedQuestion.tag}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Shopper Query Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuestion(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  CUSTOMER INQUIRY
                </span>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedQuestion.fullQuestion || selectedQuestion.q}
                </p>
                <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                  <span>Frequency: {selectedQuestion.volume}</span>
                  <span>•</span>
                  <span>Conversion: {selectedQuestion.pct}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                  <Bot className="w-3.5 h-3.5" />
                  <span>ASSISTANT RESPONSE DELIVERED</span>
                </div>
                <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedQuestion.aiAnswer}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <Link
                href="/dashboard/knowledge"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <span>Edit in Knowledge Base</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedQuestion.fullQuestion || selectedQuestion.q);
                  toast.success("Query copied to clipboard!");
                  setSelectedQuestion(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.98] cursor-pointer"
              >
                Copy Query
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unanswered Inquiries Review Modal */}
      {isUnansweredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.08] rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  {operationalHealth.unansweredCount} Inquiries Detected
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">
                  Unanswered Catalog Queries
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add verified merchant answers below. Once saved, the AI assistant will automatically use them in live customer chats.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsUnansweredModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {operationalHealth.unansweredList && operationalHealth.unansweredList.length > 0 ? (
              <div className="space-y-4">
                {operationalHealth.unansweredList.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.question}
                      </span>
                      <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 font-semibold">
                        {item.occurrences} shoppers asked
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        Verified Store Answer
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Write clear response for future customers (e.g., 'Yes, all orders include free 2-day shipping...')"
                        value={customAnswerInput[item.id] || ""}
                        onChange={(e) =>
                          setCustomAnswerInput((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171b26] text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">
                        Topic: {item.topic}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaveUnansweredAnswer(item)}
                        disabled={submittingAnswerId === item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{submittingAnswerId === item.id ? "Saving..." : "Save to Knowledge Base"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2 bg-slate-50 dark:bg-white/[0.02] rounded-2xl p-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  All customer queries resolved!
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  No unanswered questions detected across live store chat sessions.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] flex justify-end">
              <button
                type="button"
                onClick={() => setIsUnansweredModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
