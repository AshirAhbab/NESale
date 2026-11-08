"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarClock, Clock, RefreshCw, Save, Globe2, Info } from "lucide-react";
import { toast } from "@/components/ui/Toast";

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ScheduleEntry {
  id?: string;
  staffId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DayState {
  active: boolean;
  startTime: string;
  endTime: string;
}

type DaysMap = Record<number, DayState>;

function buildDays(entries: ScheduleEntry[]): DaysMap {
  const map: DaysMap = {};
  for (let day = 0; day < 7; day += 1) {
    const match = entries.find((e) => e.dayOfWeek === day);
    map[day] = {
      active: match ? match.isActive : false,
      startTime: match?.startTime || "09:00",
      endTime: match?.endTime || "17:00",
    };
  }
  return map;
}

export default function SchedulePage() {
  const [allSchedules, setAllSchedules] = useState<ScheduleEntry[]>([]);
  const [staff, setStaff] = useState<{ id: string; name: string }[]>([]);
  const [timezone, setTimezone] = useState("UTC");
  const [scope, setScope] = useState("business");
  const [days, setDays] = useState<DaysMap>(buildDays([]));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/dashboard/schedule", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to load schedule");
      setAllSchedules(Array.isArray(data.schedules) ? data.schedules : []);
      setStaff(Array.isArray(data.staff) ? data.staff : []);
      setTimezone(data.timezone || "UTC");
      setDays(buildDays(Array.isArray(data.schedules) ? data.schedules : []));
    } catch (err: any) {
      toast.error(err?.message || "Could not load schedule.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const scopedEntries = useMemo(() => {
    const staffId = scope === "business" ? null : scope;
    return allSchedules.filter((s) => (s.staffId || null) === staffId);
  }, [allSchedules, scope]);

  useEffect(() => {
    setDays(buildDays(scopedEntries));
  }, [scopedEntries]);

  const activeDayCount = Object.values(days).filter((d) => d.active).length;
  const totalWeeklyHours = Object.values(days).reduce((sum, d) => {
    if (!d.active) return sum;
    const [sh, sm] = d.startTime.split(":").map(Number);
    const [eh, em] = d.endTime.split(":").map(Number);
    const minutes = eh * 60 + em - (sh * 60 + sm);
    return sum + Math.max(0, minutes) / 60;
  }, 0);

  const handleSave = async () => {
    for (let day = 0; day < 7; day += 1) {
      const d = days[day];
      if (!d.active) continue;
      if (d.startTime >= d.endTime) {
        toast.error(`${DAY_LABELS[day]}: end time must be after start time.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/dashboard/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffId: scope === "business" ? null : scope,
          entries: Object.entries(days).map(([day, value]) => ({
            dayOfWeek: Number(day),
            startTime: value.startTime,
            endTime: value.endTime,
            isActive: value.active,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to save schedule");
      toast.success("Booking hours saved.");
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Could not save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-[1100px] mx-auto animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">Schedule</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Booking Hours
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              <Globe2 className="w-3 h-3" />
              {timezone}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Set the weekly hours the widget and AI receptionist may offer for bookings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#11141d] hover:bg-slate-50 dark:hover:bg-white/[0.04] text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Saving..." : "Save Hours"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-indigo-600" />
                Weekly availability
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Times are interpreted in the business timezone ({timezone}).
              </p>
            </div>
            {staff.length > 0 && (
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold outline-none"
              >
                <option value="business">Business hours (all staff)</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading schedule...</div>
          ) : (
            <div className="space-y-2">
              {DAY_LABELS.map((label, day) => {
                const state = days[day] || { active: false, startTime: "09:00", endTime: "17:00" };
                return (
                  <div
                    key={label}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl border transition ${
                      state.active
                        ? "border-indigo-100 dark:border-indigo-500/25 bg-indigo-50/40 dark:bg-indigo-500/[0.06]"
                        : "border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]"
                    }`}
                  >
                    <label className="flex items-center gap-2.5 min-w-[150px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.active}
                        onChange={(e) =>
                          setDays((prev) => ({
                            ...prev,
                            [day]: { ...state, active: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-bold">{label}</span>
                    </label>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="time"
                        value={state.startTime}
                        disabled={!state.active}
                        onChange={(e) =>
                          setDays((prev) => ({
                            ...prev,
                            [day]: { ...state, startTime: e.target.value },
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold outline-none disabled:opacity-40"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="time"
                        value={state.endTime}
                        disabled={!state.active}
                        onChange={(e) =>
                          setDays((prev) => ({
                            ...prev,
                            [day]: { ...state, endTime: e.target.value },
                          }))
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#171b26] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold outline-none disabled:opacity-40"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">This week</h3>
            <div className="mt-3 space-y-3">
              <div>
                <div className="text-2xl font-extrabold">{activeDayCount} days</div>
                <div className="text-[11px] text-slate-500">Open for booking</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold">{totalWeeklyHours.toFixed(1)} h</div>
                <div className="text-[11px] text-slate-500">Available per week</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/70 dark:bg-indigo-500/[0.06] rounded-3xl border border-indigo-100 dark:border-indigo-500/20 p-4">
            <div className="flex items-start gap-2 text-indigo-700 dark:text-indigo-300">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <p className="text-[11px] leading-relaxed">
                Slots are generated in 15-minute increments. Appointments that already exist block
                conflicting times automatically, and cancelled bookings free their slot again.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
