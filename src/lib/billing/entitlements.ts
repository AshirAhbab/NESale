import { prisma } from "@/lib/db/prisma";

export type PlanCode = "free" | "starter" | "growth" | "pro";

export interface PlanConfig {
  code: PlanCode;
  name: string;
  priceFormatted: string;
  periodText: string;
  description: string;
  maxConversations: number | "unlimited";
  maxIntegrationSlots: number; // 1 (Free), 2 (Starter), 4 (Growth), 999 (Pro)
  maxWebsites: number; // 1 (Free), 1 (Starter), 3 (Growth), 999 (Pro)
  maxKnowledgeChunks: number;
  hasShopifyOAuth: boolean;
  hasWhatsAppRouting: boolean;
  hasHumanHandoff: boolean;
  isPopular?: boolean;
}

export const PLANS: Record<PlanCode, PlanConfig> = {
  free: {
    code: "free",
    name: "Free",
    priceFormatted: "$0",
    periodText: "/mo",
    description: "Perfect for testing NESale on your personal site or small catalog.",
    maxConversations: 50,
    maxIntegrationSlots: 1, // 1 Webhook
    maxWebsites: 1,
    maxKnowledgeChunks: 50,
    hasShopifyOAuth: false,
    hasWhatsAppRouting: false,
    hasHumanHandoff: false,
  },
  starter: {
    code: "starter",
    name: "Starter",
    priceFormatted: "$19",
    periodText: "/mo",
    description: "For growing boutique stores and local shop websites.",
    maxConversations: 1000,
    maxIntegrationSlots: 2, // Choose any 1-2 integrations from catalog
    maxWebsites: 1,
    maxKnowledgeChunks: 250,
    hasShopifyOAuth: false,
    hasWhatsAppRouting: false,
    hasHumanHandoff: false,
  },
  growth: {
    code: "growth",
    name: "Growth",
    priceFormatted: "$39",
    periodText: "/mo",
    description: "Deep Shopify integration & fast conversions.",
    maxConversations: 2500,
    maxIntegrationSlots: 4, // Choose any 3-4 integrations from catalog
    maxWebsites: 3,
    maxKnowledgeChunks: 1000,
    hasShopifyOAuth: true,
    hasWhatsAppRouting: false,
    hasHumanHandoff: false,
    isPopular: true,
  },
  pro: {
    code: "pro",
    name: "Pro",
    priceFormatted: "Pay As You Go",
    periodText: "",
    description: "For high-traffic stores and multi-location merchant teams.",
    maxConversations: "unlimited",
    maxIntegrationSlots: 999, // All integrations unlocked
    maxWebsites: 999,
    maxKnowledgeChunks: 999999,
    hasShopifyOAuth: true,
    hasWhatsAppRouting: true,
    hasHumanHandoff: true,
  },
};

/**
 * Returns configuration for a plan code with safe fallback to Free tier.
 */
export function getPlanConfig(planCode?: string | null): PlanConfig {
  const normalized = (planCode || "free").toLowerCase() as PlanCode;
  return PLANS[normalized] || PLANS.free;
}

/**
 * Resolves the active subscription plan for a business tenant.
 */
export async function getBusinessPlan(businessId: string): Promise<PlanConfig> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        businessId,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
    });

    return getPlanConfig(subscription?.planCode);
  } catch {
    return PLANS.free;
  }
}

/**
 * Computes active integration slot usage vs allowed quota.
 */
export async function getBusinessSlotUsage(businessId: string) {
  const plan = await getBusinessPlan(businessId);

  // Active third-party integrations (excluding standard website domain entries)
  const activeIntegrations = await prisma.integration.findMany({
    where: {
      businessId,
      status: "active",
      provider: { not: "website" },
    },
    select: {
      id: true,
      provider: true,
      status: true,
      metadata: true,
      createdAt: true,
    },
  });

  const usedSlots = activeIntegrations.length;
  const maxSlots = plan.maxIntegrationSlots;
  const canAddSlot = usedSlots < maxSlots;

  return {
    usedSlots,
    maxSlots,
    canAddSlot,
    plan,
    activeIntegrations,
  };
}

/**
 * Checks whether a business is entitled to activate another integration slot.
 */
export async function assertSlotAvailable(businessId: string): Promise<boolean> {
  const { canAddSlot } = await getBusinessSlotUsage(businessId);
  return canAddSlot;
}
