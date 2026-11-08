import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";

interface ResolvedTenant {
  business: any;
  user: {
    id: string;
    name: string;
    email: string;
    initials: string;
  };
}

// Use globalThis to survive Next.js dev mode hot-reloads
const tenantGlobalKey = "__tenant_cache_store__" as const;
const tenantCache: Map<string, { data: ResolvedTenant; expiresAt: number }> =
  (globalThis as any)[tenantGlobalKey] ?? ((globalThis as any)[tenantGlobalKey] = new Map());
const TENANT_CACHE_TTL_MS = 60 * 1000; // 60 seconds memoization

export async function resolveCachedTenant(requestedBizId?: string | null): Promise<ResolvedTenant | null> {
  const cacheKey = requestedBizId || "default_tenant";
  const now = Date.now();
  const cached = tenantCache.get(cacheKey);

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  let currentBiz: any = null;
  let userName = "Merchant";
  let userEmail = "";
  let userId = "";

  // 1. Check Supabase Auth User
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      userEmail = authUser.email || "";
      userId = authUser.id;
      if (authUser.user_metadata?.full_name) {
        userName = authUser.user_metadata.full_name;
      } else if (authUser.email) {
        userName = authUser.email.split("@")[0];
        userName = userName.charAt(0).toUpperCase() + userName.slice(1);
      }

      // Try finding user's business membership
      const dbUser = await prisma.user.findFirst({
        where: { email: authUser.email?.toLowerCase() },
        include: {
          memberships: {
            include: { business: true },
            take: 1,
          },
        },
      });

      if (dbUser?.memberships?.[0]?.business) {
        currentBiz = dbUser.memberships[0].business;
        if (dbUser.name && dbUser.name !== "Merchant") {
          userName = dbUser.name;
        }
      }
    }
  } catch (authErr) {
    // Non-blocking fallback
  }

  // 2. Fallback to requested businessId param or latest business
  if (!currentBiz && requestedBizId) {
    currentBiz = await prisma.business.findUnique({ where: { id: requestedBizId } });
  }

  if (!currentBiz) {
    currentBiz = await prisma.business.findFirst({ orderBy: { createdAt: "desc" } });
  }

  if (!currentBiz) {
    await ensureSeedData();
    currentBiz = await prisma.business.findFirst();
  }

  if (!currentBiz) {
    return null;
  }

  // 3. Resolve owner user from membership if not already found
  try {
    const ownerMember = await prisma.businessMember.findFirst({
      where: { businessId: currentBiz.id },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });
    if (ownerMember?.user) {
      if (!userName || userName === "Merchant") {
        userName = ownerMember.user.name || "Merchant";
      }
      if (!userEmail) {
        userEmail = ownerMember.user.email || "";
      }
      if (!userId) {
        userId = ownerMember.user.id;
      }
    }
  } catch {}

  const parts = (userName || "Merchant").trim().split(" ");
  let initials = "ME";
  if (parts.length >= 2 && parts[0] && parts[1]) {
    initials = (parts[0][0] + parts[1][0]).toUpperCase();
  } else if (parts[0]) {
    initials = parts[0].substring(0, 2).toUpperCase();
  }

  const result: ResolvedTenant = {
    business: currentBiz,
    user: {
      id: userId,
      name: userName,
      email: userEmail,
      initials,
    },
  };

  // Cache memoized result
  tenantCache.set(cacheKey, { data: result, expiresAt: now + TENANT_CACHE_TTL_MS });
  if (currentBiz.id !== cacheKey) {
    tenantCache.set(currentBiz.id, { data: result, expiresAt: now + TENANT_CACHE_TTL_MS });
  }

  return result;
}

export function invalidateTenantCache(businessId?: string): void {
  if (businessId) {
    tenantCache.delete(businessId);
  }
  tenantCache.delete("default_tenant");
}
