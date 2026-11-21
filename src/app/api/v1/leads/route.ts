import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { merchantNotifier } from "@/lib/notifications/notifier";
import { rateLimiter } from "@/lib/security/rateLimiter";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

export interface LeadItem {
  id: string;
  businessId: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: "new" | "contacted" | "qualified" | "converted";
  source: string;
  createdAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const tenant = await resolveCachedTenant(businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Unauthorized or business tenant not found." } },
        { status: 401 }
      );
    }

    const currentBizId = tenant.business.id;

    const dbLeads = await prisma.lead.findMany({
      where: { businessId: currentBizId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formatted: LeadItem[] = dbLeads.map((l) => ({
      id: l.id,
      businessId: l.businessId,
      name: l.name || "Anonymous Shopper",
      email: l.email || "",
      phone: l.phone || undefined,
      notes: l.notes || undefined,
      status: (l.status as LeadItem["status"]) || "new",
      source: l.source || "chat_widget",
      createdAt: l.createdAt.toISOString(),
    }));

    return NextResponse.json({
      status: "success",
      total: formatted.length,
      leads: formatted,
      source: "database",
    });
  } catch (error: any) {
    console.error("[Leads GET API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to retrieve leads." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = await rateLimiter.limitLead(clientIp);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many lead submissions. Please try again shortly.",
          },
        },
        { status: 429, headers: rateLimiter.formatHeaders(rateLimit) }
      );
    }

    const body = await req.json();
    const { name, email, phone, notes, source } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid email address is required.",
          },
        },
        { status: 400 }
      );
    }

    const businessIdParam = body.business_id || body.businessId;
    if (!businessIdParam) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid 'business_id' is required.",
          },
        },
        { status: 400 }
      );
    }

    // Resolve tenant business
    const business = await prisma.business.findFirst({
      where: {
        OR: [{ id: businessIdParam }, { slug: businessIdParam }],
      },
    });

    if (!business) {
      return NextResponse.json(
        {
          error: {
            code: "BUSINESS_NOT_FOUND",
            message: "Store or business tenant not found.",
          },
        },
        { status: 404 }
      );
    }

    const cleanedEmail = email.trim().toLowerCase();
    const leadName = name?.trim() || "Anonymous Shopper";
    const leadPhone = phone?.trim() || null;
    const leadNotes = notes?.trim() || "Submitted via Shopper Widget callback form";
    const leadSource = source?.trim() || "chat_widget";

    const created = await prisma.lead.create({
      data: {
        businessId: business.id,
        name: leadName,
        email: cleanedEmail,
        phone: leadPhone,
        notes: leadNotes,
        source: leadSource,
        status: "new",
      },
    });

    const newLead: LeadItem = {
      id: created.id,
      businessId: created.businessId,
      name: created.name || leadName,
      email: created.email || cleanedEmail,
      phone: created.phone || undefined,
      notes: created.notes || undefined,
      status: "new",
      source: created.source || leadSource,
      createdAt: created.createdAt.toISOString(),
    };

    // Instant merchant notification via BYO-Key integrations (Slack, Discord, HubSpot, Email)
    void merchantNotifier.notifyLeadCaptured(newLead, { name: business.name, email: business.email });

    return NextResponse.json(
      {
        status: "success",
        lead: newLead,
        source: "database",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Leads POST API] Error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to create lead.",
        },
      },
      { status: 500 }
    );
  }
}
