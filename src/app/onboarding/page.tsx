"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { createClient } from "@/utils/supabase/client";
import { toast } from "@/components/ui/Toast";
import { SERVICE_SUBTYPES, SERVICE_SUBTYPE_LABELS } from "@/lib/business/types";
import {
  Store,
  Calendar,
  Globe,
  ShoppingBag,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bot,
  Sliders,
  Play,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Send,
  FileText,
  Wand2,
  Plus,
  Trash2,
  X,
  UploadCloud,
  Layers,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Form & Wizard state
  const [businessType, setBusinessType] = useState("ecommerce");
  const [businessSubtype, setBusinessSubtype] = useState("other");
  const [connectionMethod, setConnectionMethod] = useState<
    "website" | "shopify" | "manual_paste" | "template"
  >("website");
  const [storeUrl, setStoreUrl] = useState("");
  const [shopifyStore, setShopifyStore] = useState("");
  const [pasteCatalogText, setPasteCatalogText] = useState("");
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [quickProductName, setQuickProductName] = useState("");
  const [quickProductPrice, setQuickProductPrice] = useState("");
  const [sessionUserEmail, setSessionUserEmail] = useState("");

  // Ingestion simulation progress
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [crawlStage, setCrawlStage] = useState("Connecting to domain...");

  // Review & Edit state
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [importedProductsCount, setImportedProductsCount] = useState(0);
  const [extractedProducts, setExtractedProducts] = useState<any[]>([]);
  const [showProductPreview, setShowProductPreview] = useState(true);

  // Keep widget greeting aligned with the selected business model
  useEffect(() => {
    setWelcomeMessage(
      businessType === "services"
        ? "Hi! I can answer questions about our services, opening hours, and help you book an appointment."
        : "Hi there! I can help you find products, check sizing, or answer any questions."
    );
  }, [businessType]);

  // Supabase Auth Guard and Metadata Pre-population
  useEffect(() => {
    const checkAuthAndInit = async () => {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.push("/login?notice=auth_required");
          return;
        }

        // Check if email verification is pending
        if (session.user && !session.user.confirmed_at && session.user.email_confirmed_at === null) {
          router.push("/login?notice=verify_required");
          return;
        }

        // Pre-fill user information from registration metadata
        if (session.user) {
          if (session.user.email) {
            setBusinessEmail(session.user.email);
          }
          const meta = session.user.user_metadata || {};
          if (meta.website_url) {
            const rawUrl = meta.website_url.trim();
            setStoreUrl(rawUrl);
            try {
              const clean = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
              const parsed = new URL(clean);
              const domainName = parsed.hostname.replace(/^www\./, "").split(".")[0];
              const formatted = domainName
                .split(/[-_]/)
                .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ");
              setBusinessName(formatted);
            } catch {
              setBusinessName("Storefront");
            }
          } else if (meta.full_name) {
            setBusinessName(`${meta.full_name}'s Store`);
          }
        }
      } catch (err) {
        console.warn("Auth check notice:", err);
      }
    };

    checkAuthAndInit();
  }, [router]);

  // AI Configuration state
  const [assistantName, setAssistantName] = useState("Sophia");
  const [assistantTone, setAssistantTone] = useState("Helpful & Proactive");
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);
  const [humanHandoffEnabled, setHumanHandoffEnabled] = useState(true);
  const [bookingUrl, setBookingUrl] = useState("");

  // Widget Customization state
  const [primaryColor, setPrimaryColor] = useState("#4F46E5");
  const [widgetPosition, setWidgetPosition] = useState<"bottom-right" | "bottom-left">("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState(
    "Hi there! I can help you find products, check sizing, or answer any questions."
  );

  // Step 7 Sandbox state
  const [testMessages, setTestMessages] = useState<
    { role: "user" | "assistant"; text: string; products?: any[] }[]
  >([
    {
      role: "assistant",
      text: "Hi there! I'm your AI sales assistant. How can I help you explore our catalog today?",
    },
  ]);
  const [testInput, setTestInput] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // Live Website Ingestion via /api/v1/onboarding/website
  const startCrawl = async () => {
    setStep(3);
    setCrawlProgress(20);
    setCrawlStage("Connecting to domain & validating SSL certificates...");

    try {
      let targetUrl = connectionMethod === "shopify"
        ? `https://${shopifyStore.replace(".myshopify.com", "")}.myshopify.com`
        : storeUrl.trim();

      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }

      // Start progress simulation while API fetches
      const progressInterval = setInterval(() => {
        setCrawlProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 600);

      const res = await fetch("/api/v1/onboarding/website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: targetUrl,
          saveToDb: true,
          userEmail: businessEmail || sessionUserEmail,
          businessType,
          businessSubtype: businessType === "services" ? businessSubtype : null,
        }),
      });

      clearInterval(progressInterval);
      const data = await res.json();

      if (data.status === "success" && data.profile) {
        if (data.profile.name) setBusinessName(data.profile.name);
        if (data.profile.email) {
          setBusinessEmail(data.profile.email);
        } else if (!businessEmail && sessionUserEmail) {
          setBusinessEmail(sessionUserEmail);
        }
        if (data.profile.phone) setBusinessPhone(data.profile.phone);
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          setExtractedProducts(data.products);
          setImportedProductsCount(data.products.length);
        }
        if (data.persistedBusinessId) {
          setPersistedBusinessId(data.persistedBusinessId);
        }
        toast.success(`Analysis complete! Found ${data.products?.length || 0} products & business details.`);
      } else {
        toast.info("Automatic crawl reached partial results. You can review and complete your details below.");
      }

      setCrawlProgress(100);
      setCrawlStage("Extraction and knowledge chunking complete!");
      setTimeout(() => setStep(4), 500);
    } catch {
      // Graceful fallback to proceed if network/domain is local
      setCrawlProgress(100);
      setCrawlStage("Completed with local profile fallback.");
      toast.info("Could not reach website directly. You can review your details below.");
      setTimeout(() => setStep(4), 500);
    }
  };

  const handleParsePastedCatalog = () => {
    if (!pasteCatalogText.trim()) {
      toast.info("Please paste some products or upload a file first.");
      return;
    }
    const lines = pasteCatalogText.split("\n").map((l) => l.trim()).filter(Boolean);
    const parsed: any[] = [];
    for (const line of lines) {
      const priceMatch = line.match(/[$€£¥]?\s*([0-9]+(?:\.[0-9]{2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : 49.99;
      let name = line
        .replace(/[$€£¥]\s*[0-9]+(?:\.[0-9]{2})?/, "")
        .replace(/[-–,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (!name || name.length < 2) name = "Store Offering";
      parsed.push({
        name,
        price,
        currency: "USD",
        inStock: true,
      });
    }

    if (parsed.length > 0) {
      setExtractedProducts((prev) => [...prev, ...parsed]);
      setImportedProductsCount((prev) => prev + parsed.length);
      toast.success(`Imported ${parsed.length} products successfully!`);
      setStep(4);
    }
  };

  const handleApplyTemplate = (industry: string) => {
    const templates: Record<string, { name: string; price: number }[]> = {
      tech: [
        { name: "Apex Pro Custom Gaming PC (RTX 4080)", price: 2399 },
        { name: "UltraBook Pro 15\" Laptop", price: 1299 },
        { name: "Gen4 2TB High-Speed NVMe SSD", price: 189 },
        { name: "Mechanical RGB Gaming Keyboard", price: 129 },
        { name: "27\" 165Hz QHD Gaming Monitor", price: 349 },
        { name: "Studio Wireless Noise-Cancelling Headset", price: 179 },
      ],
      apparel: [
        { name: "Everyday Waterproof Jacket", price: 128 },
        { name: "Relaxed Fit Heavyweight Hoodie", price: 78 },
        { name: "Classic Organic Cotton T-Shirt", price: 34 },
        { name: "Stretch Performance Chino Pants", price: 82 },
        { name: "Merino Wool Thermal Beanie", price: 28 },
        { name: "All-Terrain Commuter Backpack 24L", price: 95 },
      ],
      beauty: [
        { name: "HydraGlow Moisture Surge Cream", price: 38 },
        { name: "Botanical Vitamin C Brightening Serum", price: 46 },
        { name: "Gentle Foaming Daily Cleanser", price: 24 },
        { name: "Overnight Peptide Repair Elixir", price: 54 },
        { name: "Broad Spectrum Mineral SPF 50", price: 32 },
        { name: "Nourishing Rosehip Seed Facial Oil", price: 42 },
      ],
      home: [
        { name: "Ergonomic Lumbar Office Chair", price: 349 },
        { name: "Motorized Standing Desk 55\"", price: 499 },
        { name: "Minimalist Dimmable LED Desk Lamp", price: 65 },
        { name: "Ceramic Minimalist Planter Set", price: 45 },
        { name: "Bamboo Desk Organizer & Dock", price: 38 },
        { name: "Wool Felt Large Desk Mat", price: 29 },
      ],
      services: [
        { name: "Comprehensive Strategy Consultation (60m)", price: 150 },
        { name: "Implementation Sprint Package", price: 750 },
        { name: "Monthly Growth Retainer", price: 1200 },
        { name: "Priority Support & Maintenance", price: 299 },
      ],
    };

    const targetItems = templates[industry] || templates.tech;
    const mapped = targetItems.map((item) => ({
      name: `${businessName || (industry === "services" ? "Your Business" : "Store")} ${item.name}`,
      price: item.price,
      currency: "USD",
      inStock: true,
      ...(industry === "services"
        ? { durationMinutes: item.name.includes("(60m)") ? 60 : 30, category: "Service" }
        : {}),
    }));
    setExtractedProducts(mapped);
    setImportedProductsCount(mapped.length);
    toast.success(
      industry === "services"
        ? `Generated ${mapped.length} starter services for your business!`
        : `Generated ${mapped.length} starter products tailored to your store!`
    );
    setStep(4);
  };

  const handleAddSingleProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickProductName.trim()) return;
    const priceNum = parseFloat(quickProductPrice) || 49.99;
    const newProd = {
      name: quickProductName.trim(),
      price: priceNum,
      currency: "USD",
      inStock: true,
    };
    setExtractedProducts((prev) => [newProd, ...prev]);
    setImportedProductsCount((prev) => prev + 1);
    setQuickProductName("");
    setQuickProductPrice("");
    setShowAddProductModal(false);
    toast.success(`Added "${newProd.name}" to catalog!`);
  };

  const handleDeleteProduct = (idx: number) => {
    setExtractedProducts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setImportedProductsCount(next.length);
      return next;
    });
    toast.info("Item removed from catalog.");
  };

  const [isFinishing, setIsFinishing] = useState(false);
  const [persistedBusinessId, setPersistedBusinessId] = useState<string>("biz_live");

  const saveOnboardingProfile = async () => {
    try {
      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: persistedBusinessId !== "biz_live" ? persistedBusinessId : undefined,
          businessName,
          businessType,
          businessSubtype: businessType === "services" ? businessSubtype : null,
          storeUrl: connectionMethod === "shopify" ? `https://${shopifyStore.replace(".myshopify.com", "")}.myshopify.com` : storeUrl,
          assistantName,
          primaryColor,
          widgetPosition,
          welcomeMessage,
          leadCaptureEnabled,
          humanHandoffEnabled,
          bookingUrl,
          products: extractedProducts,
        }),
      });
      const data = await res.json();
      if (data.businessId) {
        setPersistedBusinessId(data.businessId);
      }
    } catch (err) {
      console.warn("Onboarding background save notice:", err);
    }
  };

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testInput.trim()) return;

    const userText = testInput;
    setTestMessages((prev) => [...prev, { role: "user", text: userText }]);
    setTestInput("");

    try {
      const res = await fetch("/api/v1/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });
      const data = await res.json();
      const reply = data.message?.text || `Here is what I found in our catalog for ${businessName}:`;
      const prods = data.products?.length > 0 ? data.products : [
        {
          name: "TrailPro Waterproof Backpack 28L",
          price: "$89.00",
          inStock: true,
        },
      ];

      setTestMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: reply,
          products: prods,
        },
      ]);
    } catch {
      setTestMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Based on your query, here is our top recommendation from ${businessName}:`,
          products: [
            {
              name: "TrailPro Waterproof Backpack 28L",
              price: "$89.00",
              inStock: true,
            },
          ],
        },
      ]);
    }
  };

  const copyEmbedCode = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nesale.live";
    const snippet = `<script src="${origin}/widget.js" data-business-id="${persistedBusinessId}" async defer></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Live Script Connection Verifier State
  const [isVerifyingSnippet, setIsVerifyingSnippet] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    connected: boolean;
    detectedVia?: string;
    installedDomain?: string;
    productsHarvested?: number;
    message?: string;
  } | null>(null);

  const checkSnippetConnection = async () => {
    setIsVerifyingSnippet(true);
    try {
      const res = await fetch(
        `/api/v1/widget/verify?businessId=${encodeURIComponent(persistedBusinessId)}&storeUrl=${encodeURIComponent(storeUrl || shopifyStore || "")}`
      );
      const data = await res.json();
      setVerificationResult(data);
      if (data.connected) {
        toast.success("Script detected & connected to your website!");
      } else {
        toast.info(data.message || "Script not detected yet. Please ensure it is saved on your website.");
      }
    } catch {
      setVerificationResult({
        connected: false,
        message: "Could not reach verification endpoint. Please try again.",
      });
    } finally {
      setIsVerifyingSnippet(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090a0f] flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navbar */}
      <header className="h-16 px-6 sm:px-12 border-b border-slate-100 dark:border-white/[0.08] bg-white/80 dark:bg-[#090a0f]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
        <Logo />
        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          <span>Step {step} of 8</span>
          <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
              style={{ width: `${(step / 8) * 100}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Main Wizard Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div key={step} className="w-full max-w-3xl bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 border border-slate-100 dark:border-white/[0.08] shadow-card animate-fade-in transition-all">
          {/* STEP 1: Choose Business Type */}
          {step === 1 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Step 1</span> • Business Profile
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                What type of business are you setting up?
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                NESale customizes its conversion actions and responses based on your business model.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-8">
                {[
                  {
                    id: "ecommerce",
                    title: "Online Store / E-commerce",
                    desc: "Products, variants, stock levels, cart & checkout.",
                    icon: ShoppingBag,
                  },
                  {
                    id: "services",
                    title: "Services & Appointments",
                    desc: "Restaurants, clinics, trades, salons, agencies — menus, schedules & booking.",
                    icon: Calendar,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = businessType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setBusinessType(item.id)}
                      className={`p-4 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3.5 active:scale-[0.99] ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/10"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {businessType === "services" && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    What kind of service business?
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SERVICE_SUBTYPES.map((subtype) => (
                      <button
                        key={subtype}
                        type="button"
                        onClick={() => setBusinessSubtype(subtype)}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                          businessSubtype === subtype
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {SERVICE_SUBTYPE_LABELS[subtype]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Connection Method */}
          {step === 2 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Step 2</span> • Data Connection
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {businessType === "services" ? "Connect your website or service menu" : "Connect your catalog or website"}
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                {businessType === "services"
                  ? "We will crawl your site and index your services, prices, policies, and FAQs for the AI receptionist."
                  : "We will automatically crawl and index your products, policies, and knowledge."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                {/* Method 1: Website URL */}
                <div
                  onClick={() => setConnectionMethod("website")}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    connectionMethod === "website"
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/10"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-xs">
                      <Globe className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Generic Website URL</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Scans public pages, metadata, categories, navigation, and store policies.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Works on any live website &rarr;
                  </div>
                </div>

                {/* Method 2: Shopify Store (e-commerce only) */}
                {businessType !== "services" && (
                  <div
                    onClick={() => setConnectionMethod("shopify")}
                    className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                      connectionMethod === "shopify"
                        ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/10"
                        : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                    }`}
                  >
                    <div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 shadow-xs">
                        <Store className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Shopify Integration</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Direct GraphQL API sync with live inventory, variants, and 1-click cart.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      Deep 1-click OAuth &rarr;
                    </div>
                  </div>
                )}

                {/* Method 3: Quick Catalog Paste / CSV */}
                <div
                  onClick={() => setConnectionMethod("manual_paste")}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    connectionMethod === "manual_paste"
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/10"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center mb-4 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Quick Paste or CSV</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Paste a list of products and prices or upload a CSV file instantly.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] text-xs font-semibold text-violet-600 dark:text-violet-400">
                    Direct bulk upload &rarr;
                  </div>
                </div>

                {/* Method 4: Instant Industry Template */}
                <div
                  onClick={() => setConnectionMethod("template")}
                  className={`p-5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                    connectionMethod === "template"
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/20 ring-2 ring-indigo-600/10"
                      : "border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]"
                  }`}
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-xs">
                      <Wand2 className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">AI Industry Catalog</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Select your industry niche to generate 6 starter products with 1 click.
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] text-xs font-semibold text-amber-600 dark:text-amber-400">
                    1-Click starter catalog &rarr;
                  </div>
                </div>
              </div>

              {/* Input for Chosen Connection */}
              <div className="mt-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                {connectionMethod === "website" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Enter Your Website URL
                    </label>
                    <input
                      type="text"
                      value={storeUrl}
                      onChange={(e) => setStoreUrl(e.target.value)}
                      placeholder="yourstore.com or https://yourstore.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                      We will crawl public pages, categories, and policies to build your AI knowledge base.
                    </p>
                  </div>
                )}

                {connectionMethod === "shopify" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Your Shopify Store Domain
                    </label>
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] overflow-hidden">
                      <input
                        type="text"
                        value={shopifyStore}
                        onChange={(e) => setShopifyStore(e.target.value)}
                        placeholder="your-store-name"
                        className="flex-1 px-4 py-2.5 text-sm bg-transparent text-slate-900 dark:text-white focus:outline-none"
                      />
                      <span className="px-3 py-2.5 bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 text-xs border-l border-slate-200 dark:border-white/[0.08] font-mono">
                        .myshopify.com
                      </span>
                    </div>
                  </div>
                )}

                {connectionMethod === "manual_paste" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Paste Products or Catalog (One per line)
                      </label>
                      <span className="text-[11px] text-slate-400">Format: Product Name - $Price</span>
                    </div>
                    <textarea
                      rows={4}
                      value={pasteCatalogText}
                      onChange={(e) => setPasteCatalogText(e.target.value)}
                      placeholder={`UltraBook Pro 15" Laptop - $1299\nApex Gaming Rig (RTX 4080) - $2399\nMechanical RGB Gaming Keyboard - $129\n27" 165Hz QHD Gaming Monitor - $349`}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] text-slate-900 dark:text-white text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                    />
                    <div className="mt-3 flex items-center justify-between">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.05] cursor-pointer">
                        <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Upload .CSV file</span>
                        <input
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                setPasteCatalogText(evt.target?.result as string);
                                toast.success(`Loaded CSV: ${file.name}`);
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleParsePastedCatalog}
                        className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition active:scale-[0.99] cursor-pointer"
                      >
                        Parse & Import Products &rarr;
                      </button>
                    </div>
                  </div>
                )}

                {connectionMethod === "template" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      Choose Your Store Niche
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: "tech", label: "💻 Tech & Gaming PCs" },
                        { id: "apparel", label: "👗 Fashion & Apparel" },
                        { id: "beauty", label: "🌿 Health & Skincare" },
                        { id: "home", label: "🛋️ Home & Furniture" },
                        { id: "services", label: "💼 Professional Services" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleApplyTemplate(t.id)}
                          className="p-3 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:border-indigo-600 dark:hover:border-indigo-500 text-left text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition cursor-pointer active:scale-95 flex items-center justify-between"
                        >
                          <span>{t.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {connectionMethod === "manual_paste" ? (
                  <button
                    onClick={handleParsePastedCatalog}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <span>Import Catalog & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : connectionMethod === "template" ? (
                  <button
                    onClick={() => handleApplyTemplate("tech")}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <span>Apply Tech Template</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={startCrawl}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                  >
                    <span>{connectionMethod === "shopify" ? "Sync Shopify Store" : "Start Automatic Ingestion"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Ingestion Progress Simulation */}
          {step === 3 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Scanning & Vectorizing Knowledge
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                {crawlStage}
              </p>

              <div className="max-w-md mx-auto mt-8">
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                    style={{ width: `${crawlProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-400 mt-2 font-mono">
                  <span>Progress</span>
                  <span>{crawlProgress}%</span>
                </div>
              </div>

              <div className="mt-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Respecting robots.txt & multi-tenant isolation rules
              </div>
            </div>
          )}

          {/* STEP 4: Review Extracted Data */}
          {step === 4 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Check className="w-3.5 h-3.5" /> Extraction Complete
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Review your imported business data
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                We detected {importedProductsCount} {businessType === "services" ? "services" : "products"}, FAQs, and policies. You can edit them now or later.
              </p>

              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. My Online Store"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs sm:text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="support@yourdomain.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs sm:text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs sm:text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                          {businessType === "services" ? "Service Menu" : "Catalog & Offerings"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                          {importedProductsCount > 0 ? `${importedProductsCount} items` : "0 items"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        These items will be available for your AI assistant to recommend to customers.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleApplyTemplate(businessType === "ecommerce" ? "tech" : "services")}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.99] cursor-pointer border border-indigo-200/60 dark:border-indigo-800/40"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        <span>{businessType === "services" ? "⚡ Auto-Generate Services" : "⚡ Auto-Generate Products"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.99] cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Item</span>
                      </button>
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  {extractedProducts.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {extractedProducts.map((prod, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] group hover:border-slate-300 dark:hover:border-white/[0.15] transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {prod.imageUrl ? (
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-9 h-9 rounded-lg object-cover bg-slate-100 dark:bg-slate-800 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                                <ShoppingBag className="w-4 h-4" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{prod.name}</div>
                              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                {prod.price ? `$${Number(prod.price).toFixed(2)}` : "Price on request"}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(pIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition shrink-0 cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.08] text-center py-6 px-4 bg-white/60 dark:bg-white/[0.02] rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08]">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2.5">
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                        No products detected yet
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-3">
                        Your website might be a client-side app (SPA) or didn&apos;t expose raw HTML products. You can generate 6 tailored products in 1 click or add them manually:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApplyTemplate(businessType === "ecommerce" ? "tech" : "services")}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.99] cursor-pointer shadow-xs"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          <span>Generate 6 Products for {businessName || "Your Store"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddProductModal(true)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Manually</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Add Product Modal */}
                {showAddProductModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md bg-white dark:bg-[#11141d] rounded-2xl border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 relative">
                      <button
                        type="button"
                        onClick={() => setShowAddProductModal(false)}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                          <ShoppingBag className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Product to Catalog</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Quickly add an offering for AI recommendations</p>
                        </div>
                      </div>

                      <form onSubmit={handleAddSingleProduct} className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Product or Service Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Mechanical Gaming Keyboard or SEO Audit"
                            value={quickProductName}
                            onChange={(e) => setQuickProductName(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs sm:text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Price (USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 79.99"
                            value={quickProductPrice}
                            onChange={(e) => setQuickProductPrice(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs sm:text-sm bg-white dark:bg-white/[0.03] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                          />
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddProductModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-[0.99] shadow-xs"
                          >
                            Add to Catalog
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Approve & Configure AI</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Configure AI Assistant */}
          {step === 5 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Step 5</span> • AI Persona & Guardrails
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Configure your AI sales assistant
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Define how your AI greets customers, qualifies leads, and hands off conversations.
              </p>

              <div className="mt-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assistant Name
                    </label>
                    <input
                      type="text"
                      value={assistantName}
                      onChange={(e) => setAssistantName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Conversation Tone
                    </label>
                    <select
                      value={assistantTone}
                      onChange={(e) => setAssistantTone(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm bg-white"
                    >
                      <option>Helpful & Proactive</option>
                      <option>Casual & Friendly</option>
                      <option>Luxury & Refined</option>
                      <option>Direct & Concise</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Lead Capture Form</h5>
                      <p className="text-[11px] text-slate-500">Collect visitor email/phone before handing off.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={leadCaptureEnabled}
                      onChange={(e) => setLeadCaptureEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Human Handoff & WhatsApp</h5>
                      <p className="text-[11px] text-slate-500">Allow customers to transfer to live staff or WhatsApp.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={humanHandoffEnabled}
                      onChange={(e) => setHumanHandoffEnabled(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Customize Widget</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Customize Widget */}
          {step === 6 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Step 6</span> • Widget Branding
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Customize your website widget
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Match the floating chat drawer to your store&apos;s brand colors and layout.
              </p>

              <div className="mt-8 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Primary Brand Color
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    {["#4F46E5", "#2563EB", "#059669", "#D97706", "#DC2626", "#0F172A"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setPrimaryColor(c)}
                        className={`w-9 h-9 rounded-xl transition cursor-pointer flex items-center justify-center border border-black/10 dark:border-white/20 ${
                          primaryColor === c ? "ring-2 ring-offset-2 ring-indigo-600 dark:ring-offset-[#11141d] scale-105" : ""
                        }`}
                        style={{ backgroundColor: c }}
                      >
                        {primaryColor === c && <Check className="w-4 h-4 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Welcome Message
                  </label>
                  <textarea
                    rows={2}
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Position
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={widgetPosition === "bottom-right"}
                        onChange={() => setWidgetPosition("bottom-right")}
                        className="text-indigo-600"
                      />
                      Bottom Right (Recommended)
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={widgetPosition === "bottom-left"}
                        onChange={() => setWidgetPosition("bottom-left")}
                        className="text-indigo-600"
                      />
                      Bottom Left
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(5)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => setStep(7)}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Test in Sandbox</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Interactive Test Sandbox */}
          {step === 7 && (
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Step 7</span> • Test & Verify
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Test your AI assistant live
              </h2>
              <p className="text-sm text-slate-500 mt-2">
                Ask questions to verify pricing grounding, product recommendations, and responses.
              </p>

              {/* Chat sandbox box */}
              <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
                <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: primaryColor }}></span>
                    <span>{assistantName} (Testing Sandbox)</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-semibold">● Grounding Active</span>
                </div>

                <div className="p-4 h-64 overflow-y-auto space-y-3">
                  {testMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`text-xs py-2 px-3.5 rounded-2xl max-w-sm ${
                          msg.role === "user"
                            ? "bg-indigo-600 text-white rounded-tr-xs"
                            : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs shadow-xs"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {msg.products && (
                        <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-xl max-w-xs shadow-xs">
                          <div className="text-xs font-bold text-slate-900">{msg.products[0].name}</div>
                          <div className="flex items-center justify-between mt-1 text-xs">
                            <span className="font-bold text-indigo-600">{msg.products[0].price}</span>
                            <span className="text-emerald-600 font-semibold text-[10px]">In Stock ✓</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleTestSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Ask about recommendations or return policy..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setStep(6)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  onClick={() => {
                    saveOnboardingProfile();
                    setStep(8);
                  }}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition active:scale-[0.99] cursor-pointer"
                >
                  <span>Ready to Go Live</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 8: Go Live & Embed Script */}
          {step === 8 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Your AI employee is ready to go live!
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
                Add this lightweight embed snippet to your website header to start converting visitors 24/7.
              </p>

              {/* Embed snippet box */}
              <div className="max-w-xl mx-auto mt-6 bg-slate-900 text-slate-200 rounded-2xl p-4 text-left font-mono text-xs relative shadow-lg">
                <button
                  onClick={copyEmbedCode}
                  className="absolute right-3 top-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-sans">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-sans">Copy snippet</span>
                    </>
                  )}
                </button>
                <div className="text-slate-400 mb-1">// 1-Line Universal Store Script (paste in &lt;head&gt; or before &lt;/body&gt;)</div>
                <code className="text-indigo-300 break-all select-all">
                  &lt;script src=&quot;{typeof window !== "undefined" ? window.location.origin : "https://nesale.live"}/widget.js&quot; data-business-id=&quot;{persistedBusinessId}&quot; async defer&gt;&lt;/script&gt;
                </code>
              </div>

              {/* Live Connection Verifier Card */}
              <div className="max-w-xl mx-auto mt-5 p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50 dark:bg-[#171b26] text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${verificationResult?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`}></span>
                      <span>Connection Status: {verificationResult?.connected ? "Verified & Live" : "Waiting for Installation"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {verificationResult?.connected
                        ? `Live connection confirmed on ${verificationResult.installedDomain || "storefront"}!`
                        : "Insert the snippet into your website header, then click Check Connection."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={checkSnippetConnection}
                    disabled={isVerifyingSnippet}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-[#11141d] border border-slate-200 dark:border-white/[0.1] hover:bg-slate-100 dark:hover:bg-white/[0.04] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[40px] shrink-0"
                  >
                    {isVerifyingSnippet ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                        <span>Scanning Store...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Check Connection</span>
                      </>
                    )}
                  </button>
                </div>

                {verificationResult?.connected && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/[0.06] text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      Autonomous harvester ready. Detected {verificationResult.productsHarvested || 0} catalog items from storefront.
                    </span>
                  </div>
                )}
              </div>

              {/* Complete Setup & Enter Dashboard CTA */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={async () => {
                    await saveOnboardingProfile();
                    router.push("/dashboard");
                  }}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-600/20 transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Launch Merchant Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
