import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import {
  BOOKABLE_STATUSES,
  getServiceDuration,
  loadBookingContext,
  loadBookedRanges,
} from "@/lib/booking/data";
import { isSlotBookable, zonedDateTime, timeToMinutes, isValidTimeString } from "@/lib/booking/availability";

function serialize(appointment: any) {
  return {
    id: appointment.id,
    businessId: appointment.businessId,
    serviceId: appointment.serviceId,
    serviceName: appointment.service?.name || null,
    staffId: appointment.staffId,
    staffName: appointment.staff?.name || null,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    startAt: appointment.startAt,
    endAt: appointment.endAt,
    status: appointment.status,
    source: appointment.source,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = await resolveCachedTenant(req, searchParams.get("businessId"));
    if (!tenant || !tenant.business) {
      return NextResponse.json({ status: "success", total: 0, appointments: [] });
    }
    const business = tenant.business;

    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const serviceId = searchParams.get("serviceId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500);

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const defaultTo = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

    const where: any = { businessId: business.id };
    if (status && BOOKABLE_STATUSES.includes(status as any)) where.status = status;
    if (serviceId) where.serviceId = serviceId;
    where.startAt = {
      gte: from ? new Date(from) : defaultFrom,
      lte: to ? new Date(to) : defaultTo,
    };

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { startAt: "asc" },
      take: limit,
      include: { service: { select: { name: true } }, staff: { select: { name: true } } },
    });

    return NextResponse.json({
      status: "success",
      total: appointments.length,
      appointments: appointments.map(serialize),
    });
  } catch (error: any) {
    console.error("[Appointments GET] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch appointments" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenant = await resolveCachedTenant(req, body.businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }
    const business = tenant.business;

    const customerName = String(body.customerName || body.customer_name || "").trim();
    if (!customerName) {
      return NextResponse.json({ error: { message: "Customer name is required" } }, { status: 400 });
    }

    const context = await loadBookingContext(business.id);
    if (!context) {
      return NextResponse.json({ error: { message: "Business not found" } }, { status: 404 });
    }

    let start: Date;
    if (body.startAt || body.start_at) {
      start = new Date(body.startAt || body.start_at);
    } else if (body.date && body.time) {
      if (!isValidTimeString(String(body.time))) {
        return NextResponse.json({ error: { message: "Invalid time format (HH:MM)" } }, { status: 400 });
      }
      start = zonedDateTime(String(body.date), timeToMinutes(String(body.time)), context.timezone);
    } else {
      return NextResponse.json(
        { error: { message: "startAt (ISO) or date + time is required" } },
        { status: 400 }
      );
    }

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: { message: "Invalid start time" } }, { status: 400 });
    }

    const duration = await getServiceDuration(business.id, body.serviceId);
    const end = new Date(start.getTime() + duration * 60_000);

    const existing = await loadBookedRanges(
      business.id,
      new Date(start.getTime() - 24 * 60 * 60 * 1000),
      new Date(end.getTime() + 24 * 60 * 60 * 1000)
    );

    if (context.schedules.length > 0) {
      const bookable = isSlotBookable({
        start,
        end,
        timezone: context.timezone,
        schedules: context.schedules,
        appointments: existing,
        staffId: body.staffId || null,
      });
      if (!bookable) {
        return NextResponse.json(
          { error: { message: "That time is outside business hours or already booked." } },
          { status: 409 }
        );
      }
    } else if (
      existing.some(
        (b) => start.getTime() < b.endAt.getTime() && b.startAt.getTime() < end.getTime()
      )
    ) {
      return NextResponse.json(
        { error: { message: "That time is already booked." } },
        { status: 409 }
      );
    }

    const status = BOOKABLE_STATUSES.includes(body.status) ? body.status : "pending";

    let appointment;
    try {
      appointment = await prisma.$transaction(async (tx) => {
        const activeOverlap = await tx.appointment.findFirst({
          where: {
            businessId: business.id,
            status: { in: ["confirmed", "pending"] },
            startAt: { lt: end },
            endAt: { gt: start },
            ...(body.staffId ? { staffId: body.staffId } : {}),
          },
        });

        if (activeOverlap) {
          throw new Error("SLOT_ALREADY_BOOKED");
        }

        return tx.appointment.create({
          data: {
            businessId: business.id,
            teamId: body.teamId || null,
            serviceId: body.serviceId || null,
            staffId: body.staffId || null,
            customerName,
            customerEmail: body.customerEmail || null,
            customerPhone: body.customerPhone || null,
            startAt: start,
            endAt: end,
            status,
            source: "dashboard",
            notes: body.notes || null,
          },
          include: { service: { select: { name: true } }, staff: { select: { name: true } } },
        });
      });
    } catch (txErr: any) {
      if (txErr?.message === "SLOT_ALREADY_BOOKED") {
        return NextResponse.json({ error: { message: "That time was just booked by another customer." } }, { status: 409 });
      }
      throw txErr;
    }

    return NextResponse.json({ status: "success", appointment: serialize(appointment) });
  } catch (error: any) {
    console.error("[Appointments POST] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to create appointment" } },
      { status: 500 }
    );
  }
}
