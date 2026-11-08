import { prisma } from "@/lib/db/prisma";
import { getBusinessTimezone } from "@/lib/auth/current-business";
import {
  BookedRange,
  DEFAULT_DURATION_MINUTES,
  DEFAULT_TIMEZONE,
  ScheduleRow,
} from "./availability";

export interface BookingContext {
  business: {
    id: string;
    name: string;
    slug: string | null;
    businessType: string;
    businessSubtype: string | null;
  };
  timezone: string;
  bookingUrl: string | null;
  autoConfirm: boolean;
  schedules: ScheduleRow[];
}

export async function loadBookingContext(businessId: string): Promise<BookingContext | null> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { businessSettings: true },
  });
  if (!business) return null;

  const settings = (business.businessSettings?.settings as Record<string, any>) || {};
  const schedules = await prisma.staffSchedule.findMany({
    where: { businessId },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return {
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      businessType: business.businessType,
      businessSubtype: business.businessSubtype,
    },
    timezone: getBusinessTimezone(settings) || DEFAULT_TIMEZONE,
    bookingUrl: business.businessSettings?.bookingUrl || null,
    autoConfirm: settings.autoConfirmBookings === true,
    schedules: schedules.map((s) => ({
      id: s.id,
      staffId: s.staffId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      isActive: s.isActive,
    })),
  };
}

export async function loadBookedRanges(
  businessId: string,
  from: Date,
  to: Date
): Promise<BookedRange[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      businessId,
      status: { notIn: ["cancelled", "no_show"] },
      startAt: { lt: to },
      endAt: { gt: from },
    },
    select: { startAt: true, endAt: true, staffId: true },
  });
  return rows;
}

export async function getServiceDuration(businessId: string, serviceId?: string | null): Promise<number> {
  if (!serviceId) return DEFAULT_DURATION_MINUTES;
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId },
    select: { durationMinutes: true },
  });
  return service?.durationMinutes || DEFAULT_DURATION_MINUTES;
}

export async function findBusinessBySlugOrId(value: string) {
  const byId = await prisma.business.findUnique({ where: { id: value } });
  if (byId) return byId;
  return prisma.business.findFirst({ where: { slug: value } });
}

export function todayInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export const BOOKABLE_STATUSES = ["pending", "confirmed", "completed", "cancelled", "no_show"] as const;
