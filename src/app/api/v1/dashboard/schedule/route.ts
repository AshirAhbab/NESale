import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { loadBookingContext } from "@/lib/booking/data";
import { isValidTimeString, timeToMinutes } from "@/lib/booking/availability";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenant = await resolveCachedTenant(req, searchParams.get("businessId"));
    if (!tenant || !tenant.business) {
      return NextResponse.json({ status: "success", timezone: "UTC", schedules: [], staff: [] });
    }
    const business = tenant.business;

    const context = await loadBookingContext(business.id);
    const [staff, schedules] = await Promise.all([
      prisma.staff.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true, role: true },
      }),
      prisma.staffSchedule.findMany({
        where: { businessId: business.id },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      }),
    ]);

    return NextResponse.json({
      status: "success",
      timezone: context?.timezone || "UTC",
      schedules: schedules.map((s) => ({
        id: s.id,
        staffId: s.staffId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      })),
      staff,
    });
  } catch (error: any) {
    console.error("[Schedule GET] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch schedule" } },
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

    const entries = Array.isArray(body.entries) ? body.entries : Array.isArray(body.schedules) ? body.schedules : null;
    if (!entries) {
      return NextResponse.json(
        { error: { message: "entries[] is required" } },
        { status: 400 }
      );
    }

    const staffId = body.staffId || null;
    if (staffId) {
      const staff = await prisma.staff.findFirst({ where: { id: staffId, businessId: business.id } });
      if (!staff) {
        return NextResponse.json({ error: { message: "Staff member not found" } }, { status: 404 });
      }
    }

    const normalized: { dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }[] = [];
    for (const raw of entries) {
      const dayOfWeek = Number(raw.dayOfWeek);
      const startTime = String(raw.startTime || "");
      const endTime = String(raw.endTime || "");
      if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        return NextResponse.json({ error: { message: "dayOfWeek must be 0-6" } }, { status: 400 });
      }
      if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
        return NextResponse.json({ error: { message: "Times must use HH:MM format" } }, { status: 400 });
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        return NextResponse.json({ error: { message: "End time must be after start time" } }, { status: 400 });
      }
      normalized.push({ dayOfWeek, startTime, endTime, isActive: raw.isActive !== false });
    }

    await prisma.$transaction([
      prisma.staffSchedule.deleteMany({ where: { businessId: business.id, staffId } }),
      ...(normalized.length
        ? [
            prisma.staffSchedule.createMany({
              data: normalized.map((entry) => ({ ...entry, businessId: business.id, staffId })),
            }),
          ]
        : []),
    ]);

    const schedules = await prisma.staffSchedule.findMany({
      where: { businessId: business.id, staffId },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({
      status: "success",
      schedules: schedules.map((s) => ({
        id: s.id,
        staffId: s.staffId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isActive: s.isActive,
      })),
    });
  } catch (error: any) {
    console.error("[Schedule POST] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to save schedule" } },
      { status: 500 }
    );
  }
}
