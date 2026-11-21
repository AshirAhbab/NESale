import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";

export interface ResolvedTenant {
  business: any;
  user: {
    id: string;
    name: string;
    email: string;
    initials: string;
    role?: string;
  };
}

// Use globalThis to survive Next.js dev mode hot-reloads
const tenantGlobalKey = "__tenant_cache_store__" as const;
const tenantCache: Map<string, { data: ResolvedTenant; expiresAt: number }> =
  (globalThis as any)[tenantGlobalKey] ?? ((globalThis as any)[tenantGlobalKey] = new Map());
const TENANT_CACHE_TTL_MS = 30 * 1000; // 30 seconds memoization

export async function resolveCachedTenant(
  firstArg?: any,
  secondArg?: string | null
): Promise<ResolvedTenant | null> {
  // Polymorphic argument parsing: supports (req, requestedBizId), (requestedBizId), or ()
  let requestedBizId: string | null = null;
  if (typeof firstArg === "string") {
    requestedBizId = firstArg;
  } else if (firstArg && typeof firstArg === "object" && "url" in firstArg) {
    requestedBizId = typeof secondArg === "string" ? secondArg : null;
  } else if (typeof secondArg === "string") {
    requestedBizId = secondArg;
  }

  const now = Date.now();

  let authUser: any = null;
  let userEmail = "";
  let userName = "Merchant";
  let userId = "";
  let userRole = "member";

  // 1. Resolve Authenticated User from Supabase Session
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authUser = user;

    if (authUser) {
      userEmail = authUser.email || "";
      userId = authUser.id;
      if (authUser.user_metadata?.full_name) {
        userName = authUser.user_metadata.full_name;
      } else if (authUser.email) {
        const namePart = authUser.email.split("@")[0];
        userName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      }
    }
  } catch {
    // Auth client unavailable or non-browser execution
  }

  // 2. Check User-Scoped Cache
  const cacheKey = userId
    ? `user:${userId}:${requestedBizId || "primary"}`
    : requestedBizId
    ? `biz:${requestedBizId}`
    : null;

  if (cacheKey) {
    const cached = tenantCache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }
  }

  let currentBiz: any = null;

  // 3. Resolve Business based on User Membership (Strict Tenant Isolation)
  if (authUser?.email) {
    const dbUser = await prisma.user.findFirst({
      where: { email: authUser.email.toLowerCase() },
      include: {
        memberships: {
          include: { business: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (dbUser && dbUser.memberships.length > 0) {
      if (dbUser.name && dbUser.name !== "Merchant") {
        userName = dbUser.name;
      }

      if (requestedBizId) {
        // Enforce that user belongs to the requested business
        const match = dbUser.memberships.find((m) => m.businessId === requestedBizId);
        if (match && match.business) {
          currentBiz = match.business;
          userRole = match.role;
        } else {
          // Security: User requested a business they DO NOT belong to.
          // Deny access rather than leaking another tenant.
          return null;
        }
      } else {
        // Default to user's first/primary business
        currentBiz = dbUser.memberships[0].business;
        userRole = dbUser.memberships[0].role;
      }
    }
  }

  // 4. Safe Non-Production Fallbacks (Dev / Testing Only)
  if (!currentBiz && process.env.NODE_ENV !== "production") {
    if (requestedBizId) {
      currentBiz = await prisma.business.findUnique({ where: { id: requestedBizId } });
    }

    if (!currentBiz) {
      currentBiz = await prisma.business.findFirst({ orderBy: { createdAt: "desc" } });
    }

    if (!currentBiz) {
      await ensureSeedData();
      currentBiz = await prisma.business.findFirst();
    }
  }

  if (!currentBiz) {
    return null;
  }

  // 5. Populate user details from business owner if unauthenticated in dev
  if (!userId) {
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
        userId = ownerMember.user.id;
        userRole = ownerMember.role;
      }
    } catch {}
  }

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
      id: userId || currentBiz.id,
      name: userName,
      email: userEmail,
      initials,
      role: userRole,
    },
  };

  // 6. Cache memoized result with isolated key
  if (cacheKey) {
    tenantCache.set(cacheKey, { data: result, expiresAt: now + TENANT_CACHE_TTL_MS });
  }

  return result;
}

export function invalidateTenantCache(businessId?: string, userId?: string): void {
  if (userId) {
    for (const key of tenantCache.keys()) {
      if (key.startsWith(`user:${userId}:`)) {
        tenantCache.delete(key);
      }
    }
  }
  if (businessId) {
    for (const key of tenantCache.keys()) {
      if (key.includes(businessId)) {
        tenantCache.delete(key);
      }
    }
  }
}
