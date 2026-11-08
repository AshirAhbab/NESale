/**
 * NESALE Invitation Service
 * Handles secure invitation token generation, verification, and lifecycle management.
 */

import { prisma } from "@/lib/db/prisma";
import { createHash, randomBytes } from "crypto";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";
export type InvitationRole = "team_admin" | "team_manager" | "team_member";

export interface InvitationData {
  id: string;
  businessId: string;
  teamId?: string | null;
  email: string;
  role: InvitationRole;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt?: Date | null;
  invitedById: string;
  acceptedById?: string | null;
  createdAt: Date;
}

const INVITATION_TOKEN_BYTES = 32;
const DEFAULT_INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a high-entropy, single-use invitation token.
 * Returns both the raw token (for the email link) and its hash (for storage).
 */
export function generateInvitationToken(): {
  token: string;
  tokenHash: string;
} {
  const token = randomBytes(INVITATION_TOKEN_BYTES).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/**
 * Compute default expiry (7 days from now).
 */
export function defaultExpiry(): Date {
  return new Date(Date.now() + DEFAULT_INVITATION_EXPIRY_MS);
}

/**
 * Create a pending invitation.
 * Returns the invitation record and the raw token (to be sent via email).
 */
export async function createInvitation(input: {
  businessId: string;
  email: string;
  teamId?: string | null;
  role?: InvitationRole;
  invitedById: string;
  expiresInMs?: number;
}): Promise<{ invitation: InvitationData; token: string }> {
  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = new Date(
    Date.now() + (input.expiresInMs ?? DEFAULT_INVITATION_EXPIRY_MS)
  );

  const normalizedEmail = input.email.toLowerCase();
  const teamId = input.teamId ?? null;

  // Reuse an existing invitation row for the same email + team. This avoids
  // violating the @@unique([email, teamId]) constraint when re-inviting an
  // email that was previously revoked, expired or accepted.
  const existing = await prisma.invitation.findFirst({
    where: { businessId: input.businessId, email: normalizedEmail, teamId },
    orderBy: { createdAt: "desc" },
  });

  const invitation = existing
    ? await prisma.invitation.update({
        where: { id: existing.id },
        data: {
          teamId: teamId ?? undefined,
          tokenHash,
          role: input.role ?? "team_member",
          status: "pending",
          expiresAt,
          acceptedAt: null,
          acceptedById: null,
          invitedById: input.invitedById,
        },
      })
    : await prisma.invitation.create({
        data: {
          businessId: input.businessId,
          teamId: teamId ?? undefined,
          email: normalizedEmail,
          tokenHash,
          role: input.role ?? "team_member",
          status: "pending",
          expiresAt,
          invitedById: input.invitedById,
        },
      });

  return {
    invitation: {
      id: invitation.id,
      businessId: invitation.businessId,
      teamId: invitation.teamId ?? null,
      email: invitation.email,
      role: invitation.role as InvitationRole,
      status: invitation.status as InvitationStatus,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt ?? null,
      invitedById: invitation.invitedById,
      acceptedById: invitation.acceptedById ?? null,
      createdAt: invitation.createdAt,
    },
    token,
  };
}

/**
 * Validate an invitation token and return the invitation if valid.
 * Checks: token hash match, status = pending, not expired.
 */
export async function validateInvitationToken(token: string): Promise<{
  invitation: InvitationData;
  error?: string;
}> {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const invitation = await prisma.invitation.findFirst({
    where: { tokenHash },
  });

  if (!invitation) {
    return { invitation: null as any, error: "Invalid or expired invitation token." };
  }

  if (invitation.status !== "pending") {
    return {
      invitation: null as any,
      error: `Invitation has already been ${invitation.status}.`,
    };
  }

  if (invitation.expiresAt < new Date()) {
    // Mark as expired
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    return { invitation: null as any, error: "Invitation has expired." };
  }

  return {
    invitation: {
      id: invitation.id,
      businessId: invitation.businessId,
      teamId: invitation.teamId ?? null,
      email: invitation.email,
      role: invitation.role as InvitationRole,
      status: invitation.status as InvitationStatus,
      expiresAt: invitation.expiresAt,
      acceptedAt: invitation.acceptedAt ?? null,
      invitedById: invitation.invitedById,
      acceptedById: invitation.acceptedById ?? null,
      createdAt: invitation.createdAt,
    },
  };
}

/**
 * Accept an invitation: mark it accepted, record who accepted, and create the
 * TeamMember record if a team is specified.
 * Returns the created TeamMember or null if no team.
 */
export async function acceptInvitation(input: {
  invitationId: string;
  acceptedById: string;
}): Promise<{
  invitation: InvitationData;
  teamMemberId?: string | null;
  error?: string;
}> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: input.invitationId },
  });

  if (!invitation) {
    return { invitation: null as any, error: "Invitation not found." };
  }

  if (invitation.status !== "pending") {
    return {
      invitation: null as any,
      error: `Invitation has already been ${invitation.status}.`,
    };
  }

  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "expired" },
    });
    return { invitation: null as any, error: "Invitation has expired." };
  }

  let teamMemberId: string | null = null;

  const result = await prisma.$transaction(async (tx) => {
    // Mark invitation as accepted
    const updated = await tx.invitation.update({
      where: { id: input.invitationId },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedById: input.acceptedById,
      },
    });

    // Create TeamMember if team is specified
    if (updated.teamId) {
      const existingMember = await tx.teamMember.findFirst({
        where: {
          teamId: updated.teamId,
          userId: input.acceptedById,
        },
      });

      if (!existingMember) {
        const member = await tx.teamMember.create({
          data: {
            teamId: updated.teamId,
            userId: input.acceptedById,
            businessId: updated.businessId,
            role: updated.role,
            isActive: true,
          },
        });
        teamMemberId = member.id;
      } else {
        // Already a member, just update role if different
        if (existingMember.role !== updated.role) {
          await tx.teamMember.update({
            where: { id: existingMember.id },
            data: { role: updated.role },
          });
        }
        teamMemberId = existingMember.id;
      }
    }

    // Ensure the invitee is a member of the business, otherwise they cannot
    // resolve the tenant or access the dashboard after accepting.
    const existingBusinessMember = await tx.businessMember.findFirst({
      where: {
        businessId: updated.businessId,
        userId: input.acceptedById,
      },
    });
    if (!existingBusinessMember) {
      await tx.businessMember.create({
        data: {
          businessId: updated.businessId,
          userId: input.acceptedById,
          role: updated.role === "team_admin" ? "admin" : "member",
        },
      });
    }

    return { invitation: updated, teamMemberId };
  });

  return {
    invitation: {
      id: result.invitation.id,
      businessId: result.invitation.businessId,
      teamId: result.invitation.teamId ?? null,
      email: result.invitation.email,
      role: result.invitation.role as InvitationRole,
      status: result.invitation.status as InvitationStatus,
      expiresAt: result.invitation.expiresAt,
      acceptedAt: result.invitation.acceptedAt ?? null,
      invitedById: result.invitation.invitedById,
      acceptedById: result.invitation.acceptedById ?? null,
      createdAt: result.invitation.createdAt,
    },
    teamMemberId,
  };
}

