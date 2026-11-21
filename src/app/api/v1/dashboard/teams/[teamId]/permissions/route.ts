import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import {
  resolveTeamContext,
  assertTeamAccess,
  getEffectivePermissions,
  invalidateTeamCache,
} from "@/lib/auth/team-auth";

const TEAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEAM_RATE_LIMIT_MAX = 60;

const VALID_FEATURES = [
  "products",
  "services",
  "appointments",
  "knowledge",
  "conversations",
  "leads",
  "analytics",
  "website",
  "team_management",
];

const VALID_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "manage_settings",
  "manage_members",
  "manage_permissions",
];

/**
 * GET /api/v1/dashboard/teams/[teamId]/permissions
 * Get effective permissions for a team.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    const rateLimitKey = `teams:permissions:get:${requestedBizId || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      TEAM_RATE_LIMIT_WINDOW_MS,
      TEAM_RATE_LIMIT_MAX
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

    const tenant = await resolveCachedTenant(req, requestedBizId ?? undefined);
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

    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    assertTeamAccess(teamCtx, "team_member");

    const permissions = await getEffectivePermissions(userId, businessId, teamId);

    // Also fetch raw DB permissions for editing
    const rawPermissions = await prisma.teamPermission.findMany({
      where: { teamId },
    });

    return NextResponse.json({
      status: "success",
      teamId,
      teamName: permissions?.teamName ?? "",
      teamRole: permissions?.teamRole ?? "team_member",
      effective: permissions?.features ?? {},
      raw: rawPermissions.map((p) => ({
        id: p.id,
        feature: p.feature,
        actions: (p.actions as string[]) || [],
      })),
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Permissions Get] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to fetch team permissions" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/dashboard/teams/[teamId]/permissions
 * Update team feature permissions.
 * Requires team_admin with manage_permissions or business owner/admin.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const body = await req.json();
  const { permissions, businessId: requestedBizId } = body;

  if (!permissions || !Array.isArray(permissions)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "permissions array is required" } },
      { status: 400 }
    );
  }

  // Validate permission structure
  for (const p of permissions) {
    if (!p.feature || !VALID_FEATURES.includes(p.feature)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `Invalid feature: ${p.feature}` } },
        { status: 400 }
      );
    }
    if (!Array.isArray(p.actions)) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: `actions must be an array for ${p.feature}` } },
        { status: 400 }
      );
    }
    for (const action of p.actions) {
      if (!VALID_ACTIONS.includes(action)) {
        return NextResponse.json(
          { error: { code: "VALIDATION_ERROR", message: `Invalid action: ${action}` } },
          { status: 400 }
        );
      }
    }
  }

  try {
    const tenant = await resolveCachedTenant(req, requestedBizId ?? undefined);
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

    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Need manage_permissions to modify permissions
    const perms = await getEffectivePermissions(userId, businessId, teamId);
    const canManagePermissions =
      perms?.features?.team_management?.includes("manage_permissions") ?? false;
    if (!canManagePermissions && teamCtx.teamRole !== "team_admin") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage team permissions.",
          },
        },
        { status: 403 }
      );
    }

    // Verify team exists
    const team = await prisma.team.findFirst({
      where: { id: teamId, businessId },
    });
    if (!team) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Upsert permissions in a transaction
    await prisma.$transaction(
      permissions.map((p) =>
        prisma.teamPermission.upsert({
          where: { teamId_feature: { teamId, feature: p.feature } },
          update: { actions: p.actions },
          create: { teamId, feature: p.feature, actions: p.actions },
        })
      )
    );

    // Remove permissions not in the request (reset to role defaults)
    const existingFeatures = new Set(permissions.map((p) => p.feature));
    const currentPermissions = await prisma.teamPermission.findMany({
      where: { teamId },
    });
    for (const cp of currentPermissions) {
      if (!existingFeatures.has(cp.feature)) {
        await prisma.teamPermission.delete({ where: { id: cp.id } });
      }
    }

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      teamId,
      message: "Team permissions updated successfully.",
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Permissions Update] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to update team permissions" } },
      { status: 500 }
    );
  }
}
