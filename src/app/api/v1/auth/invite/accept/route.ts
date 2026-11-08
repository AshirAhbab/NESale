import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApiCache } from "@/lib/cache/apiCache";
import { createClient } from "@/utils/supabase/server";
import {
  validateInvitationToken,
  acceptInvitation,
} from "@/lib/auth/invitation";

const ACCEPT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const ACCEPT_RATE_LIMIT_MAX = 30;

/**
 * POST /api/v1/auth/invite/accept
 * Accept an invitation using a token.
 * Creates a TeamMember record if the invitation is team-scoped.
 * Requires the user to be authenticated (Supabase session).
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

    const rateLimitKey = `invite:accept:${requestedBizId || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      ACCEPT_RATE_LIMIT_WINDOW_MS,
      ACCEPT_RATE_LIMIT_MAX
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

    const body = await req.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invitation token is required." } },
        { status: 400 }
      );
    }

    // Require an actual Supabase session. Do not use resolveCachedTenant here:
    // it falls back to the first business/owner when unauthenticated.
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json(
        { error: { message: "Authentication required. Please sign in." } },
        { status: 401 }
      );
    }

    const authEmail = authUser.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: authEmail } });
    if (!user) {
      return NextResponse.json(
        {
          error: {
            message:
              "Your account is not synced yet. Sign out and sign in again, then retry.",
          },
        },
        { status: 403 }
      );
    }

    const userId = user.id;

    // Validate the invitation token
    const validation = await validateInvitationToken(token);

    if (validation.error || !validation.invitation) {
      return NextResponse.json(
        { error: { code: "INVALID_INVITATION", message: validation.error || "Invalid invitation." } },
        { status: 400 }
      );
    }

    const invitation = validation.invitation;

    // Verify the invitation belongs to the authenticated user's email
    if (authEmail !== invitation.email.toLowerCase()) {
      return NextResponse.json(
        { error: { code: "EMAIL_MISMATCH", message: "This invitation is not for your email address." } },
        { status: 403 }
      );
    }

    // Accept the invitation
    const acceptResult = await acceptInvitation({
      invitationId: invitation.id,
      acceptedById: userId,
    });

    if (acceptResult.error) {
      return NextResponse.json(
        { error: { code: "ACCEPT_ERROR", message: acceptResult.error } },
        { status: 400 }
      );
    }

    const businessId = acceptResult.invitation.businessId;

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      invitation: {
        id: acceptResult.invitation.id,
        email: acceptResult.invitation.email,
        role: acceptResult.invitation.role,
        status: acceptResult.invitation.status,
      },
      teamMemberId: acceptResult.teamMemberId,
      businessId,
      message: "Invitation accepted. You have been added to the team.",
    });
  } catch (error: unknown) {
    console.error("[Invitation Accept] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to accept invitation" } },
      { status: 500 }
    );
  }
}
