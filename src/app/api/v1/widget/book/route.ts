import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { isServicesBusiness } from "@/lib/business/types";
import {
  findBusinessBySlugOrId,
  getServiceDuration,
  loadBookingContext,
  loadBookedRanges,
} from "@/lib/booking/data";
import {
  isSlotBookable,
  isValidTimeString,
  timeToMinutes,
  zonedDateTime,
} from "@/lib/booking/availability";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const identifier =
      body.business_id || body.businessId || body.slug || body.business;
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

    const customerName = String(body.customerName || body.customer_name || "").trim();
    if (!customerName) {
      return NextResponse.json({ error: { message: "Your name is required" } }, { status: 400 });
    }
    const customerEmail = body.customerEmail || body.customer_email || null;
    const customerPhone = body.customerPhone || body.customer_phone || null;
    if (!customerEmail && !customerPhone) {
      return NextResponse.json(
        { error: { message: "An email or phone number is required" } },
        { status: 400 }
      );
    }

    const context = await loadBookingContext(business.id);
    if (!context) {
      return NextResponse.json({ error: { message: "Business not found" } }, { status: 404 });
    }

    const serviceId = body.serviceId || body.service_id || null;
    if (serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: serviceId, businessId: business.id, status: "active" },
      });
      if (!service) {
        return NextResponse.json({ error: { message: "Service not found" } }, { status: 404 });
      }
    }

    const staffId = body.staffId || body.staff_id || null;

    let start: Date;
    if (body.startAt || body.start_at) {
      start = new Date(body.startAt || body.start_at);
    } else if (body.date && body.time) {
      if (!isValidTimeString(String(body.time))) {
        return NextResponse.json({ error: { message: "time must use HH:MM" } }, { status: 400 });
      }
      start = zonedDateTime(String(body.date), timeToMinutes(String(body.time)), context.timezone);
    } else {
      return NextResponse.json(
        { error: { message: "startAt or date + time is required" } },
        { status: 400 }
      );
    }

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: { message: "Invalid start time" } }, { status: 400 });
    }
    if (start.getTime() < Date.now() - 60_000) {
      return NextResponse.json({ error: { message: "Please choose a future time" } }, { status: 400 });
    }

    const duration = await getServiceDuration(business.id, serviceId);
    const end = new Date(start.getTime() + duration * 60_000);

    const booked = await loadBookedRanges(
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
        appointments: booked,
        staffId,
      });
      if (!bookable) {
        return NextResponse.json(
          { error: { message: "That time is no longer available. Please pick another slot." } },
          { status: 409 }
        );
      }
    } else {
      return NextResponse.json(
        { error: { message: "This business has not published booking hours yet." } },
        { status: 409 }
      );
    }

    if (
      booked.some((b) => start.getTime() < b.endAt.getTime() && b.startAt.getTime() < end.getTime())
    ) {
      return NextResponse.json(
        { error: { message: "That time is already booked. Please pick another slot." } },
        { status: 409 }
      );
    }

    const appointment = await prisma.appointment.create({
      data: {
        businessId: business.id,
        teamId: body.teamId || null,
        serviceId,
        staffId,
        customerName,
        customerEmail,
        customerPhone,
        startAt: start,
        endAt: end,
        status: context.autoConfirm ? "confirmed" : "pending",
        source: body.source || "widget",
        notes: body.notes || null,
        conversationId: body.conversationId || body.conversation_id || null,
        metadata: body.metadata || {},
      },
      include: { service: { select: { name: true } }, staff: { select: { name: true } } },
    });

    return NextResponse.json({
      status: "success",
      appointment: {
        id: appointment.id,
        businessId: appointment.businessId,
        serviceId: appointment.serviceId,
        serviceName: appointment.service?.name || null,
        staffName: appointment.staff?.name || null,
        customerName: appointment.customerName,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        status: appointment.status,
        timezone: context.timezone,
      },
      message: context.autoConfirm
        ? "Your appointment is confirmed."
        : "Your appointment request has been received. The business will confirm shortly.",
    });
  } catch (error: any) {
    console.error("[Widget Book POST] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to book appointment" } },
      { status: 500 }
    );
  }
}
