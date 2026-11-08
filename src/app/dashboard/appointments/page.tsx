"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Phone,
  Mail,
  User,
  CalendarCheck,
  AlertCircle,
  X,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

interface Appointment {
  id: string;
  serviceId: string | null;
  serviceName: string | null;
  staffId: string | null;
  staffName: string | null;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  startAt: string;
  endAt: string;
  status: string;
  source: string;
  notes: string | null;
}

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

interface StaffOption {
  id: string;
  name: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25",
  completed: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/[0.06] dark:text-slate-300 dark:border-white/[0.08]",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25",
  no_show: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/25",
};

function localDateKey(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDay(value: string) {
  return new Date(value).toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    serviceId: "",
    staffId: "",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    notes: "",
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const to = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const [apptRes, serviceRes, scheduleRes] = await Promise.all([
        fetch(`/api/v1/dashboard/appointments?from=${from}&to=${to}`, { cache: "no-store" }),
        fetch("/api/v1/dashboard/services", { cache: "no-store" }),
        fetch("/api/v1/dashboard/schedule", { cache: "no-store" }),
      ]);
      const apptData = await apptRes.json();
      const serviceData = await serviceRes.json();
      const scheduleData = await scheduleRes.json();

      if (Array.isArray(apptData.appointments)) setAppointments(apptData.appointments);
      if (Array.isArray(serviceData.services)) {
        setServices(
          serviceData.services.map((s: any) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes || 30,
          }))
        );
      }
      if (Array.isArray(scheduleData.staff)) setStaff(scheduleData.staff);
    } catch (err) {
      console.warn("Failed to load appointments:", err);
      toast.error("Could not load appointments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.customerName.toLowerCase().includes(q) ||
        (a.customerEmail || "").toLowerCase().includes(q) ||
        (a.customerPhone || "").toLowerCase().includes(q) ||
        (a.serviceName || "").toLowerCase().includes(q)
      );
    });
  }, [appointments, statusFilter, searchQuery]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const appt of filtered) {
      const key = localDateKey(appt.startAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(appt);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const stats = useMemo(() => {
    const todayKey = localDateKey(new Date().toISOString());
    return {
      today: appointments.filter((a) => localDateKey(a.startAt) === todayKey).length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      upcoming: appointments.filter(
        (a) =>
          new Date(a.startAt).getTime() >= Date.now() &&
          !["cancelled", "completed", "no_show"].includes(a.status)
      ).length,
    };
  }, [appointments]);

  const updateStatus = async (appointment: Appointment, status: string) => {
    try {
      const res = await fetch(`/api/v1/dashboard/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to update appointment");
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? { ...a, status } : a))
      );
      toast.success(`Appointment marked ${status.replace("_", " ")}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update appointment.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!form.date || !form.time) {
      toast.error("Pick a date and time.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/dashboard/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: form.serviceId || null,
          staffId: form.staffId || null,
          date: form.date,
          time: form.time,
          customerName: form.customerName,
          customerEmail: form.customerEmail || null,
          customerPhone: form.customerPhone || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to create appointment");
      setShowModal(false);
      setForm({
        serviceId: "",
        staffId: "",
        date: new Date().toISOString().slice(0, 10),
        time: "09:00",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        notes: "",
      });
      await loadData();
      toast.success("Appointment created.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create appointment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-[1400px] mx-auto animate-fade-in text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>&gt;</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">Appointments</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Appointments
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-[#171b26] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
              Native booking
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review, confirm, and manage bookings made by your team, widget, and AI receptionist.
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
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-[0.99] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "TODAY", value: stats.today, icon: CalendarDays },
          { label: "UPCOMING", value: stats.upcoming, icon: CalendarCheck },
          { label: "PENDING", value: stats.pending, icon: AlertCircle },
          { label: "CONFIRMED", value: stats.confirmed, icon: CheckCircle2 },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-[#11141d] rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-white/[0.08] shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold mt-2">{card.value}</div>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/[0.08] flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer, email, or service..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {["all", "pending", "confirmed", "completed", "cancelled"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer capitalize ${
                  statusFilter === status
                    ? "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30"
                    : "bg-white dark:bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/[0.08] hover:border-slate-300"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading appointments...</div>
        ) : grouped.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold">No appointments yet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Bookings from your widget and AI receptionist will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {grouped.map(([date, items]) => (
              <div key={date} className="p-4 sm:p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  {formatDay(items[0].startAt)}
                </h3>
                <div className="space-y-2">
                  {items.map((appt) => (
                    <div
                      key={appt.id}
                      className="flex flex-col lg:flex-row lg:items-center gap-3 p-3.5 rounded-2xl border border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-3 min-w-[170px]">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold">
                            {formatTime(appt.startAt)} – {formatTime(appt.endAt)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {appt.serviceName || "General appointment"}
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{appt.customerName}</div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                          {appt.customerPhone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {appt.customerPhone}
                            </span>
                          )}
                          {appt.customerEmail && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {appt.customerEmail}
                            </span>
                          )}
                          {appt.staffName && (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" /> {appt.staffName}
                            </span>
                          )}
                          <span className="capitalize">via {appt.source}</span>
                        </div>
                        {appt.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{appt.notes}</p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border capitalize self-start ${
                          STATUS_STYLES[appt.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {appt.status.replace("_", " ")}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {appt.status === "pending" && (
                          <button
                            onClick={() => updateStatus(appt, "confirmed")}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}
                        {["pending", "confirmed"].includes(appt.status) && (
                          <>
                            <button
                              onClick={() => updateStatus(appt, "completed")}
                              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition cursor-pointer"
                            >
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(appt, "cancelled")}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition cursor-pointer"
                              aria-label="Cancel appointment"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#11141d] rounded-3xl border border-slate-100 dark:border-white/[0.08] shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/[0.08]">
              <h2 className="text-sm font-extrabold">New Appointment</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Service
                  <select
                    value={form.serviceId}
                    onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                  >
                    <option value="">General appointment</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes} min)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Staff (optional)
                  <select
                    value={form.staffId}
                    onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                  >
                    <option value="">Any available</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Date
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Time
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                Customer name
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                  placeholder="Jane Cooper"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Email
                  <input
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                    placeholder="jane@example.com"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                  Phone
                  <input
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none"
                    placeholder="+1 555 000 0000"
                  />
                </label>
              </div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 space-y-1.5 block">
                Notes
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-xs font-normal outline-none resize-none"
                  placeholder="Anything the team should know"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? "Saving..." : "Create Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
