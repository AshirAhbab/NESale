/**
 * Availability engine for native booking.
 *
 * Schedules are stored as weekly rows (business-wide when staffId is null)
 * with "HH:MM" start/end times interpreted in the business timezone.
 */

export interface ScheduleRow {
  id?: string;
  staffId?: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive?: boolean;
}

export interface BookedRange {
  startAt: Date;
  endAt: Date;
  staffId?: string | null;
}

export interface TimeSlot {
  start: string;
  end: string;
  staffId: string | null;
}

export const DEFAULT_TIMEZONE = "UTC";
export const DEFAULT_DURATION_MINUTES = 30;
export const DEFAULT_SLOT_STEP_MINUTES = 15;

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const hour = get("hour") === 24 ? 0 : get("hour");
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));
  return asUTC - date.getTime();
}

/**
 * Converts a business-local date + minutes-from-midnight into an absolute Date.
 * Handles DST by computing the zone offset twice.
 */
export function zonedDateTime(date: string, minutes: number, timeZone = DEFAULT_TIMEZONE): Date {
  const [year, month, day] = date.split("-").map(Number);
  const guess = Date.UTC(year, month - 1, day, 0, 0, 0) + minutes * 60_000;
  let offset = timeZoneOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset;
  offset = timeZoneOffsetMs(new Date(utc), timeZone);
  utc = guess - offset;
  return new Date(utc);
}

export function dayOfWeekForDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function conflicts(a: BookedRange, b: BookedRange): boolean {
  if (!overlaps(a.startAt.getTime(), a.endAt.getTime(), b.startAt.getTime(), b.endAt.getTime())) {
    return false;
  }
  // Unassigned appointments block the whole business.
  if (!a.staffId || !b.staffId) return true;
  return a.staffId === b.staffId;
}

/**
 * Generates bookable slots for one day.
 */
export function generateSlots(options: {
  date: string;
  timezone?: string;
  durationMinutes?: number;
  stepMinutes?: number;
  schedules: ScheduleRow[];
  appointments?: BookedRange[];
  staffId?: string | null;
  now?: Date;
  leadTimeMinutes?: number;
}): TimeSlot[] {
  const {
    date,
    timezone = DEFAULT_TIMEZONE,
    durationMinutes = DEFAULT_DURATION_MINUTES,
    stepMinutes = DEFAULT_SLOT_STEP_MINUTES,
    schedules,
    appointments = [],
    staffId = null,
    now = new Date(),
    leadTimeMinutes = 0,
  } = options;

  if (!isValidDateString(date)) return [];

  const dow = dayOfWeekForDate(date);
  const dayRows = schedules.filter((s) => s.isActive !== false && s.dayOfWeek === dow);
  const staffRows = staffId == null ? [] : dayRows.filter((s) => s.staffId === staffId);
  // Staff-specific hours take precedence; otherwise fall back to business-wide hours.
  const relevant =
    staffId != null && staffRows.length > 0
      ? staffRows
      : dayRows.filter((s) => staffId == null || s.staffId == null);

  const earliest = now.getTime() + leadTimeMinutes * 60_000;
  const seen = new Set<string>();
  const slots: TimeSlot[] = [];

  for (const row of relevant) {
    if (!isValidTimeString(row.startTime) || !isValidTimeString(row.endTime)) continue;
    const open = timeToMinutes(row.startTime);
    const close = timeToMinutes(row.endTime);
    if (close <= open) continue;

    for (let startMin = open; startMin + durationMinutes <= close; startMin += stepMinutes) {
      const start = zonedDateTime(date, startMin, timezone);
      const end = zonedDateTime(date, startMin + durationMinutes, timezone);
      if (start.getTime() < earliest) continue;

      const slotStaffId = staffId != null ? row.staffId ?? null : null;
      const key = `${start.toISOString()}|${slotStaffId ?? ""}`;
      if (seen.has(key)) continue;

      const candidate: BookedRange = { startAt: start, endAt: end, staffId: slotStaffId };
      if (appointments.some((booked) => conflicts(candidate, booked))) continue;

      seen.add(key);
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        staffId: slotStaffId,
      });
    }
  }

  return slots.sort((a, b) => a.start.localeCompare(b.start));
}

/**
 * Checks whether a requested window fits inside a schedule and has no conflicts.
 */
export function isSlotBookable(options: {
  start: Date;
  end: Date;
  timezone?: string;
  schedules: ScheduleRow[];
  appointments?: BookedRange[];
  staffId?: string | null;
}): boolean {
  const { start, end, timezone = DEFAULT_TIMEZONE, schedules, appointments = [], staffId = null } = options;
  if (!(start instanceof Date) || Number.isNaN(start.getTime())) return false;
  if (end.getTime() <= start.getTime()) return false;

  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(start);

  const dow = dayOfWeekForDate(date);
  const startMinutes = localMinutes(start, timezone);
  const endMinutes = startMinutes + Math.round((end.getTime() - start.getTime()) / 60_000);

  const inside = schedules.some((s) => {
    if (s.isActive === false || s.dayOfWeek !== dow) return false;
    if (staffId != null && s.staffId != null && s.staffId !== staffId) return false;
    if (!isValidTimeString(s.startTime) || !isValidTimeString(s.endTime)) return false;
    return startMinutes >= timeToMinutes(s.startTime) && endMinutes <= timeToMinutes(s.endTime);
  });
  if (!inside) return false;

  const candidate: BookedRange = { startAt: start, endAt: end, staffId };
  return !appointments.some((booked) => conflicts(candidate, booked));
}

function localMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
