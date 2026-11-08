import { ShoppingBag, Bot, MessageSquare, BarChart3, BookOpen, Sliders, Store, CreditCard, Users, HelpCircle, Settings } from "lucide-react";

const SKELETON_NAV_ITEMS = [
  { label: "Overview", icon: ShoppingBag },
  { label: "AI Assistant", icon: Bot },
  { label: "Conversations", icon: MessageSquare },
  { label: "Products", icon: BarChart3 },
  { label: "Knowledge Base", icon: BookOpen },
  { label: "Widget", icon: Sliders },
  { label: "Store", icon: Store },
  { label: "Billing", icon: CreditCard },
  { label: "Team", icon: Users },
  { label: "Help", icon: HelpCircle },
  { label: "Settings", icon: Settings },
];

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090a0f] flex">
      {/* Sidebar skeleton */}
      <aside className="hidden md:block shrink-0 w-64 h-screen sticky top-0 bg-white dark:bg-[#11141d] border-r border-slate-100 dark:border-white/[0.08]">
        <div className="h-16 flex items-center px-4 border-b border-slate-100 dark:border-white/[0.08]">
          <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
          <div className="ml-3 flex flex-col">
            <div className="h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            <div className="h-2 w-12 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse mt-1" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
          {SKELETON_NAV_ITEMS.map((item) => (
            <div key={item.label} className="relative group">
              <div className="flex items-center rounded-xl text-xs font-semibold transition px-3 py-2 bg-slate-50 dark:bg-white/[0.02]">
                <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-white/[0.05] animate-pulse shrink-0" />
                <span className="ml-2 h-3 w-24 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 dark:border-white/[0.08] p-3">
          <div className="flex items-center rounded-xl hover:bg-slate-50 dark:hover:bg-[#141a28] transition border border-slate-200/60 dark:border-white/[0.08] px-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/[0.05] animate-pulse shrink-0" />
            <div className="ml-2 flex flex-col">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-2 w-16 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse mt-1" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 px-4 sm:px-8 border-b border-slate-100 dark:border-white/[0.08] bg-white/80 dark:bg-[#11141d]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            <div className="flex flex-col">
              <div className="h-3 w-20 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-2 w-10 rounded bg-slate-200 dark:bg-white/[0.05] animate-pulse mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-white/[0.05] animate-pulse" />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* KPI Cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm space-y-4">
                <div className="h-8 w-24 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
                <div className="h-12 w-32 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
                <div className="h-4 w-16 rounded bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
              </div>
            ))}
          </div>

          {/* Charts/content skeleton */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm h-96">
              <div className="h-8 w-1/3 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mb-4" />
              <div className="h-4 w-full rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-4 w-3/4 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mt-2" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mt-2" />
            </div>
            <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 border border-slate-100 dark:border-white/[0.08] shadow-sm h-96">
              <div className="h-8 w-1/2 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mb-4" />
              <div className="h-4 w-full rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse" />
              <div className="h-4 w-2/3 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mt-2" />
              <div className="h-4 w-1/3 rounded-lg bg-slate-100 dark:bg-white/[0.05] animate-pulse mt-2" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
