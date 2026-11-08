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
 * PATCH /api/v1/dashboard/teams/[teamId]/members/[memberId]
 * Update a team member's role or active status.
 * Requires team_admin or business owner/admin.
 * Prevents removing/demoting the last team admin.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await context.params;
  const body = await req.json();
  const { role, isActive, businessId: requestedBizId } = body;

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

    // Verify member exists
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member) {
      return NextResponse.json(
        { error: { message: "Team member not found." } },
        { status: 404 }
      );
    }

    // Prevent self-demotion/removal if last admin
    if (member.userId === userId) {
      if (role && role !== "team_admin" && member.role === "team_admin") {
        const lastAdmin = await wouldLeaveNoTeamAdmins(teamId, userId);
        if (lastAdmin) {
          return NextResponse.json(
            {
              error: {
                code: "LAST_ADMIN",
                message: "Cannot demote yourself: you are the last team admin.",
              },
            },
            { status: 400 }
          );
        }
      }
      if (isActive === false && member.role === "team_admin") {
        const lastAdmin = await wouldLeaveNoTeamAdmins(teamId, userId);
        if (lastAdmin) {
          return NextResponse.json(
            {
              error: {
                code: "LAST_ADMIN",
                message: "Cannot deactivate yourself: you are the last team admin.",
              },
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Prevent removing/demoting another admin if last admin
      if (member.role === "team_admin") {
        if (role && role !== "team_admin") {
          const lastAdmin = await wouldLeaveNoTeamAdmins(teamId, member.userId);
          if (lastAdmin) {
            return NextResponse.json(
              {
                error: {
                  code: "LAST_ADMIN",
                  message: "Cannot demote: this user is the last team admin.",
                },
              },
              { status: 400 }
            );
          }
        }
        if (isActive === false) {
          const lastAdmin = await wouldLeaveNoTeamAdmins(teamId, member.userId);
          if (lastAdmin) {
            return NextResponse.json(
              {
                error: {
                  code: "LAST_ADMIN",
                  message: "Cannot deactivate: this user is the last team admin.",
                },
              },
              { status: 400 }
            );
          }
        }
      }
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        ...(role !== undefined ? { role: role as "team_admin" | "team_manager" | "team_member" } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    invalidateTeamCache(teamId, member.userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      member: {
        id: updated.id,
        teamId: updated.teamId,
        userId: updated.userId,
        role: updated.role,
        isActive: updated.isActive,
        user: {
          id: updated.user.id,
          name: updated.user.name,
          email: updated.user.email,
        },
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error(`[Team Member Update] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to update team member" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/dashboard/teams/[teamId]/members/[memberId]
 * Remove a member from a team.
 * Requires team_admin or business owner/admin.
 * Prevents removing the last team admin.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ teamId: string; memberId: string }> }
) {
  const { teamId, memberId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

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

    // Verify member exists
    const member = await prisma.teamMember.findFirst({
      where: { id: memberId, teamId },
    });
    if (!member) {
      return NextResponse.json(
        { error: { message: "Team member not found." } },
        { status: 404 }
      );
    }

    // Prevent removing last admin
    if (member.role === "team_admin") {
      const lastAdmin = await wouldLeaveNoTeamAdmins(teamId, member.userId);
      if (lastAdmin) {
        return NextResponse.json(
          {
            error: {
              code: "LAST_ADMIN",
              message: "Cannot remove: this user is the last team admin.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Soft delete: deactivate membership instead of hard delete
    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: { isActive: false },
    });

    // Invalidate caches
    invalidateTeamCache(teamId, userId);
    invalidateTeamCache(teamId, member.userId);
    ApiCache.invalidate(`teams:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      member: {
        id: updated.id,
        userId: updated.userId,
        isActive: updated.isActive,
      },
      businessId,
      message: "Member removed from team.",
    });
  } catch (error: unknown) {
    console.error(`[Team Member Remove] Error:`, error);
    if ((error as Error).message?.includes("FORBIDDEN")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: (error as Error).message } },
        { status: 403 }
      );
    }
    return NextResponse.json(
      { error: { message: "Failed to remove team member" } },
      { status: 500 }
    );
  }
}
