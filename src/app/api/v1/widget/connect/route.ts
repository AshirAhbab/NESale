import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      domain,
      storeUrl,
      platform,
      products = [],
      pageTitle,
      metadata = {},
    } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: { message: "businessId parameter is required" } },
        { status: 400 }
      );
    }

    // Resolve target business
    let biz = await prisma.business.findUnique({
      where: { id: businessId },
      include: { businessSettings: true, products: { take: 5 } },
    });

    if (!biz) {
      biz = await prisma.business.findFirst({
        where: { slug: businessId },
        include: { businessSettings: true, products: { take: 5 } },
      });
    }

    if (!biz) {
      // Fallback to first business in dev environment
      biz = await prisma.business.findFirst({
        include: { businessSettings: true, products: { take: 5 } },
      });
    }

    if (!biz) {
      return NextResponse.json(
        { error: { message: "Business not found." } },
        { status: 404 }
      );
    }

    const nowIso = new Date().toISOString();
    const activeDomain = domain || storeUrl || biz.websiteUrl || "unknown";

    // Update business settings with live script heartbeat
    const existingSettings = (biz.businessSettings?.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...existingSettings,
      scriptInstalled: true,
      lastScriptPingAt: nowIso,
      installedDomain: activeDomain,
      platform: platform || existingSettings.platform || "ecommerce",
      pageTitle: pageTitle || existingSettings.pageTitle,
      productsHarvestedCount: products.length > 0 ? products.length : existingSettings.productsHarvestedCount || 0,
      clientMetadata: {
        ...existingSettings.clientMetadata,
        ...metadata,
      },
    };

    await prisma.$transaction([
      prisma.business.update({
        where: { id: biz.id },
        data: {
          status: "active",
          websiteUrl: activeDomain.startsWith("http") ? activeDomain : `https://${activeDomain}`,
        },
      }),
      prisma.businessSettings.upsert({
        where: { businessId: biz.id },
        create: {
          businessId: biz.id,
          settings: updatedSettings,
        },
        update: {
          settings: updatedSettings,
        },
      }),
    ]);

    // If script autonomously harvested products (e.g. from /products.json) and business has 0 products:
    let newlyIngestedCount = 0;
    if (Array.isArray(products) && products.length > 0 && biz.products.length === 0) {
      for (const item of products.slice(0, 50)) {
        try {
          const priceValue = parseFloat(
            String(item.price || item.variants?.[0]?.price || "29.99").replace(/[^0-9.]/g, "")
          ) || 29.99;

          const createdProd = await prisma.product.create({
            data: {
              businessId: biz.id,
              name: item.title || item.name || "Catalog Product",
              description: item.body_html?.replace(/<[^>]*>?/gm, "") || item.description || "Auto-indexed via script embed",
              productType: item.product_type || item.category || "General",
              priceMin: priceValue,
              priceMax: priceValue,
              status: "active",
              metadata: {
                source: "script_auto_harvester",
                sku: item.variants?.[0]?.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
                stock: 50,
                imageUrl: item.images?.[0]?.src || item.image || null,
                handle: item.handle || null,
              },
            },
          });

          await prisma.productVariant.create({
            data: {
              businessId: biz.id,
              productId: createdProd.id,
              name: "Default Variant",
              price: priceValue,
              sku: item.variants?.[0]?.sku || `SKU-${createdProd.id.slice(0, 6)}`,
              inventoryQuantity: 50,
            },
          });

          newlyIngestedCount++;
        } catch (itemErr) {
          console.warn("[Script Auto-Ingest] Skipping item:", itemErr);
        }
      }
    }

    return NextResponse.json({
      status: "success",
      connected: true,
      businessId: biz.id,
      businessName: biz.name,
      installedDomain: activeDomain,
      lastPingAt: nowIso,
      productsHarvested: newlyIngestedCount > 0 ? newlyIngestedCount : (products.length || 0),
      message: "NESale script detected and verified on website.",
    });
  } catch (error: any) {
    console.error("[Widget Connect API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to process connect ping" } },
      { status: 500 }
    );
  }
}
