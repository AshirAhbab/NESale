import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { getBusinessPlan, getBusinessSlotUsage } from "@/lib/billing/entitlements";

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

    // 1. Fetch active subscription record
    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId: currentBizId,
        status: { in: ["active", "trialing", "past_due"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const planCode = subscription?.planCode || "free";
    const planConfig = await getBusinessPlan(currentBizId);
    const slotUsage = await getBusinessSlotUsage(currentBizId);

    // 2. Count conversations in current 30-day billing cycle
    const now = new Date();
    const cycleStart = subscription?.currentPeriodStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const conversationsCount = await prisma.conversation.count({
      where: {
        businessId: currentBizId,
        startedAt: { gte: cycleStart },
      },
    });

    // 3. Count connected websites
    const websitesCount = await prisma.integration.count({
      where: {
        businessId: currentBizId,
        provider: "website",
        status: "active",
      },
    });

    return NextResponse.json({
      status: "success",
      businessId: currentBizId,
      subscription: {
        id: subscription?.id || null,
        planCode,
        status: subscription?.status || "active",
        currentPeriodStart: subscription?.currentPeriodStart?.toISOString() || cycleStart.toISOString(),
        currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() || null,
      },
      plan: planConfig,
      usage: {
        conversations: {
          used: conversationsCount,
          max: planConfig.maxConversations,
          pct: planConfig.maxConversations === "unlimited"
            ? 0
            : Math.min(100, Math.round((conversationsCount / planConfig.maxConversations) * 100)),
        },
        slots: {
          used: slotUsage.usedSlots,
          max: slotUsage.maxSlots,
          canAdd: slotUsage.canAddSlot,
        },
        websites: {
          used: websitesCount,
          max: planConfig.maxWebsites,
        },
      },
      invoices: [], // Honest empty invoice list until Stripe webhook registers paid invoices
    });
  } catch (error: any) {
    console.error("[Subscription GET API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to retrieve subscription." } },
      { status: 500 }
    );
  }
}
