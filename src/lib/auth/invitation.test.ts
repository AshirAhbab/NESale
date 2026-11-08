import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateInvitationToken,
  defaultExpiry,
  createInvitation,
  validateInvitationToken,
  acceptInvitation,
  revokeInvitation,
  resendInvitation,
  listInvitations,
  expireInvitations,
} from "./invitation";

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    invitation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    teamMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    businessMember: {
      findFirst: vi.fn(),
    },
    team: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(vi.mocked(vi.fn()))),
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

describe("Invitation Service - Token Generation", () => {
  it("generates a high-entropy token and matching hash", () => {
    const { token, tokenHash } = generateInvitationToken();
    expect(token).toBeDefined();
    expect(tokenHash).toBeDefined();
    expect(typeof token).toBe("string");
    expect(typeof tokenHash).toBe("string");
    expect(token.length).toBeGreaterThan(32);
    expect(tokenHash.length).toBe(64); // SHA-256 hex
  });

  it("produces different tokens on each call", () => {
    const { token: t1 } = generateInvitationToken();
    const { token: t2 } = generateInvitationToken();
    expect(t1).not.toBe(t2);
  });

  it("computes default expiry as 7 days from now", () => {
    const expiry = defaultExpiry();
    const now = Date.now();
    const diff = expiry.getTime() - now;
    expect(diff).toBeGreaterThan(6 * 24 * 60 * 60 * 1000); // more than 6 days
    expect(diff).toBeLessThan(8 * 24 * 60 * 60 * 1000); // less than 8 days
  });
});

describe("Invitation Service - createInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an invitation with token hash and returns raw token", async () => {
    const mockInvitation = {
      id: "inv_123",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date("2026-12-01"),
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.create as any).mockResolvedValue(mockInvitation);

    const result = await createInvitation({
      businessId: "biz_1",
      email: "Test@Example.com",
      invitedById: "user_1",
    });

    expect(result.token).toBeDefined();
    expect(result.invitation.email).toBe("test@example.com"); // normalized
    expect(result.invitation.status).toBe("pending");
    expect(prisma.invitation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
          status: "pending",
          tokenHash: expect.any(String),
        }),
      })
    );
  });
});

describe("Invitation Service - validateInvitationToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns valid invitation for matching token", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000), // 1 day from now
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);

    const { token, tokenHash } = generateInvitationToken();
    // Override the stored hash to match our test token
    (prisma.invitation.findFirst as any).mockImplementation(() =>
      Promise.resolve({ ...mockInvitation, tokenHash })
    );

    const result = await validateInvitationToken(token);
    expect(result.error).toBeUndefined();
    expect(result.invitation?.email).toBe("test@example.com");
  });

  it("returns error for non-existent token", async () => {
    (prisma.invitation.findFirst as any).mockResolvedValue(null);

    const result = await validateInvitationToken("nonexistent_token");
    expect(result.error).toBe("Invalid or expired invitation token.");
    expect(result.invitation).toBeNull();
  });

  it("returns error for already accepted invitation", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "accepted",
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: new Date(),
      invitedById: "user_1",
      acceptedById: "user_2",
      createdAt: new Date(),
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);

    const result = await validateInvitationToken("some_token");
    expect(result.error).toContain("accepted");
  });

  it("marks expired invitation as expired", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date(Date.now() - 86400000), // 1 day ago
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);
    (prisma.invitation.update as any).mockResolvedValue(mockInvitation);

    const result = await validateInvitationToken("some_token");
    expect(result.error).toBe("Invitation has expired.");
    expect(prisma.invitation.update).toHaveBeenCalledWith({
      where: { id: "inv_1" },
      data: { status: "expired" },
    });
  });
});

describe("Invitation Service - acceptInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts invitation and creates team member", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: "team_1",
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.findUnique as any).mockResolvedValue(mockInvitation);
    (prisma.teamMember.findFirst as any).mockResolvedValue(null);
    (prisma.teamMember.create as any).mockResolvedValue({
      id: "tm_1",
      teamId: "team_1",
      userId: "user_2",
      businessId: "biz_1",
      role: "team_member",
      isActive: true,
    });

    // Mock the transaction
    (prisma.$transaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        invitation: {
          update: vi.fn().mockResolvedValue({ ...mockInvitation, status: "accepted", acceptedAt: new Date(), acceptedById: "user_2" }),
        },
        teamMember: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "tm_1", teamId: "team_1", userId: "user_2", businessId: "biz_1", role: "team_member", isActive: true }),
        },
        businessMember: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "bm_1", businessId: "biz_1", userId: "user_2", role: "member" }),
        },
      };
      return cb(tx);
    });

    const result = await acceptInvitation({
      invitationId: "inv_1",
      acceptedById: "user_2",
    });

    expect(result.error).toBeUndefined();
    expect(result.invitation.status).toBe("accepted");
    expect(result.teamMemberId).toBe("tm_1");
  });

  it("returns error for non-existent invitation", async () => {
    (prisma.invitation.findUnique as any).mockResolvedValue(null);

    const result = await acceptInvitation({
      invitationId: "nonexistent",
      acceptedById: "user_2",
    });

    expect(result.error).toBe("Invitation not found.");
  });
});

describe("Invitation Service - revokeInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("revokes a pending invitation", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);
    (prisma.invitation.update as any).mockResolvedValue(mockInvitation);

    const result = await revokeInvitation("inv_1", "biz_1");
    expect(result.success).toBe(true);
  });

  it("returns error for non-pending invitation", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      status: "accepted",
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);

    const result = await revokeInvitation("inv_1", "biz_1");
    expect(result.success).toBe(false);
    expect(result.error).toContain("accepted");
  });
});

describe("Invitation Service - resendInvitation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resends invitation with new token and extended expiry", async () => {
    const mockInvitation = {
      id: "inv_1",
      businessId: "biz_1",
      teamId: null,
      email: "test@example.com",
      role: "team_member",
      status: "pending",
      expiresAt: new Date(Date.now() - 86400000), // expired
      acceptedAt: null,
      invitedById: "user_1",
      acceptedById: null,
      createdAt: new Date(),
    };

    (prisma.invitation.findFirst as any).mockResolvedValue(mockInvitation);
    (prisma.invitation.update as any).mockResolvedValue({
      ...mockInvitation,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 86400000),
    });

    const result = await resendInvitation("inv_1", "biz_1");
    expect(result.error).toBeUndefined();
    expect(result.token).toBeDefined();
    expect(result.invitation.status).toBe("pending");
  });
});

describe("Invitation Service - expireInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("expires pending invitations past their expiry date", async () => {
    (prisma.invitation.updateMany as any).mockResolvedValue({ count: 3 });

    const count = await expireInvitations("biz_1");
    expect(count).toBe(3);
    expect(prisma.invitation.updateMany).toHaveBeenCalledWith({
      where: {
        status: "pending",
        expiresAt: { lt: expect.any(Date) },
        businessId: "biz_1",
      },
      data: { status: "expired" },
    });
  });
});
