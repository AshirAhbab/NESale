import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isServicesBusiness } from "@/lib/business/types";
import {
  addDaysToDateString,
  findBusinessBySlugOrId,
  loadBookingContext,
  loadBookedRanges,
  todayInTimezone,
} from "@/lib/booking/data";
import { generateSlots, isValidDateString } from "@/lib/booking/availability";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier =
      searchParams.get("business_id") ||
      searchParams.get("businessId") ||
      searchParams.get("slug") ||
      searchParams.get("business");

    if (!identifier) {
      return NextResponse.json(
        { error: { message: "business_id or slug is required" } },
        { status: 400 }
      );
    }

    const business = await findBusinessBySlugOrId(identifier);
    if (!business) {
      return NextResponse.json({ error: { message: "Business not found" } }, { status: 404 });
    }
    if (!isServicesBusiness(business.businessType)) {
      return NextResponse.json(
        { error: { message: "Booking is only available for service businesses" } },
        { status: 400 }
      );
    }

    const context = await loadBookingContext(business.id);
    if (!context) {
      return NextResponse.json({ error: { message: "Business not found" } }, { status: 404 });
    }

    const serviceId = searchParams.get("service_id") || searchParams.get("serviceId");
    let durationMinutes = 30;
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId, businessId: business.id, status: "active" },
        select: { durationMinutes: true },
      });
      if (!service) {
        return NextResponse.json({ error: { message: "Service not found" } }, { status: 404 });
      }
      durationMinutes = service.durationMinutes || 30;
    }

    const date = searchParams.get("date") || todayInTimezone(context.timezone);
    if (!isValidDateString(date)) {
      return NextResponse.json({ error: { message: "date must be YYYY-MM-DD" } }, { status: 400 });
    }
    const days = Math.min(Math.max(parseInt(searchParams.get("days") || "1", 10) || 1, 1), 14);
    const staffId = searchParams.get("staff_id") || searchParams.get("staffId") || null;

    const lastDate = addDaysToDateString(date, days - 1);
    const [y, m, d] = date.split("-").map(Number);
    const from = new Date(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1000);
    const [ly, lm, ld] = lastDate.split("-").map(Number);
    const to = new Date(Date.UTC(ly, lm - 1, ld) + 2 * 24 * 60 * 60 * 1000);

    const booked = await loadBookedRanges(business.id, from, to);

    const result = [];
    for (let i = 0; i < days; i += 1) {
      const day = addDaysToDateString(date, i);
      const slots = generateSlots({
        date: day,
        timezone: context.timezone,
        durationMinutes,
        schedules: context.schedules,
        appointments: booked,
        staffId,
      });
      result.push({ date: day, slots });
    }

    return NextResponse.json({
      status: "success",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        businessType: business.businessType,
        businessSubtype: business.businessSubtype,
      },
      serviceId: serviceId || null,
      durationMinutes,
      timezone: context.timezone,
      bookingUrl: context.bookingUrl,
      days: result,
    });
  } catch (error: any) {
    console.error("[Availability GET] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch availability" } },
      { status: 500 }
    );
  }
}
