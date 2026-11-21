import { describe, it, expect, vi } from "vitest";
import { getPlanConfig, PLANS, getBusinessPlan } from "./entitlements";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    subscription: {
      findFirst: vi.fn(),
    },
    integration: {
      findMany: vi.fn(),
    },
  },
}));

describe("Billing Entitlements & Plan Matrix", () => {
  it("resolves exact plan configurations", () => {
    expect(getPlanConfig("free")).toEqual(PLANS.free);
    expect(getPlanConfig("starter").maxConversations).toBe(1000);
    expect(getPlanConfig("starter").maxIntegrationSlots).toBe(2);
    expect(getPlanConfig("growth").maxConversations).toBe(2500);
    expect(getPlanConfig("growth").maxIntegrationSlots).toBe(4);
    expect(getPlanConfig("pro").maxConversations).toBe("unlimited");
    expect(getPlanConfig("pro").maxIntegrationSlots).toBe(999);
  });

  it("falls back to free plan when unrecognized code is supplied", () => {
    expect(getPlanConfig("unknown_code")).toEqual(PLANS.free);
    expect(getPlanConfig(null)).toEqual(PLANS.free);
  });

  it("fetches active subscription for business from database", async () => {
    (prisma.subscription.findFirst as any).mockResolvedValueOnce({
      planCode: "growth",
      status: "active",
    });

    const plan = await getBusinessPlan("biz_test_123");
    expect(plan.code).toBe("growth");
    expect(plan.priceFormatted).toBe("$39");
    expect(plan.maxIntegrationSlots).toBe(4);
  });
});
