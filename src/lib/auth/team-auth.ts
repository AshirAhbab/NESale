/**
 * NESALE Team Authorization Layer
 * Enforces team-level scoping and feature-level permissions on top of
 * existing business-level tenant isolation.
 */

import { prisma } from "@/lib/db/prisma";
import { assertTenantAccess, TenantContext, TenantRole } from "@/lib/tenant/context";
import { ApiCache } from "@/lib/cache/apiCache";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamRole = "team_admin" | "team_manager" | "team_member";

export interface TeamContext {
  userId: string;
  businessId: string;
  teamId: string;
  teamRole: TeamRole;
  teamName: string;
  teamType: string;
  isActive: boolean;
}

export interface PermissionCheck {
  feature: string;
  actions: string[];
}

export interface EffectivePermissions {
  teamId: string;
  teamName: string;
  teamRole: TeamRole;
  features: Record<string, string[]>; // feature -> allowed actions
}

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
  team_member: 1,
  team_manager: 2,
  team_admin: 3,
};

const ORG_ROLE_HIERARCHY: Record<TenantRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

// ---------------------------------------------------------------------------
// Team context resolution
// ---------------------------------------------------------------------------

/**
 * Resolve and authorize a team context for a user within a business.
 * Returns null if the user is not a member of the team or business.
 */
export async function resolveTeamContext(
  userId: string,
  businessId: string,
  teamId: string
): Promise<TeamContext | null> {
  const cacheKey = `team:context:${userId}:${teamId}`;
  const cached = await ApiCache.getOrSet<TeamContext | null>(
    cacheKey,
    async () => {
      // Verify user is a member of the business
      const membership = await prisma.businessMember.findFirst({
        where: { userId, businessId },
      });
      if (!membership) return null;

      // Verify user is an active member of the team
      const teamMember = await prisma.teamMember.findFirst({
        where: { id: teamId, userId, businessId, isActive: true },
        include: { team: true },
      });
      if (!teamMember || !teamMember.team.isActive) return null;

      return {
        userId,
        businessId,
        teamId: teamMember.teamId,
        teamRole: teamMember.role as TeamRole,
        teamName: teamMember.team.name,
        teamType: teamMember.team.type,
        isActive: teamMember.team.isActive,
      };
    },
    60 * 1000 // 1 minute cache
  );

  return cached ?? null;
}

/**
 * Assert team access, throwing if not authorized.
 */
export function assertTeamAccess(
  context: TeamContext | null | undefined,
  requiredRole: TeamRole = "team_member"
): asserts context is TeamContext {
  if (!context || !context.teamId || !context.userId) {
    throw new Error("FORBIDDEN: Team context is required for this operation.");
  }

  if (!context.isActive) {
    throw new Error("FORBIDDEN: Team is deactivated.");
  }

  if (TEAM_ROLE_HIERARCHY[context.teamRole] < TEAM_ROLE_HIERARCHY[requiredRole]) {
    throw new Error(
      `FORBIDDEN: Team role '${context.teamRole}' does not satisfy minimum '${requiredRole}' permission.`
    );
  }
}

// ---------------------------------------------------------------------------
// Permission evaluation
// ---------------------------------------------------------------------------

const FEATURE_ACTIONS: Record<string, string[]> = {
  products: ["view", "create", "edit", "delete", "manage_settings"],
  services: ["view", "create", "edit", "delete", "manage_settings"],
  appointments: ["view", "create", "edit", "delete", "manage_settings"],
  knowledge: ["view", "create", "edit", "delete", "manage_settings"],
  conversations: ["view", "manage_settings"],
  leads: ["view", "manage_settings"],
  analytics: ["view", "manage_settings"],
  website: ["view", "create", "edit", "delete", "manage_settings"],
  team_management: [
    "view",
    "create",
    "edit",
    "delete",
    "manage_settings",
    "manage_members",
    "manage_permissions",
  ],
};

/**
 * Get effective permissions for a user on a specific team.
 * Combines team role defaults with explicit TeamPermission records.
 */
export async function getEffectivePermissions(
  userId: string,
  businessId: string,
  teamId: string
): Promise<EffectivePermissions | null> {
  const context = await resolveTeamContext(userId, businessId, teamId);
  if (!context) return null;

  const cacheKey = `team:permissions:${teamId}`;
  const cached = await ApiCache.getOrSet<{ features: Record<string, string[]> } | null>(
    cacheKey,
    async () => {
      const permissions = await prisma.teamPermission.findMany({
        where: { teamId },
      });

      const features: Record<string, string[]> = {};

      // Apply explicit permissions from database
      for (const p of permissions) {
        features[p.feature] = (p.actions as string[]) || [];
      }

      // Apply role-based defaults for features not explicitly configured
      const roleDefaults = getRoleDefaults(context.teamRole);
      for (const [feature, actions] of Object.entries(roleDefaults)) {
        if (!features[feature]) {
          features[feature] = actions;
        }
      }

      return { features };
    },
    60 * 1000
  );

  const perms = cached;

  return {
    teamId: context.teamId,
    teamName: context.teamName,
    teamRole: context.teamRole,
    features: perms?.features ?? {},
  };
}

