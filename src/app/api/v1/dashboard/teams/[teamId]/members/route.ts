import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import {
  resolveTeamContext,
  assertTeamAccess,
  getEffectivePermissions,
  wouldLeaveNoTeamAdmins,
  invalidateTeamCache,
} from "@/lib/auth/team-auth";

const TEAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEAM_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/teams/[teamId]/members
 * List all members of a team.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    const rateLimitKey = `teams:members:get:${requestedBizId || "default"}`;
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

    const members = await prisma.teamMember.findMany({
      where: { teamId, isActive: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      status: "success",
      teamId,
      members: members.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        userId: m.userId,
        businessId: m.businessId,
        role: m.role,
        isActive: m.isActive,
        createdAt: m.createdAt,
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        },
      })),
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Members Get] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to fetch team members" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/dashboard/teams/[teamId]/members
 * Add an existing business member to a team.
 * Requires team_admin or business owner/admin.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ teamId: string }> }
) {
  const { teamId } = await context.params;
  const body = await req.json();
  const { userId: targetUserId, role = "team_member", businessId: requestedBizId } = body;

  if (!targetUserId || typeof targetUserId !== "string") {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "userId is required" } },
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

    // Verify target user is a member of the business
    const targetMembership = await prisma.businessMember.findFirst({
      where: { userId: targetUserId, businessId },
    });
    if (!targetMembership) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "User is not a member of this business." } },
        { status: 404 }
      );
    }

    // Check if already a member of this team
    const existing = await prisma.teamMember.findFirst({
      where: { teamId, userId: targetUserId },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "User is already a member of this team." } },
        { status: 409 }
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: {
        teamId,
        userId: targetUserId,
        businessId,
        role: role as "team_admin" | "team_manager" | "team_member",
        isActive: true,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    invalidateTeamCache(teamId, targetUserId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      member: {
        id: teamMember.id,
        teamId: teamMember.teamId,
        userId: teamMember.userId,
        role: teamMember.role,
        isActive: teamMember.isActive,
        createdAt: teamMember.createdAt,
        user: {
          id: teamMember.user.id,
          name: teamMember.user.name,
          email: teamMember.user.email,
        },
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Member Add] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to add team member" } },
      { status: 500 }
    );
  }
}
