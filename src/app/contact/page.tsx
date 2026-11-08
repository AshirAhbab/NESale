"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { AuthFooter } from "@/components/layout/AuthFooter";
import { ShopperWidget } from "@/components/widget/ShopperWidget";
import { toast } from "@/components/ui/Toast";
import {
  Mail,
  MessageSquare,
  Building,
  Globe,
  Clock,
  CheckCircle2,
  Send,
  HelpCircle,
  Phone,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function ContactPage() {
  const [inquiryType, setInquiryType] = useState<"sales" | "support" | "partner" | "press">("sales");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [monthlyVolume, setMonthlyVolume] = useState("10k-50k");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          inquiryType,
          storeUrl,
          monthlyVolume,
          message,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit inquiry");
      }
      setTicketNumber(data.ticketId || Math.floor(100000 + Math.random() * 900000));
      setSubmitted(true);
      toast.success("Inquiry received! Our team will respond shortly.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#090a0f] text-slate-900 dark:text-slate-100 selection:bg-indigo-100 selection:text-indigo-900 transition-colors">
      <MarketingHeader />

      <main className="flex-1 py-14 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Get in Touch
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
              We&apos;re here to help your store scale with AI.
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Have a question about custom catalog integrations, enterprise plans, or live RAG architecture? Our team typically responds in under 15 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Interactive Contact Form */}
            <div className="lg:col-span-7">
              <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/[0.08] shadow-card dark:shadow-none">
                {submitted ? (
                  <div className="text-center py-12 space-y-4 animate-in fade-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      Message Sent Successfully!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Thank you for contacting NESale. An enterprise specialist has received your inquiry (Ticket #{ticketNumber || "284910"}) and will follow up at <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span> shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setMessage("");
                      }}
                      className="mt-4 px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition active:scale-[0.99] cursor-pointer min-h-[44px] inline-flex items-center justify-center"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Inquiry Type Tabs */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        How can we help you?
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "sales" as const, label: "Enterprise Sales" },
                          { id: "support" as const, label: "Merchant Help" },
                          { id: "partner" as const, label: "Agency Partner" },
                          { id: "press" as const, label: "General" },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setInquiryType(tab.id)}
                            className={`min-h-[40px] px-3 rounded-xl text-xs font-semibold transition active:scale-[0.99] cursor-pointer flex items-center justify-center text-center ${
                              inquiryType === tab.id
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 2-Col: Name & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Mercer"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Work Email Address *
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="alex@nordikgear.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                        />
                      </div>
                    </div>

                    {/* 2-Col: Website URL & Monthly Shoppers */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Store or Business URL
                        </label>
                        <input
                          type="url"
                          value={storeUrl}
                          onChange={(e) => setStoreUrl(e.target.value)}
                          placeholder="https://nordikgear.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                          Monthly Website Traffic
                        </label>
                        <select
                          value={monthlyVolume}
                          onChange={(e) => setMonthlyVolume(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                        >
                          <option value="under-10k">Under 10,000 visitors/mo</option>
                          <option value="10k-50k">10,000 - 50,000 visitors/mo</option>
                          <option value="50k-250k">50,000 - 250,000 visitors/mo</option>
                          <option value="250k+">250,000+ visitors/mo (High Traffic)</option>
                        </select>
                      </div>
                    </div>

                    {/* Message Area */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tell us about your requirements *
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="We are looking to implement AI sales assistance on our Shopify Plus store to increase checkout conversions on outerwear..."
                        className="w-full p-4 rounded-xl border border-slate-200 dark:border-white/[0.10] bg-white dark:bg-[#0c0e15] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer min-h-[44px]"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Routing Inquiry...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Request</span>
                          <Send className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
                      By submitting, you agree to our{" "}
                      <Link href="/privacy" className="underline hover:text-indigo-600">
                        Privacy Policy
                      </Link>{" "}
                      and strict multi-tenant confidentiality guidelines.
                    </p>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: Direct Department Channels & Guarantees */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: Enterprise Advisory */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Enterprise Solutions
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      High-volume custom catalogs & SLAs
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Direct connection with our Solutions Engineering team for dedicated vector index queues and custom WhatsApp checkout flows.
                </p>
                <div className="pt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>sales@nesale.live</span>
                </div>
              </div>

              {/* Card 2: Merchant Support */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Technical Merchant Support
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      24/7 Support for live widgets
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Experiencing an issue with catalog indexing, webhooks, or theme styling? Our support engineers are standing by.
                </p>
                <div className="pt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>support@nesale.live</span>
                </div>
              </div>

              {/* Card 3: Global Presence */}
              <div className="p-6 rounded-3xl bg-slate-50/60 dark:bg-[#171b26]/50 border border-slate-200/80 dark:border-white/[0.08] space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Global Timezone Coverage
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">San Francisco</span>
                    <span className="text-slate-500">HQ • 8:00 AM - 6:00 PM PST</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">London</span>
                    <span className="text-slate-500">EMEA • 9:00 AM - 5:00 PM GMT</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Singapore</span>
                    <span className="text-slate-500">APAC • 9:00 AM - 6:00 PM SGT</span>
                  </div>
                </div>
              </div>

              {/* SLA Guarantee */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Fast Response Guarantee:</span> All merchant inquiries during standard business hours are acknowledged and assigned to an engineer within 15 minutes.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AuthFooter />
      <ShopperWidget />
    </div>
  );
}
