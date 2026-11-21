import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import { resendInvitation } from "@/lib/auth/invitation";

const INVITE_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const INVITE_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/invitations/[invitationId]
 * Resend an invitation (generate new token, extend expiry).
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

  try {
    const rateLimitKey = `invitations:resend:${requestedBizId || "default"}`;
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
    const userId = tenant.user.id;

    if (requestedBizId && tenant.business.id !== requestedBizId) {
      return NextResponse.json(
        { error: { message: "Access denied." } },
        { status: 403 }
      );
    }

    // Only owner or admin can resend
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only business owners and admins can resend invitations.",
          },
        },
        { status: 403 }
      );
    }

    const { token, invitation, error } = await resendInvitation(
      invitationId,
      businessId
    );

    if (error) {
      return NextResponse.json(
        { error: { message: error } },
        { status: 400 }
      );
    }

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
      },
      token,
      businessId,
      message: "Invitation resent. New token generated.",
    });
  } catch (error: unknown) {
    console.error("[Invitation Resend] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to resend invitation" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/dashboard/invitations/[invitationId]
 * Revoke an invitation.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ invitationId: string }> }
) {
  const { invitationId } = await context.params;
  const { searchParams } = new URL(req.url);
  const requestedBizId = searchParams.get("businessId");

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

    // Only owner or admin can revoke
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only business owners and admins can revoke invitations.",
          },
        },
        { status: 403 }
      );
    }

    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, businessId },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: { message: "Invitation not found." } },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        {
          error: {
            message: `Cannot revoke a ${invitation.status} invitation.`,
          },
        },
        { status: 400 }
      );
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "revoked" },
    });

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      invitationId,
      message: "Invitation revoked.",
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Invitation Revoke] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to revoke invitation" } },
      { status: 500 }
    );
  }
}
