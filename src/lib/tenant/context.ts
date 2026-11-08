/**
 * NESALE Multi-Tenant Server Context & Isolation Layer
 * Enforces business_id scoping on every tenant-owned record and API route.
 */

export type TenantRole = "owner" | "admin" | "member";

export interface TenantContext {
  userId: string;
  businessId: string;
  role: TenantRole;
}

/**
 * Validates that a user has authorized membership access to a given business.
 * Throws an error or returns null if the tenant boundary is breached.
 */
export function assertTenantAccess(
  context: TenantContext | null | undefined,
  requiredRole: TenantRole = "member"
): asserts context is TenantContext {
  if (!context || !context.businessId || !context.userId) {
    throw new Error("FORBIDDEN: Tenant context is required for this operation.");
  }

  const roleHierarchy: Record<TenantRole, number> = {
    member: 1,
    admin: 2,
    owner: 3,
  };

  if (roleHierarchy[context.role] < roleHierarchy[requiredRole]) {
    throw new Error(
      `FORBIDDEN: Role '${context.role}' does not satisfy minimum '${requiredRole}' permission.`
    );
  }
}

/**
 * Helper to automatically scope database queries with the tenant businessId.
 */
export function withTenantScope<T extends Record<string, unknown>>(
  context: TenantContext,
  queryFilter: T
): T & { businessId: string } {
  assertTenantAccess(context);
  return {
    ...queryFilter,
    businessId: context.businessId,
  };
}
