"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ClientCache, executeSwr } from "@/lib/cache/clientCache";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import {
  Calendar,
  MessageSquare,
  ArrowUpRight,
  Eye,
  Filter,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Plus,
  Bot,
  ChevronDown,
  AlertCircle,
  ArrowDownRight,
  Layers,
  X,
  Send,
  UserCheck,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface FunnelStage {
  stage: number;
  name: string;
  volume: number;
  progression: string;
  drop: string;
  dropCount: number;
  attributedRevenue: string;
  avgTime: string;
  topIntent: string;
  color: string;
  barColor: string;
  widthPct: number;
}

interface FunnelData {
  conversations: number;
  clicks: number;
  cart: number;
  purchases: number;
  clicksProgression: string;
  clicksDrop: string;
  cartProgression: string;
  cartDrop: string;
  purchaseProgression: string;
  overallConversionRate: string;
  stages: FunnelStage[];
}

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: string;
  recs: number;
  clicks: number;
  cartRate: string;
  orders: number;
  attributedRevenue: string;
  stock: number;
  rating: string;
  color: string;
  imageUrl?: string;
}

interface ConversationItem {
  id: string;
  query: string;
  fullQuery: string;
  aiReply: string;
  target: string;
  time: string;
  action: string;
  actionType: "cart" | "checkout" | "view" | "lead";
  channel: string;
  leadInfo?: { name?: string; email?: string; phone?: string } | null;
}

interface QuestionItem {
  id: string;
  q: string;
  category: string;
  count: number;
  note: string;
}

interface OpportunityItem {
  title: string;
  description: string;
  estimatedImpact: string;
}

const DATE_RANGES = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "All time", value: "all" },
];

