"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Globe,
  X,
  BookOpen,
  AlertTriangle,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface KnowledgeSource {
  id: string;
  title: string;
  type: "policy" | "faq" | "webpage" | "document";
  snippet: string;
  sourceUrl?: string;
  chunksCount: number;
  embeddedCount?: number;
  lastIndexed: string;
  status: string;
  contentHash?: string;
  metadata?: Record<string, unknown>;
}

interface AddSourceForm {
  inputType: "text" | "url";
  title: string;
  type: "faq" | "policy" | "webpage";
  content: string;
  url: string;
}

interface JobState {
  id: string;
  status: string;
  progress: number;
  maxProgress: number;
}

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isReindexing, setIsReindexing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string>("");
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [activeJobs, setActiveJobs] = useState<JobState[]>([]);

  const [form, setForm] = useState<AddSourceForm>({
    inputType: "text",
    title: "",
    type: "faq",
    content: "",
    url: "",
  });

  const apiUrl = useCallback(
    (path: string) => {
      const sep = path.includes("?") ? "&" : "?";
      return businessId ? `${path}${sep}businessId=${encodeURIComponent(businessId)}` : path;
    },
    [businessId]
  );

  const pollJobs = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/v1/dashboard/jobs?businessId=${encodeURIComponent(businessId)}&limit=10`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        setActiveJobs(
          data.jobs.map((j: { id: string; status: string; progress: number; maxProgress: number }) => ({
            id: j.id,
            status: j.status,
            progress: j.progress || 0,
            maxProgress: j.maxProgress || 100,
          }))
        );
      }
    } catch {
      // Ignore poll errors
    }
  }, [businessId]);

  useEffect(() => {
    const interval = setInterval(pollJobs, 5000);
    return () => clearInterval(interval);
  }, [pollJobs]);

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/dashboard/knowledge"), { cache: "no-store" });
      const data = await res.json();
      if (data.sources) {
        setSources(data.sources);
        if (data.businessId && !businessId) {
          setBusinessId(data.businessId);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch knowledge sources:", err);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, businessId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSources();
  }, [loadSources]);

  const handleReindexAll = async () => {
    if (sources.length === 0) return;
    setIsReindexing(true);

    let successCount = 0;
    let failCount = 0;

    for (const source of sources) {
      if (!source.sourceUrl) continue;
      try {
        const res = await fetch("/api/v1/dashboard/knowledge/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: source.sourceUrl,
            businessId,
            title: source.title,
            type: source.type as "webpage",
          }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    await new Promise((r) => setTimeout(r, 2000));
    await loadSources();
    setIsReindexing(false);

    if (successCount > 0 && failCount === 0) {
      toast.success(`Re-indexed ${successCount} source(s) successfully!`);
    } else if (successCount > 0) {
      toast.info(`Re-indexed ${successCount} source(s), ${failCount} failed.`);
    } else {
      toast.error("Failed to re-index sources.");
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.inputType === "text") {
      if (!form.title || !form.content) return;

      try {
        const res = await fetch(apiUrl("/api/v1/dashboard/knowledge"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            type: form.type,
            content: form.content,
          }),
        });

        const data = await res.json();
        if (data.source) {
          setSources((prev) => [data.source, ...prev]);
          toast.success(`"${form.title}" added and indexed!`);
        } else {
          toast.error(data.error?.message || "Failed to add knowledge document");
        }
      } catch (err: unknown) {
        toast.error((err as { message?: string }).message || "Failed to add knowledge document");
      }
    } else {
      if (!form.url || !form.title) return;

      setSyncingSource("new");
      try {
        const res = await fetch("/api/v1/dashboard/knowledge/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceUrl: form.url,
            businessId,
            title: form.title,
            type: "webpage",
          }),
        });

        const data = await res.json();
        if (data.status === "accepted") {
          toast.success(`"${form.title}" ingestion started. Check progress below.`);
          setTimeout(() => pollJobs(), 1000);
        } else {
          toast.error(data.error?.message || "Failed to ingest URL");
        }
      } catch (err: unknown) {
        toast.error((err as { message?: string }).message || "Failed to ingest URL");
      } finally {
        setSyncingSource(null);
      }
    }

    setIsAddModalOpen(false);
    setForm({ inputType: "text", title: "", type: "faq", content: "", url: "" });
  };

  const handleDeleteSource = async (id: string) => {
    if (!businessId) return;
    try {
      await fetch(apiUrl(`/api/v1/dashboard/knowledge?id=${id}`), { method: "DELETE" });
      setSources((prev) => prev.filter((s) => s.id !== id));
      toast.success("Knowledge document removed from AI retrieval");
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || "Failed to delete knowledge source");
    }
  };

  const handleRetrySource = async (source: KnowledgeSource) => {
    if (!source.sourceUrl || !businessId) return;
    setSyncingSource(source.id);

    try {
      const res = await fetch("/api/v1/dashboard/knowledge/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceUrl: source.sourceUrl,
          businessId,
          title: source.title,
          type: source.type as "webpage",
        }),
      });

      const data = await res.json();
      if (data.status === "accepted") {
        toast.success(`"${source.title}" re-indexing started.`);
        setTimeout(() => pollJobs(), 1000);
      } else {
        toast.error(data.error?.message || "Failed to re-index source");
      }
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || "Failed to re-index source");
    } finally {
      setSyncingSource(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return {
          label: "Indexed",
          color: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40",
          icon: <CheckCircle2 className="w-3 h-3" />,
        };
      case "indexing":
        return {
          label: "Indexing…",
          color: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40",
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
        };
      case "failed":
        return {
          label: "Failed",
          color: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40",
          icon: <AlertTriangle className="w-3 h-3" />,
        };
      default:
        return {
          label: status,
          color: "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]",
          icon: <FileText className="w-3 h-3" />,
        };
    }
  };

  const filteredSources = sources.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Knowledge Base
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Unstructured policies, FAQs, and guides vectorized for semantic retrieval and grounded answers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReindexAll}
            disabled={isReindexing || sources.length === 0}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.1] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.06] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin text-indigo-600" : "text-slate-400 dark:text-slate-500"}`} />
            <span>{isReindexing ? "Re-indexing…" : "Re-index All"}</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer min-h-[44px]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Source</span>
          </button>
        </div>
      </div>

      {/* Search and Summary */}
      <div className="bg-white dark:bg-[#11141d] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search knowledge documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#0c0e15] border border-slate-200/80 dark:border-white/[0.1] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[40px]"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Tenant-isolated vector search
          </span>
          <span className="flex items-center gap-1.5">
            <LinkIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {sources.length} source(s)
          </span>
        </div>
      </div>

      {/* Active Jobs Progress */}
      {activeJobs.length > 0 && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800/40 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Active Ingestion Jobs
            </span>
            <span className="text-xs text-amber-500 dark:text-amber-400">
              {activeJobs.length} running
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeJobs.map((job) => (
              <div key={job.id} className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-800/30">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-amber-700 dark:text-amber-400 truncate">
                    Job {job.id.slice(0, 8)}…
                  </span>
                  <span className={job.status === "processing" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}>
                    {job.status}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800/30 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-600 dark:bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (job.progress / job.maxProgress)) * 100}%` }}
                  ></div>
                </div>
                <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                  {Math.round((job.progress / job.maxProgress) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] animate-pulse space-y-3">
            <div className="h-6 bg-slate-100 dark:bg-white/[0.05] rounded-lg w-1/3" />
            <div className="h-16 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
          </div>
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] animate-pulse space-y-3">
            <div className="h-6 bg-slate-100 dark:bg-white/[0.05] rounded-lg w-1/3" />
            <div className="h-16 bg-slate-100 dark:bg-white/[0.05] rounded-xl" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sources.length === 0 && (
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-12 border border-slate-100 dark:border-white/[0.08] shadow-sm text-center max-w-xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No Knowledge Documents Indexed
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
              Add your store&apos;s return policies, shipping schedules, warranty guidelines, or FAQs so your AI sales rep can provide factual answers to shoppers without hallucinating.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] inline-flex items-center gap-1.5 min-h-[44px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Knowledge Source</span>
            </button>
          </div>
        </div>
      )}

      {/* Knowledge Sources Grid */}
      {!isLoading && sources.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredSources.map((s) => {
            const statusBadge = getStatusBadge(s.status);
            const isFailed = s.status === "failed";
            const isIndexing = s.status === "indexing";

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col justify-between hover:shadow-md transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center shrink-0">
                        {s.type === "policy" ? (
                          <ShieldCheck className="w-4 h-4" />
                        ) : s.type === "faq" ? (
                          <HelpCircle className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                          {s.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          <span className="uppercase font-semibold text-slate-600 dark:text-slate-300">{s.type}</span>
                          <span>•</span>
                          <span>{s.chunksCount || 1} chunk(s) {s.embeddedCount != null ? `• ${s.embeddedCount} embedded` : ""}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge.color}`}>
                      {statusBadge.icon} {statusBadge.label}
                    </span>
                  </div>

                  {isFailed && s.metadata && Boolean((s.metadata as Record<string, unknown>).error) && (
                    <div className="mt-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/10 border border-rose-100/50">
                      <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-relaxed">
                        {String((s.metadata as Record<string, unknown>).error)}
                      </p>
                    </div>
                  )}

                  {!isFailed && s.snippet && (
                    <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-[#171b26] p-3 rounded-2xl border border-slate-100/80 dark:border-white/[0.06]">
                      &ldquo;{s.snippet}&rdquo;
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
                  <span>Updated {s.lastIndexed}</span>
                  <div className="flex items-center gap-2">
                    {s.sourceUrl && (
                      <a
                        href={s.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]"
                      >
                        <span>Source page</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {isIndexing ? (
                      <button
                        disabled
                        className="p-1.5 text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/20 rounded-lg cursor-not-allowed min-h-[36px] min-w-[36px] flex items-center justify-center"
                      >
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleRetrySource(s)}
                          disabled={syncingSource === s.id}
                          title="Re-index this source"
                          className="p-1.5 text-amber-600 dark:text-amber-400 hover:text-amber-500 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          {syncingSource === s.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteSource(s.id)}
                          title="Remove from knowledge base"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Source Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-white/[0.1] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.08]">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Add Knowledge Source</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.06]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSource} className="mt-5 space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Source Type:</label>
                <div className="flex items-center border border-slate-200 dark:border-white/[0.1] rounded-xl bg-slate-50 dark:bg-[#0c0e15]">
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, inputType: "text" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      form.inputType === "text"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Text / FAQ
                  </button>
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, inputType: "url" }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      form.inputType === "url"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    Website URL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Title
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder={form.inputType === "url" ? "e.g. https://store.example.com" : "e.g. Return Policy"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                />
              </div>

              {form.inputType === "text" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Document Category
                    </label>
                    <select
                      value={form.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((prev) => ({ ...prev, type: e.target.value as AddSourceForm["type"] }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                    >
                      <option value="faq">FAQ Pair</option>
                      <option value="policy">Store Policy</option>
                      <option value="webpage">Product Guide</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Content / Answers
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={form.content}
                      onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                      placeholder="Enter the complete factual content the AI should retrieve when answering customer questions..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </>
              )}

              {form.inputType === "url" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    required
                    value={form.url}
                    onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-slate-50 dark:bg-[#0c0e15] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[44px]"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    The crawler will fetch public pages, extract text, and embed it for semantic search.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={syncingSource === "new"}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] min-h-[44px]"
                >
                  {syncingSource === "new" ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                      Indexing…
                    </>
                  ) : (
                    <>{form.inputType === "text" ? "Index into Knowledge Base" : "Ingest from URL"}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
