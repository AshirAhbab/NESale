import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";

const INVITE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const INVITE_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/invitations
 * List invitations for a business.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");
    const status = searchParams.get("status");
    const teamId = searchParams.get("teamId");

    const rateLimitKey = `invitations:get:${requestedBizId || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      INVITE_RATE_LIMIT_WINDOW_MS,
      INVITE_RATE_LIMIT_MAX
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

    const invitations = await prisma.invitation.findMany({
      where: {
        businessId,
        ...(status ? { status } : {}),
        ...(teamId ? { teamId } : {}),
      },
      include: {
        team: { select: { id: true, name: true, type: true } },
        invitedBy: { select: { id: true, name: true, email: true } },
        acceptedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      status: "success",
      invitations: invitations.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        status: i.status,
        expiresAt: i.expiresAt,
        acceptedAt: i.acceptedAt,
        teamId: i.teamId,
        team: i.team,
        invitedBy: i.invitedBy,
        acceptedBy: i.acceptedBy,
        createdAt: i.createdAt,
      })),
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Invitations List] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch invitations" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/dashboard/invitations
 * Create a new invitation.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      name,
      role = "team_member",
      teamId,
      businessId: requestedBizId,
    } = body;

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

    const normalizedEmail = email.toLowerCase();

    // Check if user is already a direct business member
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingBizMember = await prisma.businessMember.findFirst({
        where: { businessId, userId: existingUser.id },
      });

      if (existingBizMember) {
        if (teamId) {
          const team = await prisma.team.findFirst({
            where: { id: teamId, businessId },
          });
          if (!team) {
            return NextResponse.json(
              { error: { message: "Team not found or does not belong to this business." } },
              { status: 404 }
            );
          }

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

        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE",
              message:
                "User is already a member of this business. Specify a teamId to add them to a team.",
            },
          },
          { status: 409 }
        );
      }
    }

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
    console.error("[Invitation Create] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create invitation" } },
      { status: 500 }
    );
  }
}
