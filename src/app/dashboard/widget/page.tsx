"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sliders,
  CheckCircle2,
  Check,
  Smartphone,
  Laptop,
  Eye,
  RefreshCw,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  MessageSquare,
  Send,
  X,
  Sun,
  Moon,
  Monitor,
  Check as CheckIcon,
  Pencil,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  Volume2,
  Type,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function WidgetCustomizerPage() {
  // Top Banner & Sync state
  const [activeTab, setActiveTab] = useState<
    "appearance" | "launcher" | "behavior" | "copy_ai" | "all"
  >("appearance");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [isSaved, setIsSaved] = useState(false);

  // 1. Appearance & Styling state
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    "bottom-right"
  );
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("light");
  const [brandColor, setBrandColor] = useState("#4F46E5");
  const [canvasSize, setCanvasSize] = useState<"compact" | "standard" | "large">(
    "standard"
  );
  const [borderRadius, setBorderRadius] = useState<"16px" | "8px" | "4px">("16px");

  // 2. Floating Launcher Pill state
  const [launcherCallout, setLauncherCallout] = useState("Ask us anything");
  const [showLauncherText, setShowLauncherText] = useState(true);
  const [showSparkleMark, setShowSparkleMark] = useState(true);
  const [showAvailabilityChip, setShowAvailabilityChip] = useState(true);
  const [enableSoundAlert, setEnableSoundAlert] = useState(true);

  // 3. Smart Triggers & Rules state
  const [autoOpen, setAutoOpen] = useState(true);
  const [openDelay, setOpenDelay] = useState("8");
  const [targetPdp, setTargetPdp] = useState(true);
  const [targetCollections, setTargetCollections] = useState(true);
  const [targetCart, setTargetCart] = useState(true);
  const [targetHome, setTargetHome] = useState(false);
  const [hesitationDetection, setHesitationDetection] = useState(true);

  // 4. Copy & AI Greetings state
  const [widgetTitle, setWidgetTitle] = useState("NESale");
  const [widgetSubtitle, setWidgetSubtitle] = useState(
    "Your AI shopping assistant • Urban Style"
  );
  const [welcomeGreeting, setWelcomeGreeting] = useState(
    "I can help with that! The TrailPro on your screen is fully IPX6 waterproof and fits up to 16-inch laptops. Here are two other verified options that match your daily commute:"
  );
  const [inputPlaceholder, setInputPlaceholder] = useState(
    "Ask about sizing, materials, shipping..."
  );
  const [quickChips, setQuickChips] = useState<string[]>([
    "Is it machine washable?",
    "What is the return window?",
    "Compare models",
  ]);

  // Interactive Live Preview state
  const [chatOpen, setChatOpen] = useState(true);
  const [previewInput, setPreviewInput] = useState("");
  const [cartBadge, setCartBadge] = useState<string | null>(null);

  const [previewMessages, setPreviewMessages] = useState<
    { role: "user" | "assistant"; text: string; products?: any[] }[]
  >([
    {
      role: "user",
      text: "I need a waterproof backpack for a 15-inch laptop.",
    },
    {
      role: "assistant",
      text: "I can help with that! The TrailPro on your screen is fully IPX6 waterproof and fits up to 16-inch laptops. Here are two other verified options that match your daily commute:",
      products: [
        {
          id: "p1",
          name: "Aethel Rolltop 28L",
          match: "98% Match • Welded Seams",
          price: "$129.00",
        },
        {
          id: "p2",
          name: "Aura Commuter Pro",
          match: "94% Match • Dedicated Laptop",
          price: "$145.00",
        },
      ],
    },
  ]);

  const [businessId, setBusinessId] = useState("");
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  React.useEffect(() => {
    fetch("/api/v1/widget/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.businessId) setBusinessId(data.businessId);
        if (data.config) {
          if (data.config.primaryColor) setBrandColor(data.config.primaryColor);
          if (data.config.position) setPosition(data.config.position);
          if (data.config.welcomeMessage) setWelcomeGreeting(data.config.welcomeMessage);
          if (data.config.assistantName) setWidgetTitle(data.config.assistantName);
        }
      })
      .catch((err) => console.warn("Failed to load widget config:", err));
  }, []);

  const embedCode = `<script src="${typeof window !== 'undefined' ? window.location.origin : 'https://nesale.com'}/widget.js" data-business-id="${businessId || 'your-business-id'}" data-position="${position}" async></script>`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedSnippet(true);
    toast.info("1-line embed snippet copied to clipboard!");
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleSave = async () => {
    setIsSaved(true);
    try {
      const res = await fetch("/api/v1/widget/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          primaryColor: brandColor,
          position,
          welcomeMessage: welcomeGreeting,
          assistantName: widgetTitle,
          showBranding: true,
        }),
      });
      if (res.ok) {
        toast.success("Widget configuration published live!");
      }
    } catch (err: any) {
      toast.error("Failed to save widget config");
    }
    setTimeout(() => setIsSaved(false), 2400);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewInput.trim()) return;

    const userText = previewInput;
    const nextMessages = [...previewMessages, { role: "user" as const, text: userText }];
    setPreviewMessages(nextMessages);
    setPreviewInput("");

    try {
      const res = await fetch("/api/v1/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.text,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setPreviewMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.message,
            products: data.products?.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.priceMin ? `$${Number(p.priceMin).toFixed(2)}` : "$89.00",
              match: "Verified Catalog Match",
            })),
          },
        ]);
      } else {
        throw new Error();
      }
    } catch {
      setPreviewMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Based on your store catalog, here is a recommended match for "${userText}":`,
          products: [
            {
              id: "p3",
              name: "Nordik Trailpack 30L Pro",
              match: "99% Match • In Stock",
              price: "$129.00",
            },
          ],
        },
      ]);
    }
  };

  const handleAddToCart = (name: string) => {
    setCartBadge(name);
    setTimeout(() => setCartBadge(null), 2500);
  };

  return (
    <div className="space-y-5 pb-16 max-w-[1400px] mx-auto">
      {/* 1. Header Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ShopperWidget
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Customize how NESale appears to shoppers on your store.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Device switcher */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#171b26] text-slate-600 dark:text-slate-300 text-xs font-semibold">
            <button
              onClick={() => setDevice("desktop")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                device === "desktop"
                  ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs"
                  : "hover:text-slate-900 dark:text-white"
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                device === "mobile"
                  ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs"
                  : "hover:text-slate-900 dark:text-white"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:bg-[#171b26] text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            {isSaved ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isSaved ? "Saved!" : "Save changes"}</span>
          </button>
        </div>
      </div>

      {/* 2. Status Banner */}
      <div className="bg-white dark:bg-[#11141d] rounded-2xl px-5 py-3 border border-slate-100 dark:border-white/[0.08] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Status: Live on Storefront (v2.4.2)
          </span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            Auto-synced with Shopify theme:{" "}
            <strong className="text-slate-700 dark:text-slate-200">Dawn v12.0.1</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setBrandColor("#4F46E5");
              setPosition("bottom-right");
              setLauncherCallout("Ask us anything");
            }}
            className="px-3 py-1 rounded-lg border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#171b26] font-medium cursor-pointer"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* 3. Interactive Tabbed Navigation (Now fully functional!) */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2 text-xs font-semibold overflow-x-auto">
        {[
          { id: "appearance" as const, label: "Appearance" },
          { id: "launcher" as const, label: "Launcher" },
          { id: "behavior" as const, label: "Behavior" },
          { id: "copy_ai" as const, label: "Copy & AI" },
          { id: "all" as const, label: "All Settings" },
        ].map((t) => {
          const isCurrent = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 rounded-xl transition cursor-pointer border whitespace-nowrap ${
                isCurrent
                  ? "bg-white dark:bg-[#11141d] text-indigo-600 shadow-2xs border-slate-200 dark:border-white/[0.1] font-bold ring-1 ring-indigo-500/10"
                  : "bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:bg-[#171b26]"
              }`}
            >
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Settings (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* TAB 1: Appearance & Styling */}
          {(activeTab === "appearance" || activeTab === "all") && (
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Appearance & Styling
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure placement, colorway, and viewport boundaries.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 uppercase">
                  ACTIVE
                </span>
              </div>

              {/* Widget Screen Position */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Widget Screen Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPosition("bottom-right")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-start justify-between ${
                      position === "bottom-right"
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10"
                        : "border-slate-200 dark:border-white/[0.1] hover:bg-slate-50 dark:bg-[#171b26]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Bottom Right
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Recommended default
                      </div>
                    </div>
                    {position === "bottom-right" && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPosition("bottom-left")}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer flex items-start justify-between ${
                      position === "bottom-left"
                        ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10"
                        : "border-slate-200 dark:border-white/[0.1] hover:bg-slate-50 dark:bg-[#171b26]"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Bottom Left
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        For inverted navs
                      </div>
                    </div>
                    {position === "bottom-left" && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    )}
                  </button>
                </div>
              </div>

              {/* Interface Theme */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Interface Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "System", icon: Monitor },
                  ].map((th) => {
                    const Icon = th.icon;
                    const isSel = themeMode === th.id;
                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => setThemeMode(th.id as any)}
                        className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSel
                            ? "border-indigo-600 bg-indigo-50/40 text-indigo-900"
                            : "border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:bg-[#171b26]"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{th.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Brand Accent Color */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Brand Accent Color
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {brandColor}
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  {[
                    "#4F46E5",
                    "#059669",
                    "#0F172A",
                    "#991B1B",
                    "#7C3AED",
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setBrandColor(c)}
                      className={`w-8 h-8 rounded-xl transition cursor-pointer flex items-center justify-center ${
                        brandColor === c
                          ? "ring-2 ring-offset-2 ring-indigo-600 scale-105"
                          : ""
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {brandColor === c && (
                        <CheckIcon className="w-3.5 h-3.5 text-white" />
                      )}
                    </button>
                  ))}
                  <div className="flex items-center pl-1">
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-20 px-2 py-1 text-[11px] font-mono border border-slate-200 dark:border-white/[0.1] rounded-lg text-slate-700 dark:text-slate-200 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Canvas Size & Corner Radius */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Widget Canvas Size
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-100 dark:bg-[#171b26] p-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {(["compact", "standard", "large"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setCanvasSize(s)}
                        className={`flex-1 py-1 rounded-lg capitalize transition cursor-pointer ${
                          canvasSize === s
                            ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs font-bold"
                            : ""
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                    Corner Radius
                  </label>
                  <div className="flex items-center rounded-xl bg-slate-100 dark:bg-[#171b26] p-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    {(["16px", "8px", "4px"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBorderRadius(r)}
                        className={`flex-1 py-1 rounded-lg transition cursor-pointer ${
                          borderRadius === r
                            ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-2xs font-bold"
                            : ""
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Floating Launcher Pill */}
          {(activeTab === "launcher" || activeTab === "all") && (
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Floating Launcher Pill
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customize callout text and ambient animations.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Launcher Callout Copy
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={launcherCallout}
                    onChange={(e) => setLauncherCallout(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 pr-9"
                  />
                  <Pencil className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Show launcher text pill
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      Displays text bubble next to the icon on desktop viewports
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showLauncherText}
                    onChange={(e) => setShowLauncherText(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Show AI sparkle mark
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      Adds dynamic ambient sparkle glow & badge indicator
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showSparkleMark}
                    onChange={(e) => setShowSparkleMark(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Online availability chip
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      Shows &quot;AI Online&quot; micro badge above floating
                      bubble
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={showAvailabilityChip}
                    onChange={(e) => setShowAvailabilityChip(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                      Chime audio on trigger
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      Plays gentle notification ping when proactive greeting fires
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableSoundAlert}
                    onChange={(e) => setEnableSoundAlert(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Smart Triggers & Rules (Behavior) */}
          {(activeTab === "behavior" || activeTab === "all") && (
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Smart Triggers & Rules
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Control autonomous greetings and page targeting.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/60 border border-slate-100 dark:border-white/[0.08]">
                <div>
                  <h5 className="text-xs font-semibold text-slate-900 dark:text-white">
                    Open chat window automatically
                  </h5>
                  <p className="text-[10px] text-slate-400">
                    Expand widget when intent thresholds are met
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoOpen}
                  onChange={(e) => setAutoOpen(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Autonomous opening delay
                </label>
                <select
                  value={openDelay}
                  onChange={(e) => setOpenDelay(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="5">Open after 5 seconds</option>
                  <option value="8">Open after 8 seconds (Recommended)</option>
                  <option value="15">Open after 15 seconds</option>
                  <option value="30">Open after 30 seconds</option>
                </select>
              </div>

              {/* Target Pages */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Target Pages
                </span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-100 dark:border-white/[0.08]">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetPdp}
                        onChange={(e) => setTargetPdp(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Product Detail Pages (PDP)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                      1,284 PDPs
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-100 dark:border-white/[0.08]">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetCollections}
                        onChange={(e) => setTargetCollections(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Collection Browsing Pages</span>
                    </label>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700">
                      42 Collections
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-100 dark:border-white/[0.08]">
                    <label className="flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetCart}
                        onChange={(e) => setTargetCart(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      <span>Cart Drawer & Checkout Entry</span>
                    </label>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                      Full Cart
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2 rounded-xl border border-slate-100 dark:border-white/[0.08] text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={targetHome}
                        onChange={(e) => setTargetHome(e.target.checked)}
                        className="rounded text-slate-400"
                      />
                      <span>Store Homepage</span>
                    </label>
                    <span className="text-[10px]">Disabled</span>
                  </div>
                </div>
              </div>

              {/* Hesitation Detection Engine */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Hesitation Detection Engine</span>
                  </div>
                  <p className="text-[10px] text-indigo-800 mt-0.5 leading-relaxed">
                    Sends contextual query if user views product for &gt;15s without ATC.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={hesitationDetection}
                  onChange={(e) => setHesitationDetection(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Copy & AI Greetings */}
          {(activeTab === "copy_ai" || activeTab === "all") && (
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/[0.08]">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Type className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Copy & Assistant Branding
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Customize headers, greeting text, and quick prompt chips.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Widget Header Title
                </label>
                <input
                  type="text"
                  value={widgetTitle}
                  onChange={(e) => setWidgetTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Subtitle / Presence Label
                </label>
                <input
                  type="text"
                  value={widgetSubtitle}
                  onChange={(e) => setWidgetSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Input Placeholder
                </label>
                <input
                  type="text"
                  value={inputPlaceholder}
                  onChange={(e) => setInputPlaceholder(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                  Quick Action Chips
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {quickChips.map((c, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.1]"
                    >
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickChips(quickChips.filter((_, idx) => idx !== i))
                        }
                        className="hover:text-rose-600 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const defaultChips = ["Shipping Times", "Size Guide", "Order Status", "Return Window"];
                    const nextChip = defaultChips[quickChips.length % defaultChips.length];
                    setQuickChips([...quickChips, nextChip]);
                    toast.success(`Added "${nextChip}" quick action chip!`);
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>+ Add chip</span>
                </button>
              </div>
            </div>
          )}

          {/* 1-Line Embed Script Generator Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-[#11141d] border border-indigo-100 dark:border-indigo-900/40 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-mono font-bold text-xs">
                  &lt;/&gt;
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block text-xs">
                    Storefront 1-Line Embed Code
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Paste before &lt;/body&gt; in Shopify theme.liquid, Webflow, or custom HTML
                  </span>
                </div>
              </div>
              <button
                onClick={handleCopySnippet}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto select-all border border-slate-800">
              <code>{embedCode}</code>
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span>Supports: Shopify, Webflow, WordPress, WooCommerce, Custom HTML</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready to Embed</span>
            </div>
          </div>

          {/* Persistent Dawn Theme Embed Card */}
          <div className="p-4 rounded-2xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.1] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Dawn Theme App Embed Block
                </span>
                <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Injection Active
                </span>
              </div>
            </div>
            <a
              href="https://admin.shopify.com"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Theme Editor</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: Real-Time Storefront Mockup (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#11141d] rounded-3xl p-5 sm:p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
          {/* Browser Window Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.08] text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
            </div>

            {/* URL bar */}
            <div className="flex-1 max-w-md mx-4 px-3 py-1 rounded-xl bg-slate-50 dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.1] text-[11px] text-slate-600 dark:text-slate-300 font-mono truncate flex items-center gap-1.5">
              <span>🔒</span>
              <span className="truncate">
                https://urbanstyle.com/products/trailpro-waterproof-backpack
              </span>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <Laptop className="w-3.5 h-3.5" />
              <Smartphone className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Storefront Mockup Canvas */}
          <div
            className={`mt-4 mx-auto w-full bg-slate-100/80 rounded-2xl p-4 sm:p-6 min-h-[580px] relative overflow-hidden flex flex-col justify-end border border-slate-200 dark:border-white/[0.1] ${
              device === "mobile" ? "max-w-sm" : ""
            }`}
          >
            {/* Background Store Content (PDP Mockup) */}
            <div className="absolute inset-0 p-5 pointer-events-none select-none">
              {/* Fake Store Nav */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                  URBAN STYLE
                </span>
                <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                  <span>Bags</span>
                  <span>Apparel</span>
                  <span>Accessories</span>
                </div>
              </div>

              {/* Fake PDP Product */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="h-44 bg-slate-200/90 rounded-2xl flex items-center justify-center text-slate-400">
                  <ShoppingBag className="w-16 h-16 opacity-50" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400">
                    Home / Bags / Commute
                  </span>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white leading-tight">
                    TrailPro Waterproof Backpack
                  </h4>
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    $89.00 USD
                  </div>
                  <div className="h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-[10px] font-bold">
                    Add to Cart
                  </div>
                </div>
              </div>
            </div>

            {/* Overlaid Live Widget */}
            <div
              className={`relative z-20 flex flex-col ${
                position === "bottom-left" ? "items-start" : "items-end"
              }`}
            >
              {/* Chat Drawer Window */}
              {chatOpen ? (
                <div
                  className={`w-full max-w-sm ${
                    themeMode === "dark"
                      ? "bg-[#11141d] border-white/[0.12] text-white"
                      : "bg-white dark:bg-[#11141d] border-slate-200/90 text-slate-800 dark:text-slate-100"
                  } border shadow-2xl flex flex-col overflow-hidden animate-in fade-in duration-150`}
                  style={{ borderRadius }}
                >
                  {/* Widget Header */}
                  <div
                    className="p-3.5 text-white flex items-center justify-between"
                    style={{ backgroundColor: brandColor }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                        S
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          <span>{widgetTitle}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        </div>
                        <div className="text-[9px] text-white/80 leading-tight">
                          {widgetSubtitle}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setChatOpen(false)}
                      className="p-1 hover:bg-white/10 rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Messages Stream */}
                  <div
                    className={`p-3.5 space-y-3 max-h-72 overflow-y-auto ${
                      themeMode === "dark" ? "bg-[#0c0e15]" : "bg-slate-50/50"
                    } text-xs`}
                  >
                    <div className="text-center text-[9px] text-slate-400 font-mono">
                      TODAY 2:41 PM
                    </div>

                    {previewMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex flex-col ${
                          msg.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <div
                          className={`p-2.5 max-w-[85%] text-xs leading-relaxed ${
                            msg.role === "user"
                              ? "text-white rounded-2xl rounded-tr-xs"
                              : themeMode === "dark"
                              ? "bg-[#171b26] border border-white/[0.08] text-slate-200 rounded-2xl rounded-tl-xs shadow-2xs"
                              : "bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-xs shadow-2xs"
                          }`}
                          style={
                            msg.role === "user"
                              ? { backgroundColor: brandColor }
                              : {}
                          }
                        >
                          {msg.text}
                        </div>

                        {/* Product Cards In Chat */}
                        {msg.products && (
                          <div className="mt-2 space-y-2 w-full max-w-xs">
                            {msg.products.map((p, pIdx) => (
                              <div
                                key={pIdx}
                                className={`${
                                  themeMode === "dark"
                                    ? "bg-[#171b26] border-white/[0.08]"
                                    : "bg-white dark:bg-[#11141d] border-slate-200 dark:border-white/[0.1]"
                                } border rounded-xl p-2.5 shadow-2xs flex items-center justify-between gap-2`}
                              >
                                <div className="min-w-0">
                                  <span className="text-[10px] text-indigo-500 font-bold block truncate">
                                    {p.match}
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      themeMode === "dark"
                                        ? "text-white"
                                        : "text-slate-900 dark:text-white"
                                    } block truncate`}
                                  >
                                    {p.name}
                                  </span>
                                  <span
                                    className={`text-xs font-bold ${
                                      themeMode === "dark"
                                        ? "text-slate-300"
                                        : "text-slate-800 dark:text-slate-100"
                                    }`}
                                  >
                                    {p.price}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleAddToCart(p.name)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shrink-0 cursor-pointer transition active:scale-[0.99]"
                                  style={{ backgroundColor: brandColor }}
                                >
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Cart Addition Toast in preview */}
                    {cartBadge && (
                      <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Added {cartBadge} to cart!</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  <div
                    className={`px-3 py-1.5 ${
                      themeMode === "dark"
                        ? "bg-[#11141d] border-white/[0.08]"
                        : "bg-white dark:bg-[#11141d] border-slate-100 dark:border-white/[0.08]"
                    } border-t flex flex-wrap gap-1`}
                  >
                    {quickChips.map((chip, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => {
                          setPreviewMessages((prev) => [
                            ...prev,
                            { role: "user", text: chip },
                          ]);
                        }}
                        className={`px-2 py-0.5 rounded-full border ${
                          themeMode === "dark"
                            ? "border-white/[0.10] text-indigo-400 hover:bg-white/[0.04]"
                            : "border-slate-200 dark:border-white/[0.1] text-indigo-600 hover:bg-slate-50 dark:bg-[#171b26]"
                        } text-[10px] font-semibold transition cursor-pointer`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  {/* Input form */}
                  <form
                    onSubmit={handleSendMessage}
                    className={`p-2.5 ${
                      themeMode === "dark"
                        ? "bg-[#11141d] border-white/[0.08]"
                        : "bg-white dark:bg-[#11141d] border-slate-100 dark:border-white/[0.08]"
                    } border-t flex items-center gap-1.5`}
                  >
                    <input
                      type="text"
                      value={previewInput}
                      onChange={(e) => setPreviewInput(e.target.value)}
                      placeholder={inputPlaceholder}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-xl ${
                        themeMode === "dark"
                          ? "bg-[#0c0e15] border-white/[0.10] text-white placeholder-slate-500"
                          : "bg-slate-50 dark:bg-[#171b26] border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder-slate-400"
                      } border focus:outline-none`}
                    />
                    <button
                      type="submit"
                      className="p-2 rounded-xl text-white shadow-2xs cursor-pointer active:scale-[0.99]"
                      style={{ backgroundColor: brandColor }}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              ) : (
                /* Floating Launcher Pill */
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => setChatOpen(true)}
                >
                  {showLauncherText && (
                    <button
                      className="px-3.5 py-2 rounded-full text-white text-xs font-semibold shadow-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      {showSparkleMark && <Sparkles className="w-3.5 h-3.5" />}
                      <span>{launcherCallout}</span>
                    </button>
                  )}
                  {!showLauncherText && (
                    <button
                      className="w-12 h-12 rounded-full text-white shadow-xl flex items-center justify-center transition active:scale-95 cursor-pointer"
                      style={{ backgroundColor: brandColor }}
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Link Bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
            <div className="flex items-center gap-2">
              <span>Preview connected store:</span>
              <span className="font-mono text-indigo-600 font-semibold">
                urbanstyle.com
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    "https://urbanstyle.com?preview_theme_id=nesale"
                  );
                }}
                className="hover:text-slate-800 dark:text-slate-100 transition cursor-pointer"
              >
                Copy test link
              </button>
              <a
                href="/"
                target="_blank"
                className="text-indigo-600 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Open in new tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
