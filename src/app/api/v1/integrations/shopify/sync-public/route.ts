import { NextRequest, NextResponse } from "next/server";
import { StorefrontSync } from "@/lib/integrations/storefrontSync";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { storeUrl, businessId } = body;

    if (!storeUrl || typeof storeUrl !== "string") {
      return NextResponse.json(
        { error: { message: "A valid store URL or domain is required." } },
        { status: 400 }
      );
    }

    let biz: any = null;

    // 1. Resolve business from explicit businessId
    if (businessId) {
      biz = await prisma.business.findUnique({ where: { id: businessId } });
    }

    // 2. Resolve business from authenticated Supabase session
    if (!biz) {
      try {
        const supabase = await createClient();
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (authUser?.email) {
          const dbUser = await prisma.user.findFirst({
            where: { email: authUser.email.toLowerCase() },
            include: { memberships: { include: { business: true }, take: 1 } },
          });

          if (dbUser?.memberships?.[0]?.business) {
            biz = dbUser.memberships[0].business;
          }
        }
      } catch (authErr) {
        console.warn("[sync-public] Auth notice:", authErr);
      }
    }

    // 3. Fallback to most recent business
    if (!biz) {
      biz = await prisma.business.findFirst({ orderBy: { updatedAt: "desc" } });
    }

    if (!biz) {
      await ensureSeedData();
      biz = await prisma.business.findFirst({ orderBy: { updatedAt: "desc" } });
    }

    if (!biz) {
      return NextResponse.json(
        { error: { message: "No active tenant business found." } },
        { status: 400 }
      );
    }

    try {
      // 1. Attempt universal public catalog sync (Shopify JSON, Next.js chunks, or JSON-LD)
      const { products, storeName } = await StorefrontSync.fetchPublicProducts(storeUrl);
      const imported = await StorefrontSync.syncProductsToDatabase(
        biz.id,
        products,
        storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`,
        storeName
      );

      return NextResponse.json({
        status: "success",
        method: "universal_catalog_sync",
        importedCount: imported,
        storeName: storeName || biz.name,
        message: `Successfully imported ${imported} catalog items from ${storeUrl}.`,
      });
    } catch (publicErr: any) {
      console.warn("[Storefront Sync] Catalog fetch failed, reporting error:", publicErr);
      return NextResponse.json(
        {
          status: "error",
          message:
            publicErr.message ||
            "Could not fetch public catalog. Verify the store domain or ensure public access is enabled.",
        },
        { status: 422 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error?.message || "Failed to sync store catalog." } },
      { status: 500 }
    );
  }
}
