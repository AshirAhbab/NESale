import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";

/**
 * Resolves the business context for a dashboard request. Prefers the signed-in
 * user's first membership; falls back to the requested id or the newest
 * business so local/seed environments keep working.
 */
export async function resolveCurrentBusiness(requestedBizId?: string | null) {
  let currentBiz: any = null;

  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser?.email) {
      const dbUser = await prisma.user.findFirst({
        where: { email: authUser.email.toLowerCase() },
        include: {
          memberships: {
            include: { business: true },
            take: 1,
          },
        },
      });

      if (dbUser?.memberships?.[0]?.business) {
        currentBiz = dbUser.memberships[0].business;
      }
    }
  } catch (err) {
    console.warn("[Business Context] Auth check notice:", err);
  }

  if (!currentBiz && requestedBizId) {
    currentBiz = await prisma.business.findUnique({ where: { id: requestedBizId } });
  }

  if (!currentBiz) {
    currentBiz = await prisma.business.findFirst({ orderBy: { createdAt: "desc" } });
  }

  if (!currentBiz) {
    await ensureSeedData();
    currentBiz = await prisma.business.findFirst();
  }

  return currentBiz;
}

export function getBusinessTimezone(settings: unknown): string {
  const raw = (settings as Record<string, any>) || {};
  const tz = raw.timezone || raw.timeZone;
  return typeof tz === "string" && tz.trim() ? tz : "UTC";
}
