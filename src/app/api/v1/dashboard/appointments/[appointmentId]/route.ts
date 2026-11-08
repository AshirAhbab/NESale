import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import {
  BOOKABLE_STATUSES,
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
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const body = await req.json();
    const tenant = await resolveCachedTenant(body.businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }
    const business = tenant.business;

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: { message: "Appointment not found" } }, { status: 404 });
    }

    const data: any = {};
    if (body.status) {
      if (!BOOKABLE_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: { message: "Invalid status" } }, { status: 400 });
      }
      data.status = body.status;
    }
    if (typeof body.notes === "string") data.notes = body.notes;
    if (body.customerName) data.customerName = String(body.customerName).trim();
    if (body.customerEmail !== undefined) data.customerEmail = body.customerEmail || null;
    if (body.customerPhone !== undefined) data.customerPhone = body.customerPhone || null;
    if (body.staffId !== undefined) data.staffId = body.staffId || null;

    const wantsReschedule = body.startAt || (body.date && body.time) || body.serviceId;
    if (wantsReschedule) {
      const context = await loadBookingContext(business.id);
      if (!context) {
        return NextResponse.json({ error: { message: "Business not found" } }, { status: 404 });
      }

      const serviceId = body.serviceId ?? existing.serviceId;
      let start = existing.startAt;
      if (body.startAt) {
        start = new Date(body.startAt);
      } else if (body.date && body.time) {
        if (!isValidTimeString(String(body.time))) {
          return NextResponse.json({ error: { message: "Invalid time format (HH:MM)" } }, { status: 400 });
        }
        start = zonedDateTime(String(body.date), timeToMinutes(String(body.time)), context.timezone);
      }
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: { message: "Invalid start time" } }, { status: 400 });
      }

      const staffId = data.staffId !== undefined ? data.staffId : existing.staffId;
      const duration = await getServiceDuration(business.id, serviceId);
      const end = new Date(start.getTime() + duration * 60_000);

      const booked = (
        await loadBookedRanges(
          business.id,
          new Date(start.getTime() - 24 * 60 * 60 * 1000),
          new Date(end.getTime() + 24 * 60 * 60 * 1000)
        )
      ).filter((b) => b.startAt.getTime() !== existing.startAt.getTime());

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
            { error: { message: "That time is outside business hours or already booked." } },
            { status: 409 }
          );
        }
      }

      data.serviceId = serviceId;
      data.staffId = staffId;
      data.startAt = start;
      data.endAt = end;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data,
      include: { service: { select: { name: true } }, staff: { select: { name: true } } },
    });

    return NextResponse.json({ status: "success", appointment: serialize(updated) });
  } catch (error: any) {
    console.error("[Appointments PATCH] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to update appointment" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const { appointmentId } = await params;
    const { searchParams } = new URL(req.url);
    const tenant = await resolveCachedTenant(searchParams.get("businessId"));
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }
    const business = tenant.business;

    const existing = await prisma.appointment.findFirst({
      where: { id: appointmentId, businessId: business.id },
    });
    if (!existing) {
      return NextResponse.json({ error: { message: "Appointment not found" } }, { status: 404 });
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
    });

    return NextResponse.json({ status: "success", appointment: serialize(updated) });
  } catch (error: any) {
    console.error("[Appointments DELETE] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to cancel appointment" } },
      { status: 500 }
    );
  }
}
