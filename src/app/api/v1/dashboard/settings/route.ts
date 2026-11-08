import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createClient } from "@/utils/supabase/server";
import { normalizeBusinessType, normalizeServiceSubtype } from "@/lib/business/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let business: any = null;

    // 1. Resolve business from authenticated Supabase user session
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.email) {
        const dbUser = await prisma.user.findFirst({
          where: { email: authUser.email.toLowerCase() },
          include: {
            memberships: {
              include: {
                business: {
                  include: { businessSettings: true, members: { include: { user: true } } },
                },
              },
              take: 1,
            },
          },
        });

        if (dbUser?.memberships?.[0]?.business) {
          business = dbUser.memberships[0].business;
        }
      }
    } catch (authErr) {
      console.warn("[Settings API] Auth notice:", authErr);
    }

    // 2. Fallback to requested businessId
    if (!business && businessId) {
      business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { businessSettings: true, members: { include: { user: true } } },
      });
    }

    // 3. Fallback to most recently updated or created business
    if (!business) {
      business = await prisma.business.findFirst({
        orderBy: { updatedAt: "desc" },
        include: { businessSettings: true, members: { include: { user: true } } },
      });
    }

    if (!business) {
      // Auto-provision default store if empty
      business = await prisma.business.create({
        data: {
          name: "Nordik Gear Co.",
          slug: "nordik-gear-" + Date.now().toString(36),
          businessType: "ecommerce",
          websiteUrl: "https://nordikgear.com",
          email: "merchant@nordikgear.com",
          currency: "USD",
          timezone: "UTC",
          businessSettings: {
            create: {
              leadCaptureEnabled: true,
              humanHandoffEnabled: true,
              settings: {
                notifications: {
                  salesAlerts: true,
                  unansweredAlerts: true,
                  weeklyReport: true,
                  billingNotifications: true,
                },
                profile: {
                  name: "Alex Mercer",
                  role: "Owner / Store Admin",
                  avatarUrl:
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                },
              },
            },
          },
        },
        include: { businessSettings: true, members: { include: { user: true } } },
      });
    }

    const settingsJson = (business.businessSettings?.settings as Record<string, any>) || {};

    return NextResponse.json({
      status: "success",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        websiteUrl: business.websiteUrl,
        email: business.email,
        phone: business.phone,
        currency: business.currency,
        timezone: business.timezone,
        businessType: business.businessType,
        businessSubtype: business.businessSubtype || null,
      },
      settings: {
        leadCaptureEnabled: business.businessSettings?.leadCaptureEnabled ?? true,
        humanHandoffEnabled: business.businessSettings?.humanHandoffEnabled ?? true,
        bookingUrl: business.businessSettings?.bookingUrl || "",
        notifications: settingsJson.notifications || {
          salesAlerts: true,
          unansweredAlerts: true,
          weeklyReport: true,
          billingNotifications: true,
        },
        profile: {
          name: settingsJson.profile?.name && settingsJson.profile.name !== "Alex Mercer"
            ? settingsJson.profile.name
            : (business.members?.[0]?.user?.name || "Alex Grey"),
          email: business.members?.[0]?.user?.email || business.email || "",
          role: settingsJson.profile?.role || "Owner / Store Admin",
          avatarUrl:
            settingsJson.profile?.avatarUrl ||
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        },
      },
    });
  } catch (error: any) {
    console.error("[Settings GET API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to load settings" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, name, websiteUrl, email, phone, notifications, profile, businessType, businessSubtype, bookingUrl } = body;

    let targetBusinessId = businessId;

    // Resolve target business from authenticated Supabase session if businessId not provided
    if (!targetBusinessId) {
      try {
        const supabase = await createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser?.email) {
          const dbUser = await prisma.user.findFirst({
            where: { email: authUser.email.toLowerCase() },
            include: { memberships: { include: { business: true }, take: 1 } },
          });

          if (dbUser?.memberships?.[0]?.business) {
            targetBusinessId = dbUser.memberships[0].business.id;
          }
        }
      } catch (authErr) {
        console.warn("[Settings POST API] Auth notice:", authErr);
      }
    }

    if (!targetBusinessId) {
      const firstBiz = await prisma.business.findFirst({
        orderBy: { updatedAt: "desc" },
        select: { id: true },
      });
      targetBusinessId = firstBiz?.id;
    }

    if (!targetBusinessId) {
      return NextResponse.json({ error: { message: "No business found" } }, { status: 404 });
    }

    // Update Business details
    const updatedBiz = await prisma.business.update({
      where: { id: targetBusinessId },
      data: {
        ...(name ? { name } : {}),
        ...(websiteUrl ? { websiteUrl } : {}),
        ...(email ? { email } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(businessType ? { businessType: normalizeBusinessType(businessType) } : {}),
        ...(businessSubtype !== undefined
          ? { businessSubtype: normalizeServiceSubtype(businessSubtype) }
          : {}),
      },
    });

    // Update BusinessSettings
    const existingSettings = await prisma.businessSettings.findUnique({
      where: { businessId: targetBusinessId },
    });

    const currentJson = (existingSettings?.settings as Record<string, any>) || {};
    const newJson = {
      ...currentJson,
      ...(notifications ? { notifications } : {}),
      ...(profile ? { profile } : {}),
    };

    const updatedSettings = await prisma.businessSettings.upsert({
      where: { businessId: targetBusinessId },
      create: {
        businessId: targetBusinessId,
        settings: newJson,
        ...(bookingUrl !== undefined ? { bookingUrl: bookingUrl || null } : {}),
      },
      update: {
        settings: newJson,
        ...(bookingUrl !== undefined ? { bookingUrl: bookingUrl || null } : {}),
      },
    });

    return NextResponse.json({
      status: "success",
      business: updatedBiz,
      settings: updatedSettings,
    });
  } catch (error: any) {
    console.error("[Settings POST API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to save settings" } },
      { status: 500 }
    );
  }
}
