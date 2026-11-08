import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import {
  resolveTeamContext,
  assertTeamAccess,
  getEffectivePermissions,
  wouldLeaveNoTeamAdmins,
  hasBusinessAdmin,
  invalidateTeamCache,
} from "@/lib/auth/team-auth";

const TEAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEAM_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/teams/[teamId]
 * Get team details with members and permissions.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    // Rate limiting
    const rateLimitKey = `teams:get:${requestedBizId || "default"}`;
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

    // Authorize business context
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

    // Resolve team context (verifies membership)
    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Get team details
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: { select: { members: true, permissions: true, websiteAssignments: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: "asc" },
        },
        permissions: true,
        websiteAssignments: {
          include: { integration: true },
        },
      },
    });

    if (!team || team.businessId !== businessId) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    const permissions = await getEffectivePermissions(userId, businessId, teamId);

    return NextResponse.json({
      status: "success",
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        type: team.type,
        isActive: team.isActive,
        memberCount: team._count.members,
        permissionCount: team._count.permissions,
        websiteCount: team._count.websiteAssignments,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        metadata: team.metadata || {},
      },
      members: team.members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        },
      })),
      permissions: permissions?.features ?? {},
      websiteAssignments: team.websiteAssignments.map((wa) => ({
        id: wa.id,
        teamId: wa.teamId,
        integrationId: wa.integrationId,
        isPrimary: wa.isPrimary,
        assignedAt: wa.assignedAt,
        integration: {
          id: wa.integration.id,
          provider: wa.integration.provider,
          status: wa.integration.status,
          externalAccountId: wa.integration.externalAccountId,
          metadata: wa.integration.metadata || {},
        },
      })),
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Get] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: { message: "Failed to fetch team" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/v1/dashboard/teams/[teamId]
 * Update team information.
 * Requires team_admin or business owner/admin.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await context.params;
  const body = await req.json();
  const { name, description, type, isActive, businessId: requestedBizId } = body;

  if (type !== undefined && !["ecommerce", "services"].includes(String(type))) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Team type must be 'ecommerce' or 'services'." } },
      { status: 400 }
    );
  }

  try {
    // Authorize business context
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

    // Resolve team context - need team_admin to update team info
    const teamCtx = await resolveTeamContext(userId, businessId, teamId);
    if (!teamCtx) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    assertTeamAccess(teamCtx, "team_admin");

    // Verify team exists and belongs to business
    const team = await prisma.team.findFirst({
      where: { id: teamId, businessId },
    });
    if (!team) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Check for duplicate name if changing
    if (name && name !== team.name) {
      const existing = await prisma.team.findFirst({
        where: { businessId, name },
      });
      if (existing) {
        return NextResponse.json(
          { error: { code: "DUPLICATE", message: "A team with this name already exists." } },
          { status: 409 }
        );
      }
    }

    // Prevent deactivating if it would leave no active teams for the business?
    // Teams are just organizational, not required for business operation, so allow deactivation.

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(type !== undefined ? { type } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        metadata: {
          ...(((team.metadata as Record<string, unknown>) || {}) as Record<string, unknown>),
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
        },
      },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      team: {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        type: updated.type,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Update] Error [${requestId}]:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to update team" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/dashboard/teams/[teamId]
 * Deactivate a team (soft delete).
 * Requires business owner or admin.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    // Authorize business context
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

    // Only business owner or admin can deactivate teams
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only business owners and admins can deactivate teams." } },
        { status: 403 }
      );
    }

    // Verify team exists and belongs to business
    const team = await prisma.team.findFirst({
      where: { id: teamId, businessId },
      include: {
        _count: { select: { members: true } },
      },
    });
    if (!team) {
      return NextResponse.json(
        { error: { message: "Team not found or access denied." } },
        { status: 404 }
      );
    }

    // Soft delete: deactivate the team
    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        isActive: false,
        metadata: {
          ...(((team.metadata as Record<string, unknown>) || {}) as Record<string, unknown>),
          deactivatedBy: userId,
          deactivatedAt: new Date().toISOString(),
        },
      },
    });

    // Deactivate all team members
    await prisma.teamMember.updateMany({
      where: { teamId },
      data: { isActive: false },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      team: {
        id: updated.id,
        name: updated.name,
        isActive: updated.isActive,
      },
      businessId,
      message: "Team deactivated. Members retain business-level access.",
    });
  } catch (error: unknown) {
    console.error(`[Team Delete] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: { message: "Failed to deactivate team" } },
      { status: 500 }
    );
  }
}
