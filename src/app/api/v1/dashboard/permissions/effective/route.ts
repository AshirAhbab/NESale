import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import { resolveTeamContext, assertTeamAccess, getEffectivePermissions } from "@/lib/auth/team-auth";

const PERM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const PERM_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/permissions/effective
 * Get the current user's effective permissions across all their teams
 * within a business. Used by the dashboard to adapt UI navigation.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

    const rateLimitKey = `permissions:effective:${requestedBizId || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      PERM_RATE_LIMIT_WINDOW_MS,
      PERM_RATE_LIMIT_MAX
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again shortly.",
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
      );
    }

    const tenant = await resolveCachedTenant(requestedBizId ?? undefined);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const businessId = tenant.business.id;
    const userId = tenant.user.id;

    if (requestedBizId && tenant.business.id !== requestedBizId) {
      return NextResponse.json(
        { error: { message: "Access denied." } },
        { status: 403 }
      );
    }

    // Get user's teams
    const teams = await prisma.teamMember.findMany({
      where: { userId, businessId, isActive: true },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
          },
        },
      },
    });

    const teamPermissions = await Promise.all(
      teams.map(async (m) => {
        if (!m.team.isActive) return null;
        const perms = await getEffectivePermissions(userId, businessId, m.team.id);
        return {
          teamId: m.team.id,
          teamName: m.team.name,
          teamType: m.team.type,
          role: m.role,
          features: perms?.features ?? {},
        };
      })
    );

    // Compute merged permissions across all teams (union of actions per feature)
    const merged: Record<string, Set<string>> = {};
    for (const tp of teamPermissions) {
      if (!tp) continue;
      for (const [feature, actions] of Object.entries(tp.features)) {
        if (!merged[feature]) merged[feature] = new Set();
        for (const action of actions) {
          merged[feature].add(action);
        }
      }
    }

    const mergedPermissions: Record<string, string[]> = {};
    for (const [feature, actions] of Object.entries(merged)) {
      mergedPermissions[feature] = Array.from(actions);
    }

    // Also include org-level role
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });

    return NextResponse.json({
      status: "success",
      businessId,
      userId,
      orgRole: membership?.role ?? null,
      teams: teamPermissions.filter(Boolean),
      effectivePermissions: mergedPermissions,
    });
  } catch (error: unknown) {
    console.error("[Effective Permissions] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch effective permissions" } },
      { status: 500 }
    );
  }
}
