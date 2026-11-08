"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  ShoppingCart,
  UserCheck,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  Mail,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface ConversationItem {
  id: string;
  visitor: string;
  lastMessage: string;
  time: string;
  intent: string;
  outcome: string;
  outcomeType: "cart" | "lead" | "handoff" | "view";
  leadCaptured?: { name: string; email: string; phone?: string };
  messages: { role: "user" | "assistant"; text: string; time: string }[];
}

export default function ConversationsPage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "leads">("conversations");
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live leads and live conversations
  useEffect(() => {
    Promise.all([
      fetch("/api/v1/leads")
        .then((res) => res.json())
        .then((data) => {
          if (data.leads) setLeadsList(data.leads);
        })
        .catch(() => {}),
      fetch("/api/v1/conversations")
        .then((res) => res.json())
        .then((data) => {
          if (data.conversations) {
            setConversations(data.conversations);
            if (data.conversations.length > 0) {
              setSelectedConvId(data.conversations[0].id);
            }
          }
        })
        .catch((err) => console.warn("Failed to fetch conversations:", err)),
    ]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const filteredConversations = conversations.filter(
    (c) =>
      c.visitor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.intent.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConversation =
    conversations.find((c) => c.id === selectedConvId) || conversations[0];

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Customer Experience
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Conversations &amp; Leads
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time transcripts, AI attribution reasoning, and autonomous lead captures.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-[#171b26] p-1 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 self-start sm:self-center border border-slate-200 dark:border-white/[0.08]">
          <button
            onClick={() => setActiveTab("conversations")}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              activeTab === "conversations"
                ? "bg-white dark:bg-[#11141d] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Sessions ({conversations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("leads")}
            className={`px-4 py-2 rounded-lg transition flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
              activeTab === "leads"
                ? "bg-white dark:bg-[#11141d] text-indigo-600 dark:text-indigo-400 shadow-2xs font-bold"
                : "hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Captured Leads ({leadsList.length})</span>
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          <div className="lg:col-span-5 bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] animate-pulse space-y-4">
            <div className="h-9 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-white/[0.05] rounded-2xl" />
            <div className="h-20 bg-slate-100 dark:bg-white/[0.05] rounded-2xl" />
            <div className="h-20 bg-slate-100 dark:bg-white/[0.05] rounded-2xl" />
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] animate-pulse space-y-4">
            <div className="h-12 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
            <div className="h-32 bg-slate-100 dark:bg-white/[0.05] rounded-2xl" />
            <div className="h-32 bg-slate-100 dark:bg-white/[0.05] rounded-2xl" />
          </div>
        </div>
      )}

      {/* TAB 1: Conversations Split View */}
      {!isLoading && activeTab === "conversations" && (
        <>
          {conversations.length === 0 ? (
            /* Dedicated Pro Max Empty State */
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-12 border border-slate-100 dark:border-white/[0.08] shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                <MessageSquare className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  No Shopper Conversations Yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  When online shoppers browse your store and interact with your AI sales rep, full conversation transcripts, product recommendations, and cart conversions will stream here automatically.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/dashboard/widget"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] inline-flex items-center gap-1.5 min-h-[44px]"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Configure Chat Widget</span>
                </Link>
                <Link
                  href="/embed/widget"
                  target="_blank"
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#171b26] hover:bg-slate-200 dark:hover:bg-white/[0.06] text-slate-700 dark:text-slate-200 text-xs font-semibold transition active:scale-[0.99] inline-flex items-center gap-1.5 min-h-[44px]"
                >
                  <span>Test Live Widget</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[620px]">
              {/* Left Session List (5 Cols) */}
              <div className="lg:col-span-5 bg-white dark:bg-[#11141d] rounded-3xl p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
                <div>
                  {/* Search input */}
                  <div className="relative mb-4">
                    <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter sessions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[40px]"
                    />
                  </div>

                  {/* Conversation items */}
                  <div className="space-y-2.5 overflow-y-auto max-h-[500px]">
                    {filteredConversations.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50/60 dark:bg-[#171b26] rounded-2xl border border-dashed border-slate-200 dark:border-white/[0.08] space-y-2">
                        <Search className="w-6 h-6 text-slate-400 dark:text-slate-500 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          No matching sessions
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          Try adjusting your search query or clear the filter.
                        </p>
                      </div>
                    ) : (
                      filteredConversations.map((c) => {
                        const isSelected = selectedConvId === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedConvId(c.id)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer active:scale-[0.99] ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-950/30 shadow-xs"
                                : "border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#171b26] hover:border-slate-200 dark:hover:border-white/[0.12] hover:bg-slate-50/50 dark:hover:bg-white/[0.03]"
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {c.visitor}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                                {c.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                              {c.lastMessage}
                            </p>
                            <div className="mt-2.5 flex items-center justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                  c.outcomeType === "cart"
                                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                                    : c.outcomeType === "lead"
                                    ? "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                                    : "bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {c.outcome}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                                {c.intent}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Transcript & Reasoning Pane (7 Cols) */}
              <div className="lg:col-span-7 bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between">
                {selectedConversation ? (
                  <div>
                    {/* Header */}
                    <div className="pb-4 border-b border-slate-100 dark:border-white/[0.08] flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {selectedConversation.visitor}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          <span>Detected Intent:</span>
                          <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                            {selectedConversation.intent}
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                        {selectedConversation.outcome}
                      </span>
                    </div>

                    {/* Messages Thread */}
                    <div className="py-5 space-y-4 max-h-[420px] overflow-y-auto">
                      {selectedConversation.messages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${
                            m.role === "user" ? "items-end" : "items-start"
                          }`}
                        >
                          <div
                            className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                              m.role === "user"
                                ? "bg-indigo-600 text-white rounded-tr-xs shadow-xs"
                                : "bg-slate-50 dark:bg-[#171b26] border border-slate-200/80 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-tl-xs"
                            }`}
                          >
                            {m.text}
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1">
                            {m.time}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Bottom Captured Lead Card if present */}
                    {selectedConversation.leadCaptured && (
                      <div className="mt-4 p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span>Captured Contact Information</span>
                          </div>
                          <div className="text-xs text-indigo-800 dark:text-indigo-300 mt-1">
                            <strong>{selectedConversation.leadCaptured.name}</strong> •{" "}
                            {selectedConversation.leadCaptured.email} •{" "}
                            {selectedConversation.leadCaptured.phone}
                          </div>
                        </div>
                        <a
                          href={`mailto:${selectedConversation.leadCaptured.email}`}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition active:scale-[0.99] min-h-[36px] flex items-center"
                        >
                          Send Email &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-400">Select a conversation</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: Captured Leads Table */}
      {!isLoading && activeTab === "leads" && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-white/[0.08] gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Shopper Inquiries &amp; Leads</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Prospective customers captured autonomously by NESale callback forms.
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            {leadsList.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    No leads captured yet
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Your AI assistant will automatically log shopper contact details here when visitors ask for callbacks, custom bulk quotes, or restock notifications.
                  </p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/[0.08] text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-50/40 dark:bg-[#171b26]">
                    <th className="py-3 px-3">Lead Contact</th>
                    <th className="py-3 px-3">Inquiry Notes</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Source</th>
                    <th className="py-3 px-3">Captured</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-white/[0.06]">
                  {leadsList.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition">
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white">{lead.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{lead.email}</div>
                        {lead.phone && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{lead.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 max-w-xs text-slate-700 dark:text-slate-300 truncate">
                        {lead.notes}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            lead.status === "qualified"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300"
                              : lead.status === "contacted"
                              ? "bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300"
                              : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300"
                          }`}
                        >
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {lead.source}
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 dark:text-slate-500 text-[11px]">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-3 text-right space-x-2">
                        <a
                          href={`mailto:${lead.email}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] transition min-h-[36px]"
                        >
                          <Mail className="w-3 h-3" /> Email
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
