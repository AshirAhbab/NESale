"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Tag,
  DollarSign,
  Users,
  Clock,
  Award,
  Copy,
  Check,
  Mail,
  Share2,
  QrCode,
  Lock,
  Crown,
  Search,
  ChevronRight,
  ExternalLink,
  Download,
  ArrowRight,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

export default function AffiliatePage() {
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/partner`
      : "https://nesale.live/ref/partner";

  const referrals = [
    {
      name: "Kestrel Supply Co.",
      domain: "kestrelsupply.com",
      code: "KS",
      date: "Oct 28, 2026",
      plan: "Growth Plan • $39/mo",
      status: "Active",
      statusBadge:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      payout: "$3.90 / mo (10%)",
      payoutColor: "text-slate-900 dark:text-white font-bold",
    },
    {
      name: "Verdant Living",
      domain: "verdantliving.store",
      code: "VL",
      date: "Oct 14, 2026",
      plan: "Pro Plan • $79/mo",
      status: "Active",
      statusBadge:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      payout: "$7.90 / mo (10%)",
      payoutColor: "text-slate-900 dark:text-white font-bold",
    },
    {
      name: "Aura Ceramics",
      domain: "auraceramics.com",
      code: "AC",
      date: "Sep 30, 2026",
      plan: "Growth Plan • $39/mo",
      status: "Trialing (Day 8)",
      statusBadge:
        "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40",
      payout: "Pending ($3.90)",
      payoutColor: "text-slate-400 dark:text-slate-500 italic",
    },
    {
      name: "Solace Apparel",
      domain: "solaceapparel.myshopify.com",
      code: "SA",
      date: "Sep 12, 2026",
      plan: "Starter • $19/mo",
      status: "Active",
      statusBadge:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      payout: "$1.90 / mo (10%)",
      payoutColor: "text-slate-900 dark:text-white font-bold",
    },
    {
      name: "Peak Outdoors",
      domain: "peakoutdoors.co",
      code: "PO",
      date: "Aug 22, 2026",
      plan: "Pro Plan • $79/mo",
      status: "Active",
      statusBadge:
        "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
      payout: "$7.90 / mo (10%)",
      payoutColor: "text-slate-900 dark:text-white font-bold",
    },
  ];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    toast.success("Affiliate referral link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const filteredReferrals = referrals.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && r.status === "Active") ||
      (statusFilter === "trial" && r.status.includes("Trialing"));
    return matchesSearch && matchesStatus;
  });

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    toast.success(`Merchant invitation sent to ${inviteEmail.trim()}!`);
    setInviteEmail("");
    setInviteModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
            <span>STORE OPERATIONS</span>
            <span>/</span>
            <span className="text-indigo-600 dark:text-indigo-400">GROWTH ENGINE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Affiliate &amp; Partner Program
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Earn recurring monthly commissions by referring fellow Shopify merchants to NESale.
            Lifetime attribution wired directly into your merchant payout cycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => toast.success("Downloading W-9 Tax Document PDF...")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Download W-9</span>
          </button>

          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <span>+ Invite a merchant</span>
          </button>
        </div>
      </div>

      {/* Top 4 Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Referral Earnings</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              📈 +18.4% this mo
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">$420.00</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Lifetime paid via Shopify Partner Payouts
          </p>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Referrals</span>
            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-800/40">
              14 Growth, 4 Pro
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">18</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Stores currently subscribed on paid plans
          </p>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Conversion Rate</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
              High Intent
            </span>
          </div>
          <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">24.6%</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            From unique link click to live install
          </p>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Yield Tier</span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
              Tier 1
            </span>
          </div>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">10%</div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            Next unlock: 15% at 51 referrals
          </p>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-7 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your unique referral link</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Share this link across email, social, or client audits to attribute new store installs automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200 dark:border-white/[0.1] font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center min-h-[44px]">
            <span className="truncate">{referralUrl}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition active:scale-[0.99] cursor-pointer shrink-0 min-h-[44px]"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? "Link Copied!" : "Copy link"}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-1">
          <button
            type="button"
            onClick={() => {
              window.open(
                `mailto:?subject=Transform%20your%20Shopify%20store%20sales&body=Check%20out%20NESale%20for%20your%20store:%20${encodeURIComponent(
                  referralUrl
                )}`,
                "_blank"
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#171b26] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[40px]"
          >
            <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Share via Email</span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.open(
                `https://x.com/intent/tweet?text=Transform%20your%20Shopify%20store%20with%20NESale!%20${encodeURIComponent(
                  referralUrl
                )}`,
                "_blank"
              );
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#171b26] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[40px]"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Post on X</span>
          </button>

          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#171b26] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[40px]"
          >
            <QrCode className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span>Show QR code</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>60-day cookie window</span>
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            <span>Lifetime recurring attribution</span>
          </span>
          <span>•</span>
          <span>First-touch referrer guarantee</span>
        </div>
      </div>

      {/* Commission Tiers Progression */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Commission tiers</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scale your revenue share as your referred merchant portfolio expands.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 px-3 py-1 rounded-xl">
            Requires <strong>32 more active referrals</strong> to unlock Tier 2 (15%)
          </span>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Tier 1 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#11141d] border-2 border-indigo-600 shadow-md space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">TIER 1</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white">
                  CURRENT
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">10%</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">0 – 50 active stores</p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block mb-1">
                Status: 18 referred
              </span>
              <div className="w-full h-1.5 bg-indigo-100 dark:bg-indigo-950/60 rounded-full overflow-hidden">
                <div className="w-[36%] h-full bg-indigo-600 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Tier 2 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">TIER 2</span>
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">15%</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">51 – 100 active stores</p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">+5% incremental yield</span>
            </div>
          </div>

          {/* Tier 3 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">TIER 3</span>
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">20%</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">101 – 150 active stores</p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Priority support queue</span>
            </div>
          </div>

          {/* Tier 4 */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/[0.08] shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">TIER 4</span>
                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">25%</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">151 – 200 active stores</p>
            </div>
            <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08]">
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Co-branded case study</span>
            </div>
          </div>

          {/* Tier 5 (VIP) */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#11141d] border border-purple-200 dark:border-purple-800/50 shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase">TIER 5 (VIP)</span>
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">30%</div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">201+ active stores</p>
            </div>
            <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30">
              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-400">Dedicated Partner Manager</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Referrals Table */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent referrals</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live tracking of referred merchants and payout statuses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search referrals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="trial">Trialing</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.08] text-slate-400 dark:text-slate-500 font-semibold text-[11px] bg-slate-50/40 dark:bg-[#171b26]">
                <th className="py-3 px-4 font-semibold">STORE</th>
                <th className="py-3 px-4 font-semibold">INSTALL DATE</th>
                <th className="py-3 px-4 font-semibold">CURRENT PLAN</th>
                <th className="py-3 px-4 font-semibold">STATUS</th>
                <th className="py-3 px-4 font-semibold text-right">MONTHLY PAYOUT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {filteredReferrals.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                      {r.code}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{r.name}</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{r.domain}</div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{r.date}</td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">{r.plan}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${r.statusBadge}`}>
                      ● {r.status}
                    </span>
                  </td>
                  <td className={`py-3.5 px-4 text-right ${r.payoutColor}`}>
                    {r.payout}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 2 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Marketing Collateral &amp; Brand Assets
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Need custom banners, product screenshots, or video walkthroughs for your audience?
            </p>
            <button
              type="button"
              onClick={() => toast.info("Opening partner Figma media kit repository...")}
              className="inline-flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs pt-1 cursor-pointer min-h-[44px]"
            >
              <span>Access Partner Kit (Figma &amp; Media)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#11141d] border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-3 flex items-start gap-4">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              Shopify Partner Payout Rules
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Affiliate revenue credits directly to your connected Shopify billing balance automatically on the 15th of each calendar month.
            </p>
            <a
              href="https://shopify.dev/docs/apps/billing/partner-payouts"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs pt-1 min-h-[44px]"
            >
              <span>View Payout Terms &amp; Conditions</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Invite Merchant Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.1] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Invite a Merchant Colleague
              </h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              We will send an invitation email linking your referral code for lifetime attribution.
            </p>
            <form onSubmit={handleSendInvite} className="space-y-3">
              <input
                type="email"
                required
                placeholder="store-owner@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] min-h-[44px]"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.1] max-w-sm w-full p-6 text-center shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Referral QR Code</h3>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-inner inline-block mx-auto">
              <QrCode className="w-40 h-40 text-slate-900 mx-auto" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scan to open your affiliate partner link directly on any mobile device.
            </p>
            <button
              type="button"
              onClick={() => {
                toast.success("QR Code saved!");
                setQrModalOpen(false);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition active:scale-[0.99] min-h-[44px]"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