/**
 * Get default actions for a team role on each feature.
 */
export function getRoleDefaults(role: TeamRole): Record<string, string[]> {
  const base: Record<string, string[]> = {
    products: ["view"],
    services: ["view"],
    appointments: ["view"],
    knowledge: ["view"],
    conversations: ["view"],
    leads: ["view"],
    analytics: ["view"],
    website: ["view"],
    team_management: ["view"],
  };

  if (role === "team_manager") {
    base.products = ["view", "create", "edit"];
    base.services = ["view", "create", "edit"];
    base.appointments = ["view", "create", "edit"];
    base.knowledge = ["view", "create", "edit"];
    base.conversations = ["view"];
    base.leads = ["view"];
    base.analytics = ["view"];
    base.website = ["view", "edit"];
    base.team_management = ["view", "manage_members"];
  }

  if (role === "team_admin") {
    base.products = ["view", "create", "edit", "delete", "manage_settings"];
    base.services = ["view", "create", "edit", "delete", "manage_settings"];
    base.appointments = ["view", "create", "edit", "delete", "manage_settings"];
    base.knowledge = ["view", "create", "edit", "delete", "manage_settings"];
    base.conversations = ["view", "manage_settings"];
    base.leads = ["view", "manage_settings"];
    base.analytics = ["view", "manage_settings"];
    base.website = ["view", "create", "edit", "delete", "manage_settings"];
    base.team_management = [
      "view",
      "create",
      "edit",
      "delete",
      "manage_settings",
      "manage_members",
      "manage_permissions",
    ];
  }

  return base;
}

/**
 * Check if a team context has a specific action on a feature.
 */
export function checkTeamPermission(
  context: TeamContext,
  feature: string,
  action: string
): boolean {
  // This is a synchronous helper; callers should use getEffectivePermissions
  // for the full picture, but this is useful for quick checks when permissions
  // are already loaded.
  const perms = context as unknown as { _permissions?: Record<string, string[]> };
  if (!perms._permissions) return false;
  const actions = perms._permissions[feature];
  return Array.isArray(actions) && actions.includes(action);
}

/**
 * Assert that a team context has a specific action on a feature.
 * Throws if not authorized.
 */
export function assertTeamPermission(
  context: TeamContext & { _permissions?: Record<string, string[]> },
  feature: string,
  action: string
): void {
  assertTeamAccess(context, "team_member");
  const actions = context._permissions?.[feature];
  if (!Array.isArray(actions) || !actions.includes(action)) {
    throw new Error(
      `FORBIDDEN: Team role '${context.teamRole}' does not have '${action}' permission on '${feature}'.`
    );
  }
}

// ---------------------------------------------------------------------------
// Team membership helpers
// ---------------------------------------------------------------------------

/**
 * Get all teams a user is a member of within a business.
 */
export async function getUserTeams(
  userId: string,
  businessId: string
): Promise<Array<{
  id: string;
  name: string;
  type: string;
  role: TeamRole;
  isActive: boolean;
  memberCount: number;
}>> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId, businessId, isActive: true },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          type: true,
          isActive: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  return memberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    type: m.team.type,
    role: m.role as TeamRole,
    isActive: m.team.isActive,
    memberCount: m.team._count.members,
  }));
}

/**
 * Check if removing a user from a team would leave the team with no admins.
 */
export async function wouldLeaveNoTeamAdmins(
  teamId: string,
  userIdToRemove: string
): Promise<boolean> {
  const adminCount = await prisma.teamMember.count({
    where: {
      teamId,
      role: "team_admin",
      isActive: true,
    },
  });

  const targetMember = await prisma.teamMember.findFirst({
    where: { teamId, userId: userIdToRemove, role: "team_admin", isActive: true },
  });

  if (!targetMember) return false; // Not an admin, removal won't affect admin count

  return adminCount <= 1;
}

/**
 * Check if a business has at least one active owner/admin.
 * Used to prevent locking out the business.
 */
export async function hasBusinessAdmin(businessId: string): Promise<boolean> {
  const count = await prisma.businessMember.count({
    where: {
      businessId,
      role: { in: ["owner", "admin"] },
    },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Invalidation helpers
// ---------------------------------------------------------------------------

export function invalidateTeamCache(teamId: string, userId?: string): void {
  ApiCache.invalidate(`team:context:`);
  ApiCache.invalidate(`team:permissions:${teamId}`);
  if (userId) {
    ApiCache.invalidate(`team:context:${userId}:`);
  }
}
