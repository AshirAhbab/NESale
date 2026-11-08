import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const tenant = await resolveCachedTenant(businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ status: "success", services: [] });
    }

    const currentBiz = tenant.business;
    const currentBizId = currentBiz.id;

    let services = await prisma.service.findMany({
      where: { businessId: currentBizId },
      orderBy: { createdAt: "desc" },
    });

    if (services.length === 0) {
      // Auto-seed initial sample services tailored to this business
      const defaultServices = await prisma.$transaction([
        prisma.service.create({
          data: {
            businessId: currentBizId,
            name: `${currentBiz.name} Priority Consultation`,
            category: "Consultation",
            priceMin: 0.0,
            durationMinutes: 30,
            bookingUrl: `https://cal.com/${currentBiz.slug}/consultation`,
            status: "active",
          },
        }),
        prisma.service.create({
          data: {
            businessId: currentBizId,
            name: `${currentBiz.name} Technical Setup & Support`,
            category: "Maintenance",
            priceMin: 65.0,
            durationMinutes: 60,
            bookingUrl: `https://cal.com/${currentBiz.slug}/setup`,
            status: "active",
          },
        }),
      ]);
      services = defaultServices;
    }

    return NextResponse.json({
      status: "success",
      total: services.length,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category || "General",
        priceMin: s.priceMin ? Number(s.priceMin) : 0,
        durationMinutes: s.durationMinutes || 30,
        bookingUrl: s.bookingUrl || "",
        status: s.status,
      })),
    });
  } catch (error: any) {
    console.error("[Services GET API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch services" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, name, category, priceMin, durationMinutes, bookingUrl } = body;

    const tenant = await resolveCachedTenant(businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }
    const currentBiz = tenant.business;

    const newService = await prisma.service.create({
      data: {
        businessId: currentBiz.id,
        name: name || "Custom Consultation",
        category: category || "Consultation",
        priceMin: priceMin ? parseFloat(priceMin) : 0,
        durationMinutes: durationMinutes ? parseInt(durationMinutes, 10) : 30,
        bookingUrl: bookingUrl || "",
        status: "active",
      },
    });

    return NextResponse.json({
      status: "success",
      service: {
        id: newService.id,
        name: newService.name,
        category: newService.category,
        priceMin: Number(newService.priceMin),
        durationMinutes: newService.durationMinutes,
        bookingUrl: newService.bookingUrl,
        status: newService.status,
      },
    });
  } catch (error: any) {
    console.error("[Services POST API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to create service" } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const businessId = searchParams.get("businessId");

    if (!id) {
      return NextResponse.json({ error: { message: "Service ID is required" } }, { status: 400 });
    }

    const tenant = await resolveCachedTenant(businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }
    const currentBiz = tenant.business;

    await prisma.service.delete({
      where: { id, businessId: currentBiz.id },
    });

    return NextResponse.json({ status: "success", message: "Service deleted" });
  } catch (error: any) {
    console.error("[Services DELETE API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to delete service" } },
      { status: 500 }
    );
  }
}
