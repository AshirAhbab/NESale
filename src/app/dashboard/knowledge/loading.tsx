export default function KnowledgeLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090a0f] pb-12">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              <span className="h-10 w-32 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/[0.1] bg-slate-100 dark:bg-white/[0.02] animate-pulse" />
            <div className="px-4 py-2.5 rounded-xl bg-indigo-600 animate-pulse" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-4 sm:p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <div className="h-9 w-64 rounded-xl bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
              <span className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            </span>
          </div>
        </div>

        {/* Active Jobs skeleton */}
        <div className="bg-white dark:bg-[#11141d] rounded-3xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800/40 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-800/30">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-amber-700 dark:text-amber-400 truncate">
                    <span className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800/30 rounded-full h-1.5">
                  <div className="bg-amber-600 dark:bg-amber-500 h-full rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sources grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm flex flex-col animate-pulse">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.05] shrink-0" />
                  <div>
                    <div className="h-4 w-40 rounded bg-slate-100 dark:bg-white/[0.05]" />
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="h-3 w-16 rounded bg-slate-200 dark:bg-white/[0.05]" />
                      <span className="h-3 w-8 rounded bg-slate-200 dark:bg-white/[0.05]" />
                      <span className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.05]" />
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08]">
                  <span className="h-3 w-3 rounded-full bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
                  <span className="h-3 w-16 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
                </span>
              </div>
              <p className="mt-3.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/70 dark:bg-[#171b26] p-3 rounded-2xl border border-slate-100/80 dark:border-white/[0.06]">
                <span className="h-3 w-3/4 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
                <span className="h-3 w-1/2 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse mt-1" />
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
