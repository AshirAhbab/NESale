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

/**
 * GET /api/v1/dashboard/teams/[teamId]/website
 * Get the website(s) assigned to a team.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    const rateLimitKey = `teams:website:get:${requestedBizId || "default"}`;
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

    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    assertTeamAccess(teamCtx, "team_member");

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

    const assignments = await prisma.teamWebsiteAssignment.findMany({
      where: { teamId },
      include: { integration: true },
    });

    return NextResponse.json({
      status: "success",
      teamId,
      assignments: assignments.map((a) => ({
        id: a.id,
        integrationId: a.integrationId,
        isPrimary: a.isPrimary,
        assignedAt: a.assignedAt,
        assignedBy: a.assignedBy,
        integration: {
          id: a.integration.id,
          provider: a.integration.provider,
          status: a.integration.status,
          externalAccountId: a.integration.externalAccountId,
          metadata: a.integration.metadata || {},
        },
      })),
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Website Get] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to fetch team website assignments" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/dashboard/teams/[teamId]/website
 * Assign a website (integration) to a team.
 * Requires team_admin with manage_settings or business owner/admin.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const body = await req.json();
  const { integrationId, isPrimary = false, businessId: requestedBizId } = body;

  if (!integrationId || typeof integrationId !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "integrationId is required" } },
      { status: 400 }
    );
  }

  try {
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

    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Need manage_settings on website feature
    const perms = await getEffectivePermissions(userId, businessId, teamId);
    const canManageWebsite =
      perms?.features?.website?.includes("manage_settings") ?? false;
    if (!canManageWebsite && teamCtx.teamRole !== "team_admin") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage website assignments.",
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

    // Verify integration exists and belongs to same business
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, businessId },
    });
    if (!integration) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Integration not found or does not belong to this business." } },
        { status: 404 }
      );
    }

    // Check if already assigned
    const existing = await prisma.teamWebsiteAssignment.findFirst({
      where: { teamId, integrationId },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "Website is already assigned to this team." } },
        { status: 409 }
      );
    }

    // If setting as primary, unset other primary assignments for this team
    if (isPrimary) {
      await prisma.teamWebsiteAssignment.updateMany({
        where: { teamId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const assignment = await prisma.teamWebsiteAssignment.create({
      data: {
        teamId,
        integrationId,
        businessId,
        isPrimary,
        assignedBy: userId,
      },
      include: { integration: true },
    });

    // Denormalize teamId onto integration for quick lookups
    await prisma.integration.update({
      where: { id: integrationId },
      data: { teamId },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      assignment: {
        id: assignment.id,
        teamId: assignment.teamId,
        integrationId: assignment.integrationId,
        isPrimary: assignment.isPrimary,
        assignedAt: assignment.assignedAt,
        integration: {
          id: assignment.integration.id,
          provider: assignment.integration.provider,
          status: assignment.integration.status,
          externalAccountId: assignment.integration.externalAccountId,
          metadata: assignment.integration.metadata || {},
        },
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Website Assign] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to assign website to team" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/dashboard/teams/[teamId]/website
 * Unassign a website from a team.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const integrationId = searchParams.get("integrationId");
  const requestedBizId = searchParams.get("businessId");

  if (!integrationId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "integrationId is required" } },
      { status: 400 }
    );
  }

  try {
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

    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Need manage_settings on website feature
    const perms = await getEffectivePermissions(userId, businessId, teamId);
    const canManageWebsite =
      perms?.features?.website?.includes("manage_settings") ?? false;
    if (!canManageWebsite && teamCtx.teamRole !== "team_admin") {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "You do not have permission to manage website assignments.",
          },
        },
        { status: 403 }
      );
    }

    // Verify assignment exists
    const assignment = await prisma.teamWebsiteAssignment.findFirst({
      where: { teamId, integrationId },
    });
    if (!assignment) {
      return NextResponse.json(
        { error: { message: "Website assignment not found." } },
        { status: 404 }
      );
    }

    await prisma.teamWebsiteAssignment.delete({
      where: { id: assignment.id },
    });

    // Clear denormalized teamId on integration if it points to this team
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });
    if (integration?.teamId === teamId) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { teamId: null },
      });
    }

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      teamId,
      integrationId,
      message: "Website unassigned from team.",
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Website Unassign] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to unassign website from team" } },
      { status: 500 }
    );
  }
}
