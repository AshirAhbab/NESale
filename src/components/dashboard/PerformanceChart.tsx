"use client";

import React, { useState, useEffect } from "react";
import { SlidersHorizontal, Download, BarChart2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";

export const PerformanceChart: React.FC = () => {
  const [activeRange, setActiveRange] = useState<"7D" | "30D" | "90D">("30D");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isAnimated, setIsAnimated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsAnimated(false);
    setIsLoading(true);
    fetch(`/api/v1/dashboard/analytics?timeRange=${activeRange}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.chartPoints && data.chartPoints.length > 0) {
          // Check if there is actual activity across the points
          const hasActivity = data.chartPoints.some(
            (pt: any) => (pt.convos || 0) > 0 || (pt.clicks || 0) > 0 || (pt.cart || 0) > 0 || (pt.orders || 0) > 0 || (pt.revenue || 0) > 0
          );

          if (!hasActivity) {
            setChartData([]);
            setIsLoading(false);
            return;
          }

          const maxConvos = Math.max(...data.chartPoints.map((pt: any) => pt.convos || 0), 10);
          const maxClicks = Math.max(...data.chartPoints.map((pt: any) => pt.clicks || 0), 10);
          const maxCart = Math.max(...data.chartPoints.map((pt: any) => pt.cart || 0), 10);

          const mapped = data.chartPoints.map((pt: any, idx: number) => {
            const x = 60 + idx * ((720 - 60) / Math.max(data.chartPoints.length - 1, 1));
            const conv = pt.convos || 0;
            const clicks = pt.clicks || 0;
            const cart = pt.cart || 0;
            const rev = typeof pt.revenue === "number" ? `$${pt.revenue.toFixed(2)}` : `$${pt.revenue || "0.00"}`;

            const y1 = Math.max(40, Math.min(220, 220 - (conv / maxConvos) * 140));
            const y2 = Math.max(40, Math.min(220, 220 - (clicks / maxClicks) * 120));
            const y3 = Math.max(40, Math.min(220, 220 - (cart / maxCart) * 100));

            return {
              date: pt.date,
              conv,
              clicks,
              cart,
              rev,
              x,
              y1,
              y2,
              y3,
            };
          });
          setChartData(mapped);
          setTimeout(() => setIsAnimated(true), 50);
        } else {
          setChartData([]);
        }
      })
      .catch(() => {
        setChartData([]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeRange]);

  const points = chartData;
  const currentHover = hoveredPoint !== null ? points[hoveredPoint] || null : null;

  const handleExportChart = () => {
    try {
      if (points.length === 0) {
        toast.info("No activity data to export for this range.");
        return;
      }
      const headers = ["Date", "AI Conversations", "Product Clicks", "Add to Cart", "Attributed Revenue"];
      const rows = points.map((p) => [p.date, p.conv, p.clicks, p.cart, p.rev]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `NESale_Performance_${activeRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Performance chart exported!");
    } catch {
      toast.error("Failed to export chart");
    }
  };

  // Build SVG paths if points exist
  const indigoPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y1}`).join(" ");
  const bluePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y2}`).join(" ");
  const emeraldPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y3}`).join(" ");
  const lastX = points[points.length - 1]?.x || 720;
  const firstX = points[0]?.x || 60;
  const areaPath = points.length > 0 ? `${indigoPath} L ${lastX},230 L ${firstX},230 Z` : "";

  return (
    <div className="bg-white dark:bg-[#11141d] rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-white/[0.08] shadow-sm relative overflow-hidden animate-fade-in">
      {/* Chart Top Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-white/[0.08]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            AI sales performance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Daily volume metrics correlating conversational triggers to checkouts.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          <div className="bg-slate-100 dark:bg-white/[0.06] p-1 rounded-2xl flex items-center gap-1">
            {(["7D", "30D", "90D"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setActiveRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-xl transition cursor-pointer active:scale-[0.98] ${
                  activeRange === range
                    ? "bg-white dark:bg-[#11141d] text-slate-900 dark:text-white shadow-xs font-bold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportChart}
            disabled={points.length === 0}
            className="p-2 rounded-xl border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-600 dark:text-slate-300 transition cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 text-xs font-medium">
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
          <span>AI Conversations</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>Product Clicks</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span>Add to Cart</span>
        </div>
      </div>

      {/* Empty State vs. Live SVG Chart Canvas */}
      {isLoading ? (
        <div className="h-64 sm:h-72 w-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : points.length === 0 ? (
        <div className="mt-4 h-64 sm:h-72 w-full rounded-2xl bg-slate-50/60 dark:bg-[#171b26]/50 border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
            <BarChart2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No Conversational Activity Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Once shoppers begin interacting with your AI assistant on your storefront, your daily volume trends, recommendation CTRs, and conversions will graph here in real time.
          </p>
        </div>
      ) : (
        <div
          className="relative mt-4 h-64 sm:h-72 w-full select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <svg
            className="w-full h-full overflow-visible"
            viewBox="0 0 780 260"
            preserveAspectRatio="none"
          >
            {/* Subtle Grid horizontal lines */}
            <line x1="40" y1="50" x2="760" y2="50" stroke="#F1F5F9" strokeWidth="1" className="dark:stroke-white/[0.04]" />
            <line x1="40" y1="110" x2="760" y2="110" stroke="#F1F5F9" strokeWidth="1" className="dark:stroke-white/[0.04]" />
            <line x1="40" y1="170" x2="760" y2="170" stroke="#F1F5F9" strokeWidth="1" className="dark:stroke-white/[0.04]" />
            <line x1="40" y1="230" x2="760" y2="230" stroke="#E2E8F0" strokeWidth="1" className="dark:stroke-white/[0.08]" />

            {/* Area Gradient Shading for Indigo Line */}
            <defs>
              <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Area Fill with Smooth Fade-In */}
            <path
              d={areaPath}
              fill="url(#indigoGradient)"
              className="transition-opacity duration-700 ease-out"
              opacity={isAnimated ? 1 : 0}
            />

            {/* Indigo Main Line with Drawing Animation */}
            <path
              d={indigoPath}
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
              strokeDasharray={1200}
              strokeDashoffset={isAnimated ? 0 : 1200}
              style={{ transitionProperty: "stroke-dashoffset, d", transitionDuration: "0.8s" }}
            />

            {/* Blue Line (Product Clicks) */}
            <path
              d={bluePath}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
              className="transition-opacity duration-700 ease-out"
              opacity={isAnimated ? 1 : 0}
            />

            {/* Emerald Line (Add to Cart) */}
            <path
              d={emeraldPath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              className="transition-opacity duration-700 ease-out"
              opacity={isAnimated ? 1 : 0}
            />

            {/* Vertical guideline & glowing dot on active hover */}
            {currentHover && (
              <g className="transition-all duration-150 ease-out">
                <line
                  x1={currentHover.x}
                  y1="30"
                  x2={currentHover.x}
                  y2="230"
                  stroke="#6366F1"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="opacity-70 dark:opacity-90"
                />
                <circle
                  cx={currentHover.x}
                  cy={currentHover.y1}
                  r="10"
                  fill="#6366F1"
                  fillOpacity="0.25"
                  className="animate-ping"
                />
                <circle
                  cx={currentHover.x}
                  cy={currentHover.y1}
                  r="5"
                  fill="#6366F1"
                  stroke="currentColor"
                  className="text-white dark:text-[#11141d]"
                  strokeWidth="2.5"
                />
                <circle
                  cx={currentHover.x}
                  cy={currentHover.y3}
                  r="4"
                  fill="#10B981"
                  stroke="currentColor"
                  className="text-white dark:text-[#11141d]"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Interactive column hover zones */}
            {points.map((pt, i) => {
              const colWidth = 720 / Math.max(points.length, 1);
              return (
                <rect
                  key={i}
                  x={pt.x - colWidth / 2}
                  y="20"
                  width={colWidth}
                  height="220"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(i)}
                />
              );
            })}
          </svg>

          {/* Floating Tooltip Box */}
          {currentHover && (
            <div
              className="absolute z-20 pointer-events-none transition-all duration-150 ease-out -translate-x-1/2 animate-in fade-in zoom-in-95"
              style={{
                left: `${(currentHover.x / 780) * 100}%`,
                top: `${Math.max(10, currentHover.y1 - 76)}px`,
              }}
            >
              <div className="bg-slate-900/95 dark:bg-[#11141d]/95 backdrop-blur-md text-white text-[11px] p-3 rounded-2xl shadow-xl border border-slate-700/60 dark:border-white/[0.12] min-w-[155px] space-y-1.5 ring-1 ring-black/20">
                <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 flex justify-between items-center">
                  <span>{currentHover.date}</span>
                  <span className="text-emerald-400 font-extrabold text-xs">{currentHover.rev}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span>AI Chats:</span>
                  </span>
                  <span className="font-bold text-white">{currentHover.conv}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>Clicks:</span>
                  </span>
                  <span className="font-bold text-white">{currentHover.clicks}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Carts:</span>
                  </span>
                  <span className="font-bold text-white">{currentHover.cart}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
