import { NextRequest, NextResponse } from "next/server";
import { StorefrontSync } from "@/lib/integrations/storefrontSync";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

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

    const tenant = await resolveCachedTenant(req, businessId);
    if (!tenant?.business?.id) {
      return NextResponse.json(
        { error: { message: "Unauthorized: Active business session required to import catalog." } },
        { status: 401 }
      );
    }

    const biz = tenant.business;

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
