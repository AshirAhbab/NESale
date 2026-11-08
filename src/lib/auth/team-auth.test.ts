import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  assertTeamAccess,
  getRoleDefaults,
  checkTeamPermission,
  wouldLeaveNoTeamAdmins,
} from "./team-auth";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    businessMember: {
      count: vi.fn(),
    },
  },
}));

// Mock ApiCache
vi.mock("@/lib/cache/apiCache", () => ({
  ApiCache: {
    getOrSet: vi.fn(async (_key: string, fetcher: () => Promise<any>) => fetcher()),
    invalidate: vi.fn(),
  },
}));

import { prisma } from "@/lib/db/prisma";

describe("Team Authorization - assertTeamAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when context is null", () => {
    expect(() => assertTeamAccess(null)).toThrow("FORBIDDEN");
  });

  it("throws when context is undefined", () => {
    expect(() => assertTeamAccess(undefined)).toThrow("FORBIDDEN");
  });

  it("allows team_admin for team_member requirement", () => {
    const ctx = {
      userId: "u1",
      businessId: "b1",
      teamId: "t1",
      teamRole: "team_admin" as const,
      teamName: "Test Team",
      teamType: "ecommerce",
      isActive: true,
    };
    expect(() => assertTeamAccess(ctx, "team_member")).not.toThrow();
  });

  it("throws when team_member tries admin action", () => {
    const ctx = {
      userId: "u1",
      businessId: "b1",
      teamId: "t1",
      teamRole: "team_member" as const,
      teamName: "Test Team",
      teamType: "ecommerce",
      isActive: true,
    };
    expect(() => assertTeamAccess(ctx, "team_admin")).toThrow("FORBIDDEN");
  });

  it("throws when team is inactive", () => {
    const ctx = {
      userId: "u1",
      businessId: "b1",
      teamId: "t1",
      teamRole: "team_admin" as const,
      teamName: "Test Team",
      teamType: "ecommerce",
      isActive: false,
    };
    expect(() => assertTeamAccess(ctx, "team_member")).toThrow("FORBIDDEN");
  });
});

describe("Team Authorization - getRoleDefaults", () => {
  it("returns view-only defaults for team_member", () => {
    const defaults = getRoleDefaults("team_member");
    expect(defaults.products).toEqual(["view"]);
    expect(defaults.services).toEqual(["view"]);
    expect(defaults.knowledge).toEqual(["view"]);
    expect(defaults.team_management).toEqual(["view"]);
  });

  it("returns create/edit defaults for team_manager", () => {
    const defaults = getRoleDefaults("team_manager");
    expect(defaults.products).toContain("create");
    expect(defaults.products).toContain("edit");
    expect(defaults.products).not.toContain("delete");
    expect(defaults.team_management).toContain("manage_members");
    expect(defaults.team_management).not.toContain("manage_permissions");
  });

  it("returns full defaults for team_admin", () => {
    const defaults = getRoleDefaults("team_admin");
    expect(defaults.products).toEqual([
      "view",
      "create",
      "edit",
      "delete",
      "manage_settings",
    ]);
    expect(defaults.team_management).toContain("manage_permissions");
  });
});

describe("Team Authorization - checkTeamPermission", () => {
  it("returns true when action is in permissions", () => {
    const ctx = {
      _permissions: {
        products: ["view", "create", "edit"],
      },
    } as any;
    expect(checkTeamPermission(ctx, "products", "view")).toBe(true);
    expect(checkTeamPermission(ctx, "products", "delete")).toBe(false);
  });

  it("returns false when feature missing", () => {
    const ctx = {
      _permissions: {},
    } as any;
    expect(checkTeamPermission(ctx, "products", "view")).toBe(false);
  });
});

describe("Team Authorization - wouldLeaveNoTeamAdmins", () => {
  it("returns true when removing the only admin", async () => {
    (prisma.teamMember.count as any).mockResolvedValue(1);
    (prisma.teamMember.findFirst as any).mockResolvedValue({
      teamId: "t1",
      userId: "u1",
      role: "team_admin",
      isActive: true,
    });

    const result = await wouldLeaveNoTeamAdmins("t1", "u1");
    expect(result).toBe(true);
  });

  it("returns false when there are multiple admins", async () => {
    (prisma.teamMember.count as any).mockResolvedValue(2);
    (prisma.teamMember.findFirst as any).mockResolvedValue({
      teamId: "t1",
      userId: "u1",
      role: "team_admin",
      isActive: true,
    });

    const result = await wouldLeaveNoTeamAdmins("t1", "u1");
    expect(result).toBe(false);
  });

  it("returns false when target is not an admin", async () => {
    (prisma.teamMember.count as any).mockResolvedValue(1);
    (prisma.teamMember.findFirst as any).mockResolvedValue(null);

    const result = await wouldLeaveNoTeamAdmins("t1", "u1");
    expect(result).toBe(false);
  });
});
