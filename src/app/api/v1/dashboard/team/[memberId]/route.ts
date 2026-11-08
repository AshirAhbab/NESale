import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";

const MEMBER_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MEMBER_RATE_LIMIT_MAX = 60;

const VALID_MEMBER_ROLES = ["owner", "admin", "member"];

/**
 * PATCH /api/v1/dashboard/team/[memberId]
 * Update a business member's role.
 * Requires business owner or admin.
 * Prevents demoting/removing the last admin/owner.
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await context.params;
  const body = await req.json();
  const { role, businessId: requestedBizId } = body;

  if (!role || !VALID_MEMBER_ROLES.includes(role)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: `Role must be one of: ${VALID_MEMBER_ROLES.join(", ")}`,
        },
      },
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

    // Only owner or admin can edit members
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Only business owners and admins can edit member roles.",
          },
        },
        { status: 403 }
      );
    }

    // Verify member exists and belongs to business
    const member = await prisma.businessMember.findFirst({
      where: { id: memberId, businessId },
      include: { user: true },
    });
    if (!member) {
      return NextResponse.json(
        { error: { message: "Member not found." } },
        { status: 404 }
      );
    }

    // Prevent editing yourself if you're the last admin and trying to demote
    if (member.userId === userId) {
      if (
        (member.role === "owner" || member.role === "admin") &&
        role !== member.role
      ) {
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
                message: "Cannot demote yourself: you are the last admin/owner.",
              },
            },
            { status: 400 }
          );
        }
      }
    } else {
      // Prevent demoting another admin if last admin
      if (
        (member.role === "owner" || member.role === "admin") &&
        role !== member.role
      ) {
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
                message: "Cannot demote: this user is the last admin/owner.",
              },
            },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.businessMember.update({
      where: { id: memberId },
      data: { role: role as "owner" | "admin" | "member" },
      include: { user: true },
    });

    ApiCache.invalidate(`team:get:${businessId}`);

    return NextResponse.json({
      status: "success",
      member: {
        id: updated.id,
        userId: updated.userId,
        businessId: updated.businessId,
        role: updated.role,
        isActive: true,
        createdAt: updated.createdAt,
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
      { error: { message: "Failed to update member role" } },
      { status: 500 }
    );
  }
}
