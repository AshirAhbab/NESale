import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { merchantNotifier } from "@/lib/notifications/notifier";
import { rateLimiter } from "@/lib/security/rateLimiter";

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

// In-memory fallback store for offline demo/preview
let inMemoryLeads: LeadItem[] = [
  {
    id: "lead_101",
    businessId: "biz_default",
    name: "Marcus Vance",
    email: "marcus.v@gmail.com",
    phone: "+1 (555) 342-9912",
    notes: "Inquired about bulk corporate order for Trailpack 30L (25 units).",
    status: "qualified",
    source: "chat_widget",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "lead_102",
    businessId: "biz_default",
    name: "Elena Rostova",
    email: "elena.rostova@designhub.io",
    notes: "Asked about custom embroidery on Everyday Linen Shirts.",
    status: "new",
    source: "chat_widget",
    createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: "lead_103",
    businessId: "biz_default",
    name: "Liam O'Connor",
    email: "liam.oc@outlook.com",
    phone: "+1 (555) 789-2341",
    notes: "Requested human callback regarding international express shipping.",
    status: "contacted",
    source: "human_handoff",
    createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
];

async function ensureDefaultBusiness(businessId: string) {
  try {
    const existing = await prisma.business.findUnique({
      where: { id: businessId },
    });
    if (existing) return existing;

    const defaultBySlug = await prisma.business.findUnique({
      where: { slug: "default-business" },
    });
    if (defaultBySlug) return defaultBySlug;

    return await prisma.business.create({
      data: {
        id: businessId,
        name: "Nordik Gear Co.",
        slug: "default-business",
        businessType: "ecommerce",
        websiteUrl: "https://nordikgear.example.com",
        description: "Outdoor apparel and gear for adventurers",
      },
    });
  } catch (err) {
    console.warn("[Prisma] Could not verify/upsert business record:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const dbLeads = await prisma.lead.findMany({
      where: businessId ? { businessId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    if (dbLeads.length > 0) {
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
    }
  } catch (error) {
    // If database is not yet connected or seeded, serve fallback demo leads
    console.warn("[Leads API] Database query failed or uninitialized, falling back to memory:", error);
  }

  return NextResponse.json({
    status: "success",
    total: inMemoryLeads.length,
    leads: inMemoryLeads,
    source: "memory_fallback",
  });
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

    if (!email || typeof email !== "string") {
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

    const businessId = body.business_id || "biz_default";
    const cleanedEmail = email.trim().toLowerCase();
    const leadName = name || "Anonymous Shopper";
    const leadPhone = phone?.trim();
    const leadNotes = notes || "Submitted via Shopper Widget callback form";
    const leadSource = source || "chat_widget";

    try {
      const business = await ensureDefaultBusiness(businessId);
      if (business) {
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

        // Fire-and-forget instant merchant notification (webhook / email / whatsapp)
        void merchantNotifier.notifyLeadCaptured(newLead, { name: business.name, email: business.email });

        return NextResponse.json(
          {
            status: "success",
            lead: newLead,
            source: "database",
          },
          { status: 201 }
        );
      }
    } catch (dbErr) {
      console.warn("[Leads API] Database create failed, falling back to memory:", dbErr);
    }

    // In-memory fallback
    const fallbackLead: LeadItem = {
      id: "lead_" + Date.now(),
      businessId,
      name: leadName,
      email: cleanedEmail,
      phone: leadPhone,
      notes: leadNotes,
      status: "new",
      source: leadSource,
      createdAt: new Date().toISOString(),
    };

    inMemoryLeads.unshift(fallbackLead);
    void merchantNotifier.notifyLeadCaptured(fallbackLead);

    return NextResponse.json(
      {
        status: "success",
        lead: fallbackLead,
        source: "memory_fallback",
      },
      { status: 201 }
    );
  } catch (error: any) {
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
