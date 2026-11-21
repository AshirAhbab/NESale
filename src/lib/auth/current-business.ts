import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";

/**
 * Resolves the business context for a dashboard request with strict tenant isolation.
 * Authorizes that the signed-in user belongs to the requested business.
 */
export async function resolveCurrentBusiness(requestedBizId?: string | null) {
  let currentBiz: any = null;
  let authUser: any = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authUser = user;

    if (authUser?.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: authUser.email.toLowerCase() },
        include: {
          memberships: {
            include: { business: true },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      if (dbUser && dbUser.memberships.length > 0) {
        if (requestedBizId) {
          // Verify user is a member of the requested business
          const match = dbUser.memberships.find((m) => m.businessId === requestedBizId);
          if (match && match.business) {
            currentBiz = match.business;
          } else {
            // Unauthorized tenant access attempt
            return null;
          }
        } else {
          currentBiz = dbUser.memberships[0].business;
        }
      }
    }
  } catch (err) {
    console.warn("[Business Context] Auth check notice:", err);
  }

  // Safe Non-Production Fallbacks (Dev / Testing Only)
  if (!currentBiz && process.env.NODE_ENV !== "production") {
    if (requestedBizId) {
      currentBiz = await prisma.business.findUnique({ where: { id: requestedBizId } });
    }

    if (!currentBiz) {
      currentBiz = await prisma.business.findFirst({ orderBy: { createdAt: "desc" } });
    }

    if (!currentBiz) {
      await ensureSeedData();
      currentBiz = await prisma.business.findFirst();
    }
  }

  return currentBiz;
}

export function getBusinessTimezone(settings: unknown): string {
  const raw = (settings as Record<string, any>) || {};
  const tz = raw.timezone || raw.timeZone;
  return typeof tz === "string" && tz.trim() ? tz : "UTC";
}
