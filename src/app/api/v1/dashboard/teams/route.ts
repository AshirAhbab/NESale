import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import { resolveTeamContext, assertTeamAccess, getEffectivePermissions } from "@/lib/auth/team-auth";
import { normalizeBusinessType } from "@/lib/business/types";

const TEAM_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const TEAM_RATE_LIMIT_MAX = 60;

/**
 * GET /api/v1/dashboard/teams
 * List all teams for the authenticated business.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedBizId = searchParams.get("businessId");

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
    const tenant = await resolveCachedTenant(req, requestedBizId ?? undefined);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const businessId = tenant.business.id;

    // Verify requested businessId matches resolved tenant
    if (requestedBizId && tenant.business.id !== requestedBizId) {
      return NextResponse.json(
        { error: { message: "Access denied." } },
        { status: 403 }
      );
    }

    const teams = await prisma.team.findMany({
      where: { businessId },
      include: {
        _count: { select: { members: true, permissions: true, websiteAssignments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      type: t.type,
      isActive: t.isActive,
      memberCount: t._count.members,
      permissionCount: t._count.permissions,
      websiteCount: t._count.websiteAssignments,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      metadata: t.metadata || {},
    }));

    return NextResponse.json({
      status: "success",
      total: formatted.length,
      teams: formatted,
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Teams List] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch teams" } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/dashboard/teams
 * Create a new team for the business.
 * Requires business admin or owner role.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      type: requestedType,
      businessId: requestedBizId,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Team name is required" } },
        { status: 400 }
      );
    }

    if (
      requestedType !== undefined &&
      !["ecommerce", "services"].includes(String(requestedType))
    ) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Team type must be 'ecommerce' or 'services'." } },
        { status: 400 }
      );
    }

    // Authorize business context
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

    // Only business owner or admin can create teams
    const membership = await prisma.businessMember.findFirst({
      where: { userId, businessId },
    });
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Only business owners and admins can create teams." } },
        { status: 403 }
      );
    }

    // Check for duplicate team name within business
    const existing = await prisma.team.findFirst({
      where: { businessId, name },
    });
    if (existing) {
      return NextResponse.json(
        { error: { code: "DUPLICATE", message: "A team with this name already exists." } },
        { status: 409 }
      );
    }

    const team = await prisma.team.create({
      data: {
        businessId,
        name,
        description: description || undefined,
        type: requestedType || normalizeBusinessType(tenant.business.businessType),
        isActive: true,
        metadata: { createdBy: userId, createdAt: new Date().toISOString() },
      },
      include: {
        _count: { select: { members: true } },
      },
    });

    // Automatically add the creator as a team_admin
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId,
        businessId,
        role: "team_admin",
        isActive: true,
      },
    });

    // Invalidate caches
    ApiCache.invalidate(`teams:get:${businessId}`);
    ApiCache.invalidate(`team:permissions:${team.id}`);

    return NextResponse.json({
      status: "success",
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        type: team.type,
        isActive: team.isActive,
        memberCount: 1,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
      businessId,
    });
  } catch (error: unknown) {
    console.error("[Team Create] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to create team" } },
      { status: 500 }
    );
  }
}
