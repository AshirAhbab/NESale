import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";

const TEAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEAM_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/team
 * List business members for the authenticated business.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

    const rateLimitKey = `team:get:${requestedBizId || "default"}`;
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

    if (requestedBizId && tenant.business.id !== requestedBizId) {
      return NextResponse.json(
        { error: { message: "Access denied." } },
        { status: 403 }
      );
    }

    const members = await prisma.businessMember.findMany({
      where: { businessId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      status: "success",
      members: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        businessId: m.businessId,
        role: m.role,
        isActive: true,
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
    console.error("[Team Members Get] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch team members" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/dashboard/team
 * Create a pending invitation for a new team member.
 * Requires business owner or admin.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, role = "team_member", teamId, businessId: requestedBizId } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Email is required" } },
        { status: 400 }
      );
    }

    const VALID_TEAM_ROLES = ["team_admin", "team_manager", "team_member"];
    if (!VALID_TEAM_ROLES.includes(role)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Role must be one of: ${VALID_TEAM_ROLES.join(", ")}`,
          },
        },
        { status: 400 }
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

    // Only owner or admin can invite
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only business owners and admins can invite members.",
          },
        },
        { status: 403 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase();

    // Check if user is already a direct business member (existing account case)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingBizMember = await prisma.businessMember.findFirst({
        where: { businessId, userId: existingUser.id },
      });

      if (existingBizMember) {
        // User is already a business member.
        // If teamId is provided, add them to the team directly (existing-user assignment).
        if (teamId) {
          // Verify team exists and belongs to business
          const team = await prisma.team.findFirst({
            where: { id: teamId, businessId },
          });
          if (!team) {
            return NextResponse.json(
              { error: { message: "Team not found or does not belong to this business." } },
              { status: 404 }
            );
          }

          // Check if already a member of this team
          const existingTeamMember = await prisma.teamMember.findFirst({
            where: { teamId, userId: existingUser.id },
          });
          if (existingTeamMember) {
            return NextResponse.json(
              {
                error: {
                  code: "DUPLICATE",
                  message: "User is already a member of this team.",
                },
              },
              { status: 409 }
            );
          }

          const teamMember = await prisma.teamMember.create({
            data: {
              teamId,
              userId: existingUser.id,
              businessId,
              role: role as "team_admin" | "team_manager" | "team_member",
              isActive: true,
            },
            include: { user: true },
          });

          ApiCache.invalidate(`team:get:${businessId}`);

          return NextResponse.json({
            status: "success",
            member: {
              id: teamMember.id,
              userId: teamMember.userId,
              businessId: teamMember.businessId,
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
            message: "Existing user added to team.",
          });
        }

        // User is already a business member but no team specified.
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE",
              message: "User is already a member of this business. Specify a teamId to add them to a team.",
            },
          },
          { status: 409 }
        );
      }
    }

    // Create a pending invitation
    const { createInvitation } = await import("@/lib/auth/invitation");
    const { invitation, token } = await createInvitation({
      businessId,
      email: normalizedEmail,
      teamId: teamId ?? undefined,
      role: role as "team_admin" | "team_manager" | "team_member",
      invitedById: userId,
    });

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        teamId: invitation.teamId,
      },
      token,
      businessId,
      message:
        "Invitation created. Share the token with the invitee or configure email delivery.",
    });
  } catch (error: unknown) {
    console.error("[Team Member Invite] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to invite member" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/dashboard/team?id=...
 * Remove a business member.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const requestedBizId = searchParams.get("businessId");

    if (!id) {
      return NextResponse.json({ error: { message: "Member ID required" } }, { status: 400 });
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

    // Only owner or admin can remove
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only business owners and admins can remove members." } },
        { status: 403 }
      );
    }

    // Verify member exists and belongs to business
    const member = await prisma.businessMember.findFirst({
      where: { id, businessId },
    });
    if (!member) {
      return NextResponse.json(
        { error: { message: "Member not found." } },
        { status: 404 }
      );
    }

    // Prevent removing the last owner/admin
    if (member.role === "owner" || member.role === "admin") {
      const adminCount = await prisma.businessMember.count({
        where: {
          businessId,
          role: { in: ["owner", "admin"] },
        },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: {
              code: "LAST_ADMIN",
              message: "Cannot remove the last admin/owner of the business.",
            },
          },
          { status: 400 }
        );
      }
    }

    await prisma.businessMember.delete({ where: { id } });

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      deletedId: id,
      businessId,
      message: "Member removed from business.",
    });
  } catch (error: unknown) {
    console.error("[Team Member Remove] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to remove member" } },
      { status: 500 }
    );
  }
}