/**
 * Revoke an invitation (mark as revoked).
 */
export async function revokeInvitation(
  invitationId: string,
  businessId: string
): Promise<{ success: boolean; error?: string }> {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, businessId },
  });

  if (!invitation) {
    return { success: false, error: "Invitation not found." };
  }

  if (invitation.status !== "pending") {
    return {
      success: false,
      error: `Cannot revoke a ${invitation.status} invitation.`,
    };
  }

  await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "revoked" },
  });

  return { success: true };
}

/**
 * Resend an invitation: generate a new token and extend expiry.
 */
export async function resendInvitation(
  invitationId: string,
  businessId: string
): Promise<{ token: string; invitation: InvitationData; error?: string }> {
  const invitation = await prisma.invitation.findFirst({
    where: { id: invitationId, businessId },
  });

  if (!invitation) {
    return { error: "Invitation not found.", token: "", invitation: null as any };
  }

  const { token, tokenHash } = generateInvitationToken();
  const expiresAt = defaultExpiry();

  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      tokenHash,
      status: "pending",
      expiresAt,
      acceptedAt: null,
      acceptedById: null,
    },
  });

  return {
    token,
    invitation: {
      id: updated.id,
      businessId: updated.businessId,
      teamId: updated.teamId ?? null,
      email: updated.email,
      role: updated.role as InvitationRole,
      status: updated.status as InvitationStatus,
      expiresAt: updated.expiresAt,
      acceptedAt: updated.acceptedAt ?? null,
      invitedById: updated.invitedById,
      acceptedById: updated.acceptedById ?? null,
      createdAt: updated.createdAt,
    },
  };
}

/**
 * List invitations for a business, optionally filtered by status and team.
 */
export async function listInvitations(input: {
  businessId: string;
  status?: InvitationStatus;
  teamId?: string;
}): Promise<InvitationData[]> {
  const invitations = await prisma.invitation.findMany({
    where: {
      businessId: input.businessId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.teamId ? { teamId: input.teamId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map((i) => ({
    id: i.id,
    businessId: i.businessId,
    teamId: i.teamId ?? null,
    email: i.email,
    role: i.role as InvitationRole,
    status: i.status as InvitationStatus,
    expiresAt: i.expiresAt,
    acceptedAt: i.acceptedAt ?? null,
    invitedById: i.invitedById,
    acceptedById: i.acceptedById ?? null,
    createdAt: i.createdAt,
  }));
}

/**
 * Mark all expired pending invitations as expired.
 */
export async function expireInvitations(businessId?: string): Promise<number> {
  const result = await prisma.invitation.updateMany({
    where: {
      status: "pending",
      expiresAt: { lt: new Date() },
      ...(businessId ? { businessId } : {}),
    },
    data: { status: "expired" },
  });
  return result.count;
}
