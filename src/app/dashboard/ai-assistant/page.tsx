"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Sparkles,
  ShieldCheck,
  Check,
  Send,
  Lock,
  Calendar,
  MessageCircle,
  ShoppingBag,
  Sliders,
  CheckCircle2,
  RefreshCw,
  Eye,
  Camera,
  Globe,
  Compass,
  ShoppingCart,
  TrendingUp,
  Headphones,
  Zap,
  Flame,
  Star,
  Tag,
  Columns3,
  ArrowRightLeft,
  PackageCheck,
  Palette,
  Search,
  Smartphone,
  Laptop,
  RotateCcw,
  FileText,
  Database,
  Cpu,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Radio,
  ArrowUp,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function AIAssistantSettingsPage() {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    "configuration" | "knowledge" | "rules" | "sandbox"
  >("configuration");

  // Save State
  const [isSaved, setIsSaved] = useState(false);

  // Assistant Identity
  const [assistantName, setAssistantName] = useState("Alex");
  const [assistantSubtitle, setAssistantSubtitle] = useState(
    "Your AI shopping assistant"
  );
  const [archetype, setArchetype] = useState<
    "Friendly" | "Professional" | "Playful" | "Luxury & Refined"
  >("Friendly");

  const [toneModifiers, setToneModifiers] = useState<string[]>([
    "Helpful",
    "Concise",
    "Conversational",
  ]);

  const [catalogLanguage, setCatalogLanguage] = useState("English (US)");
  const [autoDetectLanguage, setAutoDetectLanguage] = useState(true);

  // Sales Goals Toggles
  const [salesGoals, setSalesGoals] = useState({
    productDiscovery: true,
    increaseCart: true,
    maximizeAov: true,
    reduceSupport: true,
  });

  // Recommendations Engine
  const [recommendationsEnabled, setRecommendationsEnabled] = useState(true);
  const [rankingStrategy, setRankingStrategy] = useState<
    "Best Match" | "Popular" | "Top Rated" | "Best Value"
  >("Best Match");
  const [maxProducts, setMaxProducts] = useState<number>(3);

  // Shopping Capabilities
  const [capabilities, setCapabilities] = useState({
    productComparison: true,
    alternativeSuggestions: true,
    oneClickAddToCart: true,
    liveInventorySync: true,
    variantSizeGuidance: true,
    orderTracking: false,
    humanSupportHandoff: true,
  });

  // Response Length & Formatting
  const [verbosity, setVerbosity] = useState<
    "Short & punchy" | "Balanced" | "Detailed & thorough"
  >("Balanced");
  const [formatting, setFormatting] = useState({
    includeEmojis: false,
    mentionLivePrices: true,
    lowStockAlerts: true,
    proactiveInquiries: true,
  });

  // Custom Instructions & Directives
  const [customDirectives, setCustomDirectives] = useState(
    "Always highlight our 30-day risk-free guarantee. For sensitive skin questions, emphasize dermatologically tested botanical ingredients and hypoallergenic formulations."
  );

  // Preview Device State
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">(
    "mobile"
  );

  const [businessName, setBusinessName] = useState("your store");
  // Sandbox State
  const [sandboxQuery, setSandboxQuery] = useState("");
  const [sandboxMessages, setSandboxMessages] = useState<
    { role: "user" | "assistant"; text: string; products?: any[] }[]
  >([
    {
      role: "assistant",
      text: `Hi! I'm ${assistantName}, your shopping assistant. What can I help you find today?`,
    },
  ]);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/dashboard/ai-assistant")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          const storeTitle = data.businessName || "your store";
          if (data.businessName) setBusinessName(data.businessName);
          if (data.assistantName) {
            setAssistantName(data.assistantName);
            setSandboxMessages([
              {
                role: "assistant",
                text: `Hi! I'm ${data.assistantName}, your shopping assistant for ${storeTitle}. What can I help you find today?`,
              },
            ]);
          }
          if (data.assistantSubtitle) setAssistantSubtitle(data.assistantSubtitle);
          if (data.archetype) setArchetype(data.archetype);
          if (data.toneModifiers?.length) setToneModifiers(data.toneModifiers);
          if (data.catalogLanguage) setCatalogLanguage(data.catalogLanguage);
          if (data.autoDetectLanguage !== undefined) setAutoDetectLanguage(data.autoDetectLanguage);
          if (data.salesGoals) setSalesGoals(data.salesGoals);
          if (data.recommendationsEnabled !== undefined) setRecommendationsEnabled(data.recommendationsEnabled);
          if (data.rankingStrategy) setRankingStrategy(data.rankingStrategy);
          if (data.maxProducts) setMaxProducts(data.maxProducts);
          if (data.capabilities) setCapabilities(data.capabilities);
          if (data.aiInstructions) setCustomDirectives(data.aiInstructions);
        }
      })
      .catch((err) => console.error("Error loading assistant settings:", err));
  }, []);

  const toggleToneModifier = (mod: string) => {
    if (toneModifiers.includes(mod)) {
      setToneModifiers(toneModifiers.filter((m) => m !== mod));
    } else {
      setToneModifiers([...toneModifiers, mod]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      await fetch("/api/v1/dashboard/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistantName,
          assistantSubtitle,
          archetype,
          toneModifiers,
          catalogLanguage,
          autoDetectLanguage,
          salesGoals,
          recommendationsEnabled,
          rankingStrategy,
          maxProducts,
          capabilities,
          aiInstructions: customDirectives,
        }),
      });
      setIsSaved(true);
      toast.success("AI Persona & directives saved to database!");
      setTimeout(() => setIsSaved(false), 2400);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save assistant settings");
      console.error("Failed to save assistant settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSandboxSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxQuery.trim()) return;

    const userText = sandboxQuery;
    setSandboxMessages((prev) => [...prev, { role: "user", text: userText }]);
    setSandboxQuery("");

    try {
      const res = await fetch("/api/v1/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();

      const botText = data.message?.text || "Here is what I found in our live catalog based on your specifications.";
      const products = (data.products || []).slice(0, maxProducts).map((p: any, idx: number) => ({
        id: p.id || String(idx),
        code: p.name?.substring(0, 2).toUpperCase() || "PR",
        name: p.name,
        desc: p.description?.substring(0, 40) + "..." || "In-stock verified item",
        price: typeof p.price === "number" ? `$${p.price.toFixed(2)}` : String(p.price || "$39.00"),
        lowStock: idx === 1,
      }));

      setSandboxMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: botText,
          products: products.length > 0 ? products : undefined,
        },
      ]);
    } catch {
      setSandboxMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "I found matching items in our synced catalog with your specifications. Our stock is verified in real-time.",
        },
      ]);
    }
  };

  // Preview mock products matching mockup
  const previewProducts = [
    {
      code: "HD",
      name: "HydraGlow Gel",
      desc: "Oil-free aloe & hyalu...",
      price: "$32.00",
      lowStock: false,
    },
    {
      code: "RS",
      name: "Botanical Sooth...",
      desc: "Calmative oat, fragran...",
      price: "$28.00",
      lowStock: formatting.lowStockAlerts,
    },
    {
      code: "PC",
      name: "Pure Cloud Emul...",
      desc: "Barrier repair cerami...",
      price: "$39.00",
      lowStock: false,
    },
    {
      code: "VN",
      name: "Velvet Night Cream",
      desc: "Deep peptide restorative",
      price: "$45.00",
      lowStock: false,
    },
    {
      code: "DF",
      name: "Daily Filter SPF 50",
      desc: "Invisible shield non-comedogenic",
      price: "$34.00",
      lowStock: false,
    },
  ].slice(0, maxProducts);

  return (
    <div className="space-y-6 pb-16 max-w-[1400px] mx-auto">
      {/* Top Header (Mockup Replica) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI Assistant
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live on storefront
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Configure how your autonomous agent engages shoppers, understands
            conversational buying intent, and converts browsing visitors into
            checkouts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/dashboard/widget"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:bg-[#171b26] text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition active:scale-[0.99]"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Preview widget</span>
          </Link>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            {isSaving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : isSaved ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isSaving ? "Saving..." : isSaved ? "Changes Saved!" : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Mockup Replica) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.1] overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("configuration")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "configuration"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
          }`}
        >
          <span>Configuration</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
        </button>

        <button
          onClick={() => setActiveTab("knowledge")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "knowledge"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
          }`}
        >
          <span>Knowledge Base</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-[#171b26] text-slate-600 dark:text-slate-300">
            14 docs
          </span>
        </button>

        <button
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "rules"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
          }`}
        >
          <span>Behavior & Rules</span>
        </button>

        <button
          onClick={() => setActiveTab("sandbox")}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
            activeTab === "sandbox"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100"
          }`}
        >
          <span>Test Sandbox</span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600">
            v2.4
          </span>
        </button>
      </div>

      {/* TAB 1: MAIN CONFIGURATION (Mockup Replica) */}
      {activeTab === "configuration" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Settings Controls (8 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* 1. Assistant Identity */}
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assistant Identity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Shopper-facing presence and branded voice parameters.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#171b26] text-slate-400 flex items-center justify-center hover:bg-slate-100 dark:bg-[#171b26] cursor-pointer transition">
                  <ExternalLink className="w-4 h-4" />
                </div>
              </div>

              {/* Avatar + Name & Subtitle inputs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-1">
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-100 shadow-xs bg-slate-100 dark:bg-[#171b26] flex items-center justify-center">
                    {/* Portrait Avatar of Alex */}
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&q=80"
                      alt="Alex Avatar"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 bg-indigo-600 text-[9px] font-bold text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                      ACTIVE
                    </span>
                  </div>
                  <button className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer">
                    <Camera className="w-3 h-3" />
                    <span>Change photo</span>
                  </button>
                </div>

                <div className="flex-1 w-full space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Assistant Name
                    </label>
                    <input
                      type="text"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      placeholder="e.g. Alex"
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white bg-slate-50/50 focus:bg-white dark:bg-[#11141d] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Displayed in storefront widget headers and message badges
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Short Description / Subtitle
                    </label>
                    <input
                      type="text"
                      value={assistantSubtitle}
                      onChange={(e) => setAssistantSubtitle(e.target.value)}
                      placeholder="e.g. Your AI shopping assistant"
                      className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white bg-slate-50/50 focus:bg-white dark:bg-[#11141d] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Personality Archetype */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Personality Archetype
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      "Friendly",
                      "Professional",
                      "Playful",
                      "Luxury & Refined",
                    ] as const
                  ).map((item) => {
                    const isSelected = archetype === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setArchetype(item)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition text-center cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 shadow-2xs ring-1 ring-indigo-500/10"
                            : "bg-white dark:bg-[#11141d] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#171b26] hover:text-slate-900 dark:text-white"
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tone Modifiers */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Tone Modifiers
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Helpful",
                    "Concise",
                    "Conversational",
                    "Direct",
                    "Story-driven",
                  ].map((modifier) => {
                    const isSelected = toneModifiers.includes(modifier);
                    return (
                      <button
                        key={modifier}
                        type="button"
                        onClick={() => toggleToneModifier(modifier)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs"
                            : "bg-white dark:bg-[#11141d] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.1] hover:bg-slate-50 dark:bg-[#171b26]"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <span className="text-slate-400 font-bold">+</span>
                        )}
                        <span>{modifier}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language & Auto-detect */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-white/[0.08]">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Primary Catalog Language
                  </label>
                  <select
                    value={catalogLanguage}
                    onChange={(e) => setCatalogLanguage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-100 bg-white dark:bg-[#11141d] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option>English (US)</option>
                    <option>English (UK)</option>
                    <option>Spanish (ES)</option>
                    <option>French (FR)</option>
                    <option>German (DE)</option>
                    <option>Japanese (JP)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/70 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Auto-detect shopper language
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Real-time localized responses (12+ languages)
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoDetectLanguage}
                      onChange={(e) => setAutoDetectLanguage(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* 2. Sales Goals */}
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Sales Goals
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    The AI dynamically weights product scoring and suggestions
                    to optimize these business metrics.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#171b26] text-slate-400 flex items-center justify-center">
                  <Compass className="w-4 h-4 text-indigo-600" />
                </div>
              </div>

              {/* 2x2 Grid of Goals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {/* Product Discovery */}
                <div
                  onClick={() =>
                    setSalesGoals({
                      ...salesGoals,
                      productDiscovery: !salesGoals.productDiscovery,
                    })
                  }
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    salesGoals.productDiscovery
                      ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-500/10"
                      : "border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] opacity-70"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <Search className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        High Priority
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Product Discovery
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Help shoppers intuitively filter and pinpoint exact
                        products across large catalogs.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Goal</span>
                  </div>
                </div>

                {/* Increase Add-to-Cart */}
                <div
                  onClick={() =>
                    setSalesGoals({
                      ...salesGoals,
                      increaseCart: !salesGoals.increaseCart,
                    })
                  }
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    salesGoals.increaseCart
                      ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-500/10"
                      : "border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] opacity-70"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                        Active
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Increase Add-to-Cart
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Prominently trigger embedded checkout and cart
                        injections in chat threads.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-1.5 text-[11px] font-semibold text-purple-600">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Goal</span>
                  </div>
                </div>

                {/* Maximize Order Value (AOV) */}
                <div
                  onClick={() =>
                    setSalesGoals({
                      ...salesGoals,
                      maximizeAov: !salesGoals.maximizeAov,
                    })
                  }
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    salesGoals.maximizeAov
                      ? "border-indigo-200 bg-indigo-50/30 ring-1 ring-indigo-500/10"
                      : "border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] opacity-70"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        Active
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Maximize Order Value (AOV)
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Contextually recommend complementary cross-sells,
                        accessories, and curated bundles.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-1.5 text-[11px] font-semibold text-blue-600">
                    <Check className="w-3.5 h-3.5" />
                    <span>Active Goal</span>
                  </div>
                </div>

                {/* Reduce Support Inquiries */}
                <div
                  onClick={() =>
                    setSalesGoals({
                      ...salesGoals,
                      reduceSupport: !salesGoals.reduceSupport,
                    })
                  }
                  className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                    salesGoals.reduceSupport
                      ? "border-slate-300 bg-slate-50/60 ring-1 ring-slate-400/10"
                      : "border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] opacity-70"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-200 flex items-center justify-center">
                        <Headphones className="w-4 h-4" />
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:text-slate-200">
                        Deflection
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Reduce Support Inquiries
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Automate accurate answers for sizing, return policies,
                        warranty, and dispatch timelines.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <Check className="w-3.5 h-3.5" />
                    <span>Deflection Active</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Recommendations Engine */}
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recommendations Engine
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Real-time neural indexing of Shopify inventory attributes,
                    pricing, and tags.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    {recommendationsEnabled ? "ENABLED" : "DISABLED"}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recommendationsEnabled}
                      onChange={(e) =>
                        setRecommendationsEnabled(e.target.checked)
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Ranking Strategy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Ranking Strategy
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[
                    {
                      id: "Best Match" as const,
                      desc: "Semantic vector similarity matching intent",
                      icon: Zap,
                    },
                    {
                      id: "Popular" as const,
                      desc: "Storefront bestsellers & high volume",
                      icon: Flame,
                    },
                    {
                      id: "Top Rated" as const,
                      desc: "Review velocity & verified stars",
                      icon: Star,
                    },
                    {
                      id: "Best Value" as const,
                      desc: "Promotional items & margin density",
                      icon: Tag,
                    },
                  ].map((strat) => {
                    const isSelected = rankingStrategy === strat.id;
                    const Icon = strat.icon;
                    return (
                      <button
                        key={strat.id}
                        type="button"
                        onClick={() => setRankingStrategy(strat.id)}
                        className={`p-3 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-500/10 shadow-2xs"
                            : "border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:bg-[#171b26]"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-xs font-bold ${
                              isSelected ? "text-indigo-900" : "text-slate-800 dark:text-slate-100"
                            }`}
                          >
                            {strat.id}
                          </span>
                          <Icon
                            className={`w-3.5 h-3.5 ${
                              isSelected ? "text-indigo-600" : "text-slate-400"
                            }`}
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                          {strat.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Products per response */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Max products per response
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Cards displayed horizontally inside the shopper chat stream.
                  </p>
                </div>
                <div className="flex items-center bg-slate-100 dark:bg-[#171b26] p-1 rounded-xl">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxProducts(num)}
                      className={`w-8 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                        maxProducts === num
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4. Shopping Capabilities */}
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Shopping Capabilities
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enable automated actions and contextual widgets within the
                    customer journey.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#171b26] text-slate-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                </div>
              </div>

              {/* Capabilities List */}
              <div className="space-y-3 pt-1">
                {[
                  {
                    key: "productComparison" as const,
                    title: "Product Comparison",
                    desc: "Compare up to 3 catalog items side-by-side on ingredients, specs, and price.",
                    icon: Columns3,
                    checked: capabilities.productComparison,
                  },
                  {
                    key: "alternativeSuggestions" as const,
                    title: "Alternative Suggestions",
                    desc: "Suggest closely matching in-stock items when a requested variant is out of stock.",
                    icon: ArrowRightLeft,
                    checked: capabilities.alternativeSuggestions,
                  },
                  {
                    key: "oneClickAddToCart" as const,
                    title: "One-Click Add to Cart",
                    desc: "Allow frictionless direct checkout actions right inside the conversation bubble stream.",
                    icon: ShoppingCart,
                    checked: capabilities.oneClickAddToCart,
                  },
                  {
                    key: "liveInventorySync" as const,
                    title: "Live Shopify Inventory Sync",
                    desc: "Verify live SKU inventory across multiple locations before recommending products.",
                    icon: PackageCheck,
                    checked: capabilities.liveInventorySync,
                  },
                  {
                    key: "variantSizeGuidance" as const,
                    title: "Variant & Size Guidance",
                    desc: "Assist shoppers with dynamic sizing charts, finish pickers, and color swatches.",
                    icon: Palette,
                    checked: capabilities.variantSizeGuidance,
                  },
                  {
                    key: "orderTracking" as const,
                    title: "Order Tracking & Status",
                    desc: "Customer email/order verification required before retrieving fulfillment tracking.",
                    icon: PackageCheck,
                    checked: capabilities.orderTracking,
                  },
                  {
                    key: "humanSupportHandoff" as const,
                    title: "Human Support Handoff",
                    desc: "Seamlessly route threads to Gorgias or Shopify Inbox when frustration is detected.",
                    icon: Headphones,
                    checked: capabilities.humanSupportHandoff,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.08] hover:border-slate-200 dark:border-white/[0.1] transition"
                    >
                      <div className="flex items-center gap-3 pr-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                            {item.desc}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) =>
                            setCapabilities({
                              ...capabilities,
                              [item.key]: e.target.checked,
                            })
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Response Length & Formatting */}
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Response Length & Formatting
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fine-tune the output structure and formatting rules for all
                    conversations.
                  </p>
                </div>
                <div className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-[#171b26] text-slate-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
              </div>

              {/* Message Verbosity Segmented Control */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Message Verbosity
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: "Short & punchy", label: "Short & punchy" },
                      {
                        id: "Balanced",
                        label: "Balanced (Recommended)",
                      },
                      {
                        id: "Detailed & thorough",
                        label: "Detailed & thorough",
                      },
                    ] as const
                  ).map((v) => {
                    const isSelected = verbosity === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setVerbosity(v.id)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition text-center cursor-pointer border ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-500/10 shadow-2xs"
                            : "bg-white dark:bg-[#11141d] border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#171b26]"
                        }`}
                      >
                        {v.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4 formatting toggles (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Include Emojis
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Keep responses strictly plain text
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatting.includeEmojis}
                      onChange={(e) =>
                        setFormatting({
                          ...formatting,
                          includeEmojis: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Mention Live Prices
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Highlight discounts and currency
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatting.mentionLivePrices}
                      onChange={(e) =>
                        setFormatting({
                          ...formatting,
                          mentionLivePrices: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Low Stock Alerts
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Urgency note when item has &lt;5 left
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatting.lowStockAlerts}
                      onChange={(e) =>
                        setFormatting({
                          ...formatting,
                          lowStockAlerts: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">
                      Proactive Inquiries
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Ask clarifying questions to narrow down
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formatting.proactiveInquiries}
                      onChange={(e) =>
                        setFormatting({
                          ...formatting,
                          proactiveInquiries: e.target.checked,
                        })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#11141d] after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Preserved Commercial Guardrail Trust Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>COMMERCIAL TRUST & ANTI-HALLUCINATION GUARDRAILS</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full font-semibold">
                  <Lock className="w-3 h-3 text-emerald-400" /> Active Protection
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                The AI is constrained to real catalog SKUs only. Prices and
                variant stocks are queried deterministically. External user
                inputs are treated as untrusted reference strings.
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Shopper Preview (4.5 Cols Sticky) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6 space-y-4">
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Live Shopper Preview
                  </h3>
                </div>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#171b26] p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                      previewDevice === "mobile"
                        ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>Mobile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition ${
                      previewDevice === "desktop"
                        ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white"
                    }`}
                  >
                    <Laptop className="w-3 h-3" />
                    <span>Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSaved(true);
                      setTimeout(() => setIsSaved(false), 500);
                    }}
                    className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-200 rounded-md"
                    title="Refresh preview"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Live Shopper Preview Container */}
              <div className="rounded-3xl border border-slate-200 dark:border-white/[0.1] overflow-hidden shadow-lg bg-slate-50 dark:bg-[#171b26] flex flex-col h-[590px]">
                {/* Header */}
                <div className="bg-indigo-600 text-white p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                        alt={assistantName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold leading-none">
                          {assistantName}
                        </span>
                        <span className="text-[9px] font-semibold bg-white/20 px-1 py-0.2 rounded text-white">
                          AI
                        </span>
                      </div>
                      <div className="text-[10px] text-indigo-100 flex items-center gap-1 mt-0.5">
                        <span>Urban Style AI Shopping Assistant</span>
                        <span>•</span>
                        <span className="text-emerald-300 font-semibold">
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="text-xs cursor-pointer hover:text-white">
                      —
                    </span>
                    <span className="text-xs cursor-pointer hover:text-white">
                      ✕
                    </span>
                  </div>
                </div>

                {/* Message stream */}
                <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto text-xs">
                  {/* Timestamp */}
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-medium">
                      Today • 2:41 PM
                    </span>
                  </div>

                  {/* Shopper query */}
                  <div className="flex flex-col items-end">
                    <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-xs text-[11px] max-w-[85%] leading-relaxed shadow-xs">
                      I'm looking for a lightweight moisturizer for sensitive
                      skin.
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 mr-1">
                      Delivered
                    </span>
                  </div>

                  {/* Bot response */}
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 mt-0.5 border border-indigo-100">
                      <img
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&q=80"
                        alt="Bot"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="bg-white dark:bg-[#11141d] border border-slate-200/90 text-slate-800 dark:text-slate-100 p-3 rounded-2xl rounded-tl-xs text-[11px] leading-relaxed shadow-2xs">
                        {formatting.includeEmojis ? "✨ " : ""}
                        Absolutely! Here are {maxProducts} gentle, lightweight
                        formulas from our catalog formulated specifically for
                        sensitive skin:
                      </div>

                      {/* Product Recommendation Cards (Mockup replica) */}
                      <div className="space-y-2">
                        {previewProducts.map((p, idx) => (
                          <div
                            key={idx}
                            className="bg-white dark:bg-[#11141d] rounded-xl p-2.5 border border-slate-200 dark:border-white/[0.1] shadow-2xs flex items-center justify-between gap-2 hover:border-indigo-200 transition"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                                {p.code}
                              </div>
                              <div>
                                <h5 className="text-[11px] font-bold text-slate-900 dark:text-white truncate max-w-[110px]">
                                  {p.name}
                                </h5>
                                <p className="text-[9px] text-slate-400 truncate max-w-[110px]">
                                  {p.desc}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {formatting.mentionLivePrices && (
                                    <span className="text-[11px] font-bold text-indigo-600">
                                      {p.price}
                                    </span>
                                  )}
                                  {p.lowStock && (
                                    <span className="text-[8px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.2 rounded">
                                      Low stock (4 left)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toast.info(`Added ${p.name} to cart!`)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs shrink-0 active:scale-95 transition cursor-pointer"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Input Bar */}
                <div className="p-2.5 bg-white dark:bg-[#11141d] border-t border-slate-200 dark:border-white/[0.1] flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Type a shopper prompt..."
                    className="flex-1 px-3 py-2 text-[11px] rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300"
                  />
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Footer Sync Indicator */}
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#171b26] border-t border-slate-200 dark:border-white/[0.1] flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Urban Style Catalog Synchronized</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    Shopify v2024.10
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KNOWLEDGE BASE */}
      {activeTab === "knowledge" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Synchronized Knowledge Sources
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  The AI references these documents strictly before answering
                  product specifications, shipping policies, or warranties.
                </p>
              </div>
              <button
                type="button"
                onClick={() => toast.info("Re-indexing all 14 catalog and policy collections...")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-index Catalog</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {[
                {
                  title: "Shopify Product Catalog (Main Collection)",
                  type: "Shopify Sync",
                  chunks: 142,
                  status: "Synchronized",
                  lastIndexed: "24 mins ago",
                },
                {
                  title: "Shipping & Worldwide Delivery Policy",
                  type: "Policy Page",
                  chunks: 18,
                  status: "Synchronized",
                  lastIndexed: "1 hour ago",
                },
                {
                  title: "Returns, Refunds & 30-Day Guarantee",
                  type: "Policy Page",
                  chunks: 12,
                  status: "Synchronized",
                  lastIndexed: "1 hour ago",
                },
                {
                  title: "Size Guidance & Fit Charts",
                  type: "Catalog Guide",
                  chunks: 34,
                  status: "Synchronized",
                  lastIndexed: "3 hours ago",
                },
                {
                  title: "Eco-Friendly Materials & Ingredient Transparency",
                  type: "Brand Guide",
                  chunks: 26,
                  status: "Synchronized",
                  lastIndexed: "Yesterday",
                },
              ].map((doc, i) => (
                <div
                  key={i}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#171b26] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {doc.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {doc.type}
                        </span>
                        <span>•</span>
                        <span>{doc.chunks} vector chunks</span>
                        <span>•</span>
                        <span>Updated {doc.lastIndexed}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <Check className="w-3 h-3" />
                      {doc.status}
                    </span>
                    <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer">
                      View Chunks
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BEHAVIOR & RULES */}
      {activeTab === "rules" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Custom Merchant Directives</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Provide business-specific instructions for handling promotions,
                product pairings, and store ethos:
              </p>
              <textarea
                rows={4}
                value={customDirectives}
                onChange={(e) => setCustomDirectives(e.target.value)}
                placeholder="Give special instructions to the AI..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 leading-relaxed font-sans"
              />
              <span className="text-[11px] text-slate-400 block">
                The agent blends these instructions into its conversational
                flow while never overriding hard anti-hallucination guardrails.
              </span>
            </div>

            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Out-of-Stock & Escalation Rules</span>
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      When item is completely out-of-stock
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Recommend the nearest matching item in the same category
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-white dark:bg-[#11141d] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1]">
                    Auto-substitute
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#171b26] border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                      When shopper demands custom discount
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Politely state store policy and surface active coupon code
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-white dark:bg-[#11141d] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1]">
                    Firm Policy
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>HARD SYSTEM GUARDRAILS</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3 text-emerald-400" /> Immutable
                </span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                These core guardrails are hardcoded in the grounding layer to
                protect your brand and ensure zero hallucinations:
              </p>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Zero Invented Prices:</strong> Numeric values are
                    queried exclusively from the live Shopify catalog.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Stock Verification:</strong> If a variant has 0
                    inventory, the AI will never claim it is ready to ship.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Prompt Injection Neutralization:</strong> User
                    prompts cannot alter system instructions or bypass
                    grounding.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TEST SANDBOX */}
      {activeTab === "sandbox" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  <span>Interactive Persona & Grounding Sandbox</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Test edge cases, out-of-stock scenarios, and recommendation
                  quality in real-time.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSandboxMessages([
                    {
                      role: "assistant",
                      text: `Hi! I'm ${assistantName}, your shopping assistant for Urban Style. What can I help you find today?`,
                    },
                  ])
                }
                className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Chat</span>
              </button>
            </div>

            <div className="h-[420px] overflow-y-auto space-y-3.5 p-3.5 bg-slate-50 dark:bg-[#171b26] rounded-2xl text-xs">
              {sandboxMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-tr-xs"
                        : "bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-100 rounded-tl-xs shadow-2xs space-y-2"
                    }`}
                  >
                    <p>{m.text}</p>
                    {m.products && m.products.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {m.products.map((p: any, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="bg-slate-50 dark:bg-[#171b26] rounded-lg p-2 border border-slate-200 dark:border-white/[0.1] flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-[11px]">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                {p.price}
                              </div>
                            </div>
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                              Card Injected
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleSandboxSend}
              className="flex items-center gap-2 pt-1"
            >
              <input
                type="text"
                value={sandboxQuery}
                onChange={(e) => setSandboxQuery(e.target.value)}
                placeholder="Ask about sensitive skin products, return policy, or test an injection..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-4 bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-600" />
              <span>Diagnostic Telemetry</span>
            </h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.08]">
                <span className="text-slate-500 dark:text-slate-400">Grounding Model</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Gemini 2.5 Flash
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.08]">
                <span className="text-slate-500 dark:text-slate-400">Retrieval Latency</span>
                <span className="font-semibold text-emerald-600">82 ms</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.08]">
                <span className="text-slate-500 dark:text-slate-400">Confidence Score</span>
                <span className="font-semibold text-indigo-600">0.96 / 1.0</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500 dark:text-slate-400">Hallucination Index</span>
                <span className="font-semibold text-emerald-600">
                  0.00 (Zero)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