export default function DashboardOverviewPage() {
  const [selectedRange, setSelectedRange] = useState("30d");
  const [showRangeDropdown, setShowRangeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userName, setUserName] = useState("Merchant");
  const [businessName, setBusinessName] = useState("Your Store");

  // Funnel Graph State: active hovered stage index (0 to 3)
  const [hoveredFunnelStage, setHoveredFunnelStage] = useState<number>(0);
  const [funnelViewMode, setFunnelViewMode] = useState<"graph" | "bars">("graph");

  // Product hover card state
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);

  // Selected conversation modal/card state
  const [activeConversation, setActiveConversation] = useState<ConversationItem | null>(null);

  // Answer Question Modal state
  const [answeringQuestion, setAnsweringQuestion] = useState<QuestionItem | null>(null);
  const [answerContent, setAnswerContent] = useState("");
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  const [metrics, setMetrics] = useState({
    totalRevenue: "$0.00",
    revenueNumeric: 0,
    revenueGrowth: "+0.0%",
    salesCount: 0,
    aov: "$0.00",
    totalProducts: 0,
    activeProducts: 0,
    totalKnowledgeSources: 0,
    totalLeads: 0,
    leadsGrowth: "+0.0%",
    conversations: 0,
    prevConversations: 0,
    conversationsGrowth: "+0.0%",
    conversionRate: "0.0%",
  });

  const [funnel, setFunnel] = useState<FunnelData>({
    conversations: 0,
    clicks: 0,
    cart: 0,
    purchases: 0,
    clicksProgression: "0.0",
    clicksDrop: "0.0",
    cartProgression: "0.0",
    cartDrop: "0.0",
    purchaseProgression: "0.0",
    overallConversionRate: "0.0%",
    stages: [],
  });

  const [topProducts, setTopProducts] = useState<ProductItem[]>([]);
  const [recentConversations, setRecentConversations] = useState<ConversationItem[]>([]);
  const [unansweredQuestions, setUnansweredQuestions] = useState<QuestionItem[]>([]);
  const [opportunity, setOpportunity] = useState<OpportunityItem>({
    title: "CATALOG OPPORTUNITY",
    description: "Connect additional knowledge articles and product tags to increase automated conversational conversion.",
    estimatedImpact: "Estimated +$1,200/mo",
  });

  // Dynamic Greeting based on client local time
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRangeDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Dashboard Overview Data
  const applyDashboardData = (data: any) => {
    if (data.user?.name) setUserName(data.user.name);
    if (data.business?.name) setBusinessName(data.business.name);
    if (data.metrics) setMetrics(data.metrics);
    if (data.funnel) {
      setFunnel(data.funnel);
      if (data.funnel.stages && data.funnel.stages.length > 0) {
        setHoveredFunnelStage(0);
      }
    }
    if (Array.isArray(data.topProducts)) setTopProducts(data.topProducts);
    if (Array.isArray(data.recentConversations)) setRecentConversations(data.recentConversations);
    if (Array.isArray(data.unansweredQuestions)) setUnansweredQuestions(data.unansweredQuestions);
    if (data.opportunity) setOpportunity(data.opportunity);
  };

  const fetchDashboardData = async (rangeKey = selectedRange, silent = false) => {
    const cacheKey = `client:overview:${rangeKey}`;
    const cached = ClientCache.get<any>(cacheKey);

    if (cached && !silent) {
      applyDashboardData(cached);
      setIsLoading(false);
      if (ClientCache.isFresh(cacheKey)) return;
      setIsRefreshing(true);
    } else if (!silent) {
      setIsLoading(true);
    }
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/v1/dashboard/overview?range=${rangeKey}`, {
        cache: "no-store",
      });
      const data = await res.json();
      ClientCache.set(cacheKey, data);
      applyDashboardData(data);

      if (data.user?.name) setUserName(data.user.name);
      if (data.business?.name) setBusinessName(data.business.name);

      if (data.metrics) setMetrics(data.metrics);
      if (data.funnel) {
        setFunnel(data.funnel);
        if (data.funnel.stages && data.funnel.stages.length > 0) {
          setHoveredFunnelStage(0);
        }
      }
      if (Array.isArray(data.topProducts)) setTopProducts(data.topProducts);
      if (Array.isArray(data.recentConversations)) setRecentConversations(data.recentConversations);
      if (Array.isArray(data.unansweredQuestions)) setUnansweredQuestions(data.unansweredQuestions);
      if (data.opportunity) setOpportunity(data.opportunity);
    } catch (err) {
      console.warn("Failed to fetch live overview data:", err);
      toast.error("Could not sync latest metrics from database.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedRange);
  }, [selectedRange]);

  const handleSelectRange = (rangeVal: string) => {
    setSelectedRange(rangeVal);
    setShowRangeDropdown(false);
  };

  const handleManualRefresh = () => {
    ClientCache.invalidate("client:overview");
    fetchDashboardData(selectedRange, true);
    toast.success("Dashboard metrics synced with database!");
  };

  // Save Knowledge Chunk from Unanswered Question
  const handleSaveAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answeringQuestion || !answerContent.trim()) return;

    setIsSavingAnswer(true);
    try {
      const res = await fetch("/api/v1/dashboard/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: answeringQuestion.q,
          type: "faq",
          content: answerContent.trim(),
        }),
      });

      if (res.ok) {
        toast.success("Answer added to Knowledge Base!");
        // Remove from local list
        setUnansweredQuestions((prev) => prev.filter((q) => q.id !== answeringQuestion.id));
        setAnsweringQuestion(null);
        setAnswerContent("");
      } else {
        toast.error("Failed to save answer to Knowledge Base.");
      }
    } catch {
      toast.error("Error communicating with knowledge base.");
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const currentRangeLabel =
    DATE_RANGES.find((r) => r.value === selectedRange)?.label || "Last 30 days";

  const activeStage =
    funnel.stages && funnel.stages[hoveredFunnelStage]
      ? funnel.stages[hoveredFunnelStage]
      : funnel.stages?.[0] || null;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* 1. Header & Live Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {greeting}, {userName}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync • {businessName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time conversational performance, catalog indexing, and customer conversions.
          </p>
        </div>

        {/* Date Dropdown, Refresh & View Conversations */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Refresh button */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition active:scale-[0.99] cursor-pointer shadow-2xs"
            title="Refresh database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          {/* Date Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setShowRangeDropdown(!showRangeDropdown)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/[0.04] shadow-2xs transition active:scale-[0.99] cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              <span>{currentRangeLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRangeDropdown && (
              <div className="absolute right-0 mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] shadow-xl p-1.5 z-40">
                {DATE_RANGES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleSelectRange(r.value)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition flex items-center justify-between ${
                      selectedRange === r.value
                        ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <span>{r.label}</span>
                    {selectedRange === r.value && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/dashboard/conversations"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-500/20 transition active:scale-[0.99]"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>View Conversations</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. KPI Summary Cards (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: AI Conversations */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI Conversations</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" /> {metrics.conversationsGrowth}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              {isLoading ? (
                <div className="h-8 w-24 bg-slate-100 dark:bg-white/[0.06] rounded-lg animate-pulse" />
              ) : (
                metrics.conversations.toLocaleString()
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>vs {metrics.prevConversations.toLocaleString()} prior cycle</span>
            <svg className="w-16 h-5" viewBox="0 0 60 20" fill="none">
              <path d="M 2 16 Q 20 18 35 10 T 58 4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 2: Catalog Products */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Catalog Offerings</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" /> {metrics.activeProducts} Active
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              {isLoading ? (
                <div className="h-8 w-24 bg-slate-100 dark:bg-white/[0.06] rounded-lg animate-pulse" />
              ) : (
                `${metrics.totalProducts} In Store`
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>{metrics.totalKnowledgeSources} Knowledge docs</span>
            <svg className="w-16 h-5" viewBox="0 0 60 20" fill="none">
              <path d="M 2 17 Q 20 14 35 11 T 58 3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 3: Captured Leads */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Captured Leads</span>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" /> {metrics.leadsGrowth}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              {isLoading ? (
                <div className="h-8 w-24 bg-slate-100 dark:bg-white/[0.06] rounded-lg animate-pulse" />
              ) : (
                `${metrics.totalLeads} Shoppers`
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
            <span>{metrics.conversionRate} conversion</span>
            <svg className="w-16 h-5" viewBox="0 0 60 20" fill="none">
              <path d="M 2 18 Q 20 15 35 12 T 58 5" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Card 4: AI Influenced Revenue */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border-2 border-indigo-600/30 dark:border-indigo-500/30 shadow-md shadow-indigo-600/5 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-full blur-xl pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>AI Influenced Revenue</span>
              </div>
              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" /> {metrics.revenueGrowth}
              </span>
            </div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3 tracking-tight">
              {isLoading ? (
                <div className="h-8 w-28 bg-slate-100 dark:bg-white/[0.06] rounded-lg animate-pulse" />
              ) : (
                metrics.totalRevenue
              )}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <span>
              {metrics.salesCount} sales • {metrics.aov} AOV
            </span>
            <Link
              href="/dashboard/analytics"
              className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
              aria-label="View breakdown"
            >
              <Eye className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. AI Sales Performance Interactive Chart */}
      <PerformanceChart />

      {/* 4. Dynamic Conversion Funnel Graph & Live Top AI-Recommended Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Dynamic Conversion Funnel with Interactive Hover Graph */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Conversion Funnel Graph</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Hover over any stage on the graph below to inspect drop-off and conversion telemetry.
                </p>
              </div>

              {/* View Switcher Pill */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFunnelViewMode("graph")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    funnelViewMode === "graph"
                      ? "bg-white dark:bg-[#171b26] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Graph
                </button>
                <button
                  type="button"
                  onClick={() => setFunnelViewMode("bars")}
                  className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                    funnelViewMode === "bars"
                      ? "bg-white dark:bg-[#171b26] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  Bars
                </button>
              </div>
            </div>

            {/* Funnel Graph Visualizer */}
            {isLoading ? (
              <div className="mt-6 h-64 bg-slate-50 dark:bg-white/[0.02] rounded-2xl animate-pulse" />
            ) : funnelViewMode === "graph" ? (
              <div className="mt-6 space-y-4">
                {/* 4 Interactive Funnel Stages */}
                <div className="grid grid-cols-4 gap-2">
                  {funnel.stages.map((stg, sIdx) => {
                    const isHovered = hoveredFunnelStage === sIdx;
                    return (
                      <div
                        key={stg.stage}
                        onMouseEnter={() => setHoveredFunnelStage(sIdx)}
                        onClick={() => setHoveredFunnelStage(sIdx)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-center relative ${
                          isHovered
                            ? "bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-600/15 shadow-sm scale-[1.02]"
                            : "bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Step {stg.stage}
                        </div>
                        <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {stg.volume.toLocaleString()}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          {stg.name}
                        </div>

                        {/* Visual Funnel Bar fill */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-white/[0.08] mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stg.color}`}
                            style={{ width: `${stg.widthPct}%` }}
                          />
                        </div>

                        {/* Active Arrow indicator */}
                        {isHovered && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45 rounded-xs" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Floating Interactive Stage Detail Card (When Hovering) */}
                {activeStage && (
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-slate-50 dark:from-indigo-950/40 dark:via-[#11141d] dark:to-[#171b26] border border-indigo-200/80 dark:border-indigo-800/40 shadow-md animate-fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {activeStage.stage}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                              {activeStage.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                              {activeStage.volume.toLocaleString()} Total
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Top Intent: <strong className="text-slate-700 dark:text-slate-200">{activeStage.topIntent}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center sm:justify-end gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>{activeStage.progression}% Conversion</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {activeStage.avgTime}
                        </div>
                      </div>
                    </div>

                    {/* Detailed metrics grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3.5 text-xs">
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Drop-off Rate</span>
                        <div className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>-{activeStage.drop}%</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{activeStage.dropCount} visitors dropped</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Attributed Value</span>
                        <div className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                          {activeStage.attributedRevenue}
                        </div>
                        <span className="text-[10px] text-slate-400">At this funnel level</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Stage Velocity</span>
                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                          {activeStage.avgTime}
                        </div>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Autonomous flow</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Funnel Step-by-Step Bars View */
              <div className="mt-6 space-y-5">
                {funnel.stages.map((stg) => (
                  <div
                    key={stg.stage}
                    onMouseEnter={() => setHoveredFunnelStage(stg.stage - 1)}
                    className="p-3 rounded-2xl hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                          {stg.stage}
                        </span>
                        <span>{stg.name}</span>
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {stg.volume.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${stg.color} transition-all duration-700`}
                        style={{ width: `${stg.widthPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        &darr; {stg.progression}% progression
                      </span>
                      <span className="text-rose-500 font-medium">-{stg.drop}% drop</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Callout box */}
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Overall AI visitor-to-sale conversion rate is <strong>{funnel.overallConversionRate}</strong> (
              {funnel.purchases} completed checkouts in {currentRangeLabel.toLowerCase()}).
            </p>
          </div>
        </div>

        {/* 5. Live Top AI-Recommended Products */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Top AI-recommended products</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live database items generating conversational clicks and purchases.
                </p>
              </div>
              <Link
                href="/dashboard/products"
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 inline-flex items-center gap-1 transition"
              >
                <span>View catalog</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Product items list */}
            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-12 bg-slate-50 dark:bg-white/[0.03] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : topProducts.length > 0 ? (
              <div className="mt-4 divide-y divide-slate-50 dark:divide-white/[0.04]">
                {topProducts.map((prod) => {
                  const isHovered = hoveredProductId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onMouseEnter={() => setHoveredProductId(prod.id)}
                      onMouseLeave={() => setHoveredProductId(null)}
                      className={`py-3 px-2 rounded-2xl transition ${
                        isHovered
                          ? "bg-indigo-50/40 dark:bg-indigo-950/30"
                          : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {prod.imageUrl ? (
                            <img
                              src={prod.imageUrl}
                              alt={prod.name}
                              className="w-10 h-10 rounded-xl object-cover bg-slate-100 dark:bg-slate-800 shrink-0 border border-slate-200/60 dark:border-white/[0.08]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.05] border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-center shrink-0 text-slate-400">
                              <ShoppingBag className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {prod.name}
                              </span>
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${prod.color}`}>
                                {prod.category}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              <strong className="text-slate-700 dark:text-slate-300">{prod.price}</strong> • {prod.recs} recs •{" "}
                              {prod.clicks} clicks
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{prod.cartRate}</div>
                          <div className="text-[10px] text-slate-400">cart rate</div>
                        </div>
                      </div>

                      {/* Expandable Hover Telemetry Card */}
                      {isHovered && (
                        <div className="mt-2.5 pt-2.5 border-t border-indigo-100 dark:border-indigo-900/30 grid grid-cols-3 gap-2 text-[11px] animate-fade-in">
                          <div className="text-slate-500 dark:text-slate-400">
                            Orders: <strong className="text-slate-800 dark:text-slate-200">{prod.orders}</strong>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            Revenue: <strong className="text-emerald-600 dark:text-emerald-400">{prod.attributedRevenue}</strong>
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 text-right">
                            Stock: <strong className="text-slate-800 dark:text-slate-200">{prod.stock} units</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <ShoppingBag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No products indexed yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Add offerings to your catalog so your AI assistant can recommend them to visitors.
                </p>
                <Link
                  href="/dashboard/products"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Product</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Live Recent Conversations & 7. Unanswered Questions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Live Recent Conversations */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent conversations</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Click on any conversation below to inspect the dialogue and shopper details.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="mt-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-50 dark:bg-white/[0.03] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentConversations.length > 0 ? (
              <div className="mt-4 space-y-3.5">
                {recentConversations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setActiveConversation(item)}
                    className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.08] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:shadow-xs transition cursor-pointer"
                  >
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                      &ldquo;{item.query}&rdquo;
                    </p>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] gap-2">
                      <div className="flex items-center gap-1.5 text-slate-400 truncate">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                          {item.target}
                        </span>
                        <span>•</span>
                        <span className="shrink-0">{item.time}</span>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold text-[10px] shrink-0 ${
                          item.actionType === "cart"
                            ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                            : item.actionType === "checkout"
                            ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                            : item.actionType === "lead"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            : "bg-slate-200 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.action}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Bot className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No conversations recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                  Embed your shopper widget snippet into your website to begin recording live customer sessions.
                </p>
                <Link
                  href="/dashboard/widget"
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  <span>Get Widget Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-xs">
            <Link
              href="/dashboard/conversations"
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition"
            >
              <span>View all {metrics.conversations.toLocaleString()} conversations</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3 h-3" /> Live database feed
            </span>
          </div>
        </div>

        {/* 7. Unanswered Questions & Catalog Opportunity */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Unanswered questions</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Customer queries needing answers in your store knowledge base.
                </p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-xs font-bold border border-rose-100 dark:border-rose-800/40">
                {unansweredQuestions.length} action items
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {unansweredQuestions.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-slate-200 dark:hover:border-white/[0.15] transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      &ldquo;{item.q}&rdquo;
                    </h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.note}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAnsweringQuestion(item);
                      setAnswerContent("");
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition active:scale-[0.98] shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Answer</span>
                  </button>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/knowledge"
              className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
            >
              <span>Manage all Knowledge Base articles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* AI Opportunity Box */}
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40">
            <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{opportunity.title}</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 leading-relaxed">
              {opportunity.description}
            </p>
            <div className="mt-3 pt-3 border-t border-indigo-100/60 dark:border-indigo-800/30 flex items-center justify-between text-xs">
              <Link
                href="/dashboard/ai-assistant"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
              >
                Tune AI assistant guardrails &rarr;
              </Link>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                {opportunity.estimatedImpact}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Conversation Details Card */}
      {activeConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setActiveConversation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Conversation Session</h3>
                <p className="text-xs text-slate-400">{activeConversation.time} • Channel: {activeConversation.channel}</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* User Question */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06]">
                <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Shopper Inquiry:</div>
                <p className="text-slate-900 dark:text-white">&ldquo;{activeConversation.fullQuery}&rdquo;</p>
              </div>

              {/* AI Reply */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/40">
                <div className="font-bold text-indigo-700 dark:text-indigo-400 mb-1 flex items-center gap-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>AI Assistant Reply:</span>
                </div>
                <p className="text-slate-800 dark:text-slate-200">{activeConversation.aiReply}</p>
              </div>

              {/* Lead Info if captured */}
              {activeConversation.leadInfo && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/40">
                  <div className="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Captured Customer Lead:</span>
                  </div>
                  <div className="text-[11px] text-slate-700 dark:text-slate-300 space-y-0.5">
                    {activeConversation.leadInfo.name && <div>Name: <strong>{activeConversation.leadInfo.name}</strong></div>}
                    {activeConversation.leadInfo.email && <div>Email: <strong>{activeConversation.leadInfo.email}</strong></div>}
                    {activeConversation.leadInfo.phone && <div>Phone: <strong>{activeConversation.leadInfo.phone}</strong></div>}
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Outcome: <strong className="text-indigo-600 dark:text-indigo-400">{activeConversation.action}</strong>
                </span>

                <Link
                  href="/dashboard/conversations"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition active:scale-[0.99] flex items-center gap-1"
                >
                  <span>Open Full Thread</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Answer Unanswered Question Modal */}
      {answeringQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-3xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setAnsweringQuestion(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">Answer Customer Question</h3>
                <p className="text-xs text-slate-400">{answeringQuestion.category} • {answeringQuestion.count} shopper asks</p>
              </div>
            </div>

            <form onSubmit={handleSaveAnswer} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] text-xs">
                <div className="font-bold text-slate-500 mb-0.5">Customer Inquiry:</div>
                <div className="font-semibold text-slate-900 dark:text-white">&ldquo;{answeringQuestion.q}&rdquo;</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Official Store Answer *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Yes, we provide full warranty coverage and expedited delivery options..."
                  value={answerContent}
                  onChange={(e) => setAnswerContent(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs text-slate-900 dark:text-white bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Once saved, your AI assistant will immediately use this answer in live shopper conversations.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAnsweringQuestion(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAnswer}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-[0.99] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSavingAnswer ? "Saving to Knowledge..." : "Save Answer"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
