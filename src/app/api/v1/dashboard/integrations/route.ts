import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

// Website limits per subscription tier
const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  starter: 1,
  growth: 3,
  pro: 100, // Effectively unlimited
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

    const tenant = await resolveCachedTenant(requestedBizId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found." } }, { status: 404 });
    }

    const business = tenant.business;

    // Get active subscription or default to 'free'
    const subscription = await prisma.subscription.findFirst({
      where: { businessId: business.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const planCode = subscription?.planCode?.toLowerCase() || "free";
    const quota = PLAN_LIMITS[planCode] ?? 1;

    // Fetch existing integrations
    let integrations = await prisma.integration.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: { createdAt: "desc" },
    });

    // If no integrations exist yet but business has a websiteUrl, auto-seed a primary integration
    if (integrations.length === 0 && business.websiteUrl) {
      try {
        const domain = new URL(
          business.websiteUrl.startsWith("http") ? business.websiteUrl : `https://${business.websiteUrl}`
        ).hostname;

        const seeded = await prisma.integration.create({
          data: {
            businessId: business.id,
            provider: "website",
            status: "active",
            externalAccountId: domain,
            metadata: {
              name: `${business.name} (Primary)`,
              url: business.websiteUrl,
              platform: "custom",
              isPrimary: true,
              installedAt: new Date().toISOString(),
            },
          },
        });
        integrations = [seeded];
      } catch {
        // Ignore seeding errors
      }
    }

    const formatted = integrations.map((item) => {
      const meta = (item.metadata as Record<string, any>) || {};
      const isPrimary = meta.isPrimary === true || item.externalAccountId === business.websiteUrl;
      return {
        id: item.id,
        businessId: item.businessId,
        provider: item.provider,
        status: item.status,
        domain: item.externalAccountId || meta.url || "myshop.com",
        name: meta.name || item.externalAccountId || "Connected Website",
        url: meta.url || (item.externalAccountId ? `https://${item.externalAccountId}` : "https://example.com"),
        platform: meta.platform || (item.provider === "shopify" ? "shopify" : "custom"),
        isPrimary,
        lastSyncAt: item.lastSyncAt ? item.lastSyncAt.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      status: "success",
      business: {
        id: business.id,
        name: business.name,
        slug: business.slug,
        websiteUrl: business.websiteUrl,
      },
      plan: {
        code: planCode,
        name: planCode.charAt(0).toUpperCase() + planCode.slice(1),
        websiteQuota: quota,
        websiteCount: formatted.length,
        canAddWebsite: formatted.length < quota,
      },
      integrations: formatted,
    });
  } catch (error: any) {
    console.error("[Dashboard Integrations GET] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to load integrations." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId: requestedBizId, name, url, platform = "custom", isPrimary = false } = body;

    const tenant = await resolveCachedTenant(requestedBizId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found." } }, { status: 404 });
    }

    const business = tenant.business;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: { message: "A valid website URL is required." } },
        { status: 400 }
      );
    }

    // Format & validate domain
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    let parsedHostname = "";
    try {
      parsedHostname = new URL(formattedUrl).hostname.toLowerCase();
    } catch {
      return NextResponse.json(
        { error: { message: "Please provide a valid domain (e.g. yourstore.com)." } },
        { status: 400 }
      );
    }

    // Check Plan Quota
    const subscription = await prisma.subscription.findFirst({
      where: { businessId: business.id, status: "active" },
      orderBy: { createdAt: "desc" },
    });

    const planCode = subscription?.planCode?.toLowerCase() || "free";
    const quota = PLAN_LIMITS[planCode] ?? 1;

    const currentCount = await prisma.integration.count({
      where: { businessId: business.id },
    });

    if (currentCount >= quota) {
      return NextResponse.json(
        {
          error: {
            code: "PLAN_QUOTA_EXCEEDED",
            message: `Your current ${planCode.toUpperCase()} plan allows a maximum of ${quota} connected website(s). Please upgrade to Growth or Pro to connect additional storefronts.`,
          },
        },
        { status: 403 }
      );
    }

    // If marked as primary, or if business has no websiteUrl yet, set this as primary
    const makePrimary = Boolean(isPrimary || !business.websiteUrl || currentCount === 0);

    const integration = await prisma.integration.create({
      data: {
        businessId: business.id,
        provider: platform === "shopify" ? "shopify" : "website",
        status: "active",
        externalAccountId: parsedHostname,
        metadata: {
          name: name?.trim() || parsedHostname,
          url: formattedUrl,
          platform,
          isPrimary: makePrimary,
          installedAt: new Date().toISOString(),
        },
      },
    });

    if (makePrimary) {
      await prisma.business.update({
        where: { id: business.id },
        data: { websiteUrl: formattedUrl },
      });
    }

    return NextResponse.json(
      {
        status: "success",
        integration: {
          id: integration.id,
          businessId: integration.businessId,
          provider: integration.provider,
          status: integration.status,
          domain: parsedHostname,
          name: name?.trim() || parsedHostname,
          url: formattedUrl,
          platform,
          isPrimary: makePrimary,
          createdAt: integration.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Dashboard Integrations POST] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to connect website integration." } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, isPrimary } = body;

    if (!id) {
      return NextResponse.json({ error: { message: "Integration ID is required." } }, { status: 400 });
    }

    const existing = await prisma.integration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Integration not found." } }, { status: 404 });
    }

    const currentMeta = (existing.metadata as Record<string, any>) || {};
    const updatedMeta = { ...currentMeta };

    if (isPrimary !== undefined) {
      updatedMeta.isPrimary = Boolean(isPrimary);
      if (isPrimary && updatedMeta.url) {
        await prisma.business.update({
          where: { id: existing.businessId },
          data: { websiteUrl: updatedMeta.url },
        });
      }
    }

    const updated = await prisma.integration.update({
      where: { id },
      data: {
        status: status || existing.status,
        metadata: updatedMeta,
      },
    });

    return NextResponse.json({
      status: "success",
      integration: {
        id: updated.id,
        status: updated.status,
        isPrimary: updatedMeta.isPrimary,
      },
    });
  } catch (error: any) {
    console.error("[Dashboard Integrations PATCH] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to update integration." } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: { message: "Integration ID is required." } }, { status: 400 });
    }

    const existing = await prisma.integration.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: { message: "Integration not found." } }, { status: 404 });
    }

    await prisma.integration.delete({
      where: { id },
    });

    return NextResponse.json({
      status: "success",
      message: "Integration disconnected successfully.",
    });
  } catch (error: any) {
    console.error("[Dashboard Integrations DELETE] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to delete integration." } },
      { status: 500 }
    );
  }
}
