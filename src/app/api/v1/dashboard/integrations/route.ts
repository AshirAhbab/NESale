import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { getBusinessPlan } from "@/lib/billing/entitlements";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/security/encryption";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

    const tenant = await resolveCachedTenant(requestedBizId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found." } }, { status: 404 });
    }

    const business = tenant.business;
    const plan = await getBusinessPlan(business.id);

    // Fetch existing integrations and teams
    const [integrations, teams] = await Promise.all([
      prisma.integration.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.team.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true, type: true },
      }),
    ]);

    // Active slots are third-party tools (excluding raw website domains)
    const activeThirdParty = integrations.filter(
      (item) => item.provider !== "website" && item.status === "active"
    );
    const connectedWebsites = integrations.filter((item) => item.provider === "website");

    const usedSlots = activeThirdParty.length;
    const maxSlots = plan.maxIntegrationSlots;
    const canAddSlot = usedSlots < maxSlots;

    const formatted = integrations.map((item) => {
      const meta = (item.metadata as Record<string, any>) || {};
      const decrypted = item.accessTokenEncrypted ? decryptSecret(item.accessTokenEncrypted) : "";
      const masked = decrypted ? maskSecret(decrypted) : "";

      return {
        id: item.id,
        businessId: item.businessId,
        teamId: item.teamId || null,
        provider: item.provider,
        status: item.status,
        domain: item.externalAccountId || meta.url || meta.name || item.provider,
        name: meta.name || item.externalAccountId || item.provider,
        url: meta.url || (item.externalAccountId?.startsWith("http") ? item.externalAccountId : null),
        platform: meta.platform || (item.provider === "shopify" ? "shopify" : "custom"),
        isPrimary: meta.isPrimary === true,
        maskedCredential: masked,
        triggers: meta.triggers || {
          leadCaptured: true,
          appointmentBooked: true,
          highIntentQuery: false,
        },
        settings: meta.settings || {},
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
        code: plan.code,
        name: plan.name,
        priceFormatted: plan.priceFormatted,
        maxConversations: plan.maxConversations,
        websiteQuota: plan.maxWebsites,
        websiteCount: connectedWebsites.length,
        canAddWebsite: connectedWebsites.length < plan.maxWebsites,
        integrationSlots: {
          used: usedSlots,
          max: maxSlots >= 900 ? "Unlimited" : maxSlots,
          maxNumeric: maxSlots,
          canAdd: canAddSlot,
        },
      },
      teams,
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
    const {
      businessId: requestedBizId,
      provider = "webhook",
      name,
      url,
      credential,
      teamId,
      platform = "custom",
      isPrimary = false,
      triggers,
      settings = {},
    } = body;

    const tenant = await resolveCachedTenant(requestedBizId);
    if (!tenant || !tenant.business) {
      return NextResponse.json({ error: { message: "No business found." } }, { status: 404 });
    }

    const business = tenant.business;
    const plan = await getBusinessPlan(business.id);

    // 1. Handling Website Domain Connection
    if (provider === "website") {
      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: { message: "A valid website URL is required." } }, { status: 400 });
      }

      let formattedUrl = url.trim();
      if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = `https://${formattedUrl}`;
      let parsedHostname = "";
      try {
        parsedHostname = new URL(formattedUrl).hostname.toLowerCase();
      } catch {
        return NextResponse.json({ error: { message: "Invalid domain." } }, { status: 400 });
      }

      const existingWebsitesCount = await prisma.integration.count({
        where: { businessId: business.id, provider: "website" },
      });

      if (existingWebsitesCount >= plan.maxWebsites) {
        return NextResponse.json(
          {
            error: {
              code: "PLAN_QUOTA_EXCEEDED",
              message: `Your current ${plan.name} plan allows up to ${plan.maxWebsites} connected website(s). Please upgrade to add more storefronts.`,
            },
          },
          { status: 403 }
        );
      }

      const makePrimary = Boolean(isPrimary || !business.websiteUrl || existingWebsitesCount === 0);
      const integration = await prisma.integration.create({
        data: {
          businessId: business.id,
          teamId: teamId || null,
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

      return NextResponse.json({ status: "success", integration }, { status: 201 });
    }

    // 2. Handling Third-Party Integrations (Slack, Gmail, Google Calendar, HubSpot, etc.)
    const activeThirdPartyCount = await prisma.integration.count({
      where: {
        businessId: business.id,
        status: "active",
        provider: { not: "website" },
      },
    });

    if (activeThirdPartyCount >= plan.maxIntegrationSlots) {
      return NextResponse.json(
        {
          error: {
            code: "PLAN_SLOT_LIMIT_REACHED",
            message: `You have reached your limit of ${plan.maxIntegrationSlots} active integration slot(s) on the ${plan.name} plan. Upgrade to Growth ($39/mo) for 4 slots, or Pro for unlimited integrations.`,
          },
        },
        { status: 403 }
      );
    }

    // Encrypt sensitive credential before database persistence
    const encryptedToken = credential ? encryptSecret(String(credential).trim()) : null;

    const integration = await prisma.integration.create({
      data: {
        businessId: business.id,
        teamId: teamId || null,
        provider,
        status: "active",
        externalAccountId: name || provider,
        accessTokenEncrypted: encryptedToken,
        metadata: {
          name: name || `${provider.toUpperCase()} Integration`,
          triggers: triggers || {
            leadCaptured: true,
            appointmentBooked: true,
            highIntentQuery: false,
          },
          settings,
          installedAt: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json(
      {
        status: "success",
        integration: {
          id: integration.id,
          provider: integration.provider,
          name: name || provider,
          status: integration.status,
          maskedCredential: credential ? maskSecret(credential) : "",
          createdAt: integration.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Dashboard Integrations POST] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to save integration." } },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, credential, triggers, settings, teamId, isPrimary } = body;

    if (!id) {
      return NextResponse.json({ error: { message: "Integration ID is required." } }, { status: 400 });
    }

    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: "Integration not found." } }, { status: 404 });
    }

    const currentMeta = (existing.metadata as Record<string, any>) || {};
    const updatedMeta = { ...currentMeta };

    if (triggers !== undefined) updatedMeta.triggers = triggers;
    if (settings !== undefined) updatedMeta.settings = settings;

    let encryptedToken = existing.accessTokenEncrypted;
    if (credential) {
      encryptedToken = encryptSecret(String(credential).trim());
    }

    if (isPrimary !== undefined && existing.provider === "website") {
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
        teamId: teamId !== undefined ? teamId : existing.teamId,
        accessTokenEncrypted: encryptedToken,
        metadata: updatedMeta,
      },
    });

    return NextResponse.json({
      status: "success",
      integration: {
        id: updated.id,
        status: updated.status,
        teamId: updated.teamId,
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

    const existing = await prisma.integration.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: { message: "Integration not found." } }, { status: 404 });
    }

    await prisma.integration.delete({ where: { id } });

    return NextResponse.json({
      status: "success",
      message: "Integration removed successfully. Slot freed up.",
    });
  } catch (error: any) {
    console.error("[Dashboard Integrations DELETE] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to delete integration." } },
      { status: 500 }
    );
  }
}
