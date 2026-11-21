import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { PlanCode, getPlanConfig } from "@/lib/billing/entitlements";
import { createStripeCheckoutSession } from "@/lib/billing/stripe";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planCode, businessId } = body;

    if (!planCode || !["free", "starter", "growth", "pro"].includes(planCode)) {
      return NextResponse.json(
        { error: { message: "A valid planCode ('free', 'starter', 'growth', 'pro') is required." } },
        { status: 400 }
      );
    }

    const tenant = await resolveCachedTenant(businessId);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Unauthorized or business tenant not found." } },
        { status: 401 }
      );
    }

    const currentBizId = tenant.business.id;
    const userEmail = tenant.user.email;
    const plan = getPlanConfig(planCode as PlanCode);

    // Free plan: downgrade directly
    if (planCode === "free") {
      await prisma.subscription.upsert({
        where: { id: `sub_${currentBizId}` },
        update: {
          planCode: "free",
          status: "active",
          updatedAt: new Date(),
        },
        create: {
          id: `sub_${currentBizId}`,
          businessId: currentBizId,
          planCode: "free",
          status: "active",
        },
      });

      return NextResponse.json({
        status: "success",
        url: "/dashboard/billing?status=downgraded",
      });
    }

    // Paid plans: Check for Stripe API Key
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const hasStripeSecret = !!process.env.STRIPE_SECRET_KEY;

    if (hasStripeSecret) {
      const session = await createStripeCheckoutSession({
        businessId: currentBizId,
        userEmail,
        planCode: planCode as PlanCode,
        appUrl,
      });

      return NextResponse.json({
        status: "success",
        url: session.url,
      });
    }

    // Local / Dev Mode Activation (Safe fallback when testing without live Stripe API keys)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
      where: { id: `sub_${currentBizId}` },
      update: {
        planCode: plan.code,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        updatedAt: now,
      },
      create: {
        id: `sub_${currentBizId}`,
        businessId: currentBizId,
        planCode: plan.code,
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    });

    return NextResponse.json({
      status: "success",
      url: `/dashboard/billing?status=activated&plan=${plan.code}`,
      notice: "Plan activated in development mode (Stripe API key not configured).",
    });
  } catch (error: any) {
    console.error("[Billing Checkout POST API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to initiate plan checkout." } },
      { status: 500 }
    );
  }
}
