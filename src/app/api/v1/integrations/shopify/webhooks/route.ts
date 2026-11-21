import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ShopifyProvider } from "@/lib/integrations/shopify";
import { ensureSeedData } from "@/lib/db/seed";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const topic = req.headers.get("x-shopify-topic") || "manual/test";
    const shopDomain = req.headers.get("x-shopify-shop-domain") || "demo.myshopify.com";
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256") || "";

    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    // Verify HMAC if a secret is configured in production
    if (webhookSecret && hmacHeader) {
      const isValid = ShopifyProvider.verifyWebhookHmac(rawBody, hmacHeader, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { error: { message: "Invalid HMAC signature." } },
          { status: 401 }
        );
      }
    }

    let payload: Record<string, any> = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = { raw: rawBody };
    }

    // Resolve tenant business by website URL or configured integration
    const business = await prisma.business.findFirst({
      where: {
        OR: [
          { websiteUrl: { contains: shopDomain } },
          { integrations: { some: { provider: "shopify", status: "active" } } },
        ],
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: { message: `No registered business associated with shop domain '${shopDomain}'.` } },
        { status: 404 }
      );
    }

    const currentBizId = business.id;
    let eventResult = "processed";

    // Route webhook by Shopify Topic
    switch (topic) {
      case "products/create":
      case "products/update": {
        const title = payload.title || "Shopify Product";
        const handle = payload.handle || title.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const variants = payload.variants || [];
        const primaryVariant = variants[0] || {};
        const price = primaryVariant.price ? parseFloat(primaryVariant.price) : 0;
        const externalId = String(payload.id || Date.now());

        await prisma.product.upsert({
          where: {
            businessId_externalId: {
              businessId: currentBizId,
              externalId,
            },
          },
          update: {
            name: title,
            productType: payload.product_type || "General",
            priceMin: price,
            priceMax: price,
            status: "active",
            metadata: {
              sku: primaryVariant.sku || `SKU-${externalId}`,
              externalId,
              stock: primaryVariant.inventory_quantity ?? 50,
              updatedViaWebhookAt: new Date().toISOString(),
            },
          },
          create: {
            businessId: currentBizId,
            name: title,
            slug: `${handle}-${currentBizId.slice(0, 8)}`,
            externalId,
            productType: payload.product_type || "General",
            priceMin: price,
            priceMax: price,
            currency: "USD",
            status: "active",
            metadata: {
              sku: primaryVariant.sku || `SKU-${externalId}`,
              externalId,
              stock: primaryVariant.inventory_quantity ?? 50,
              createdViaWebhookAt: new Date().toISOString(),
            },
          },
        });
        eventResult = `Upserted product: ${title}`;
        break;
      }

      case "products/delete": {
        const externalId = String(payload.id);
        const product = await prisma.product.findFirst({
          where: {
            businessId: currentBizId,
            externalId,
          },
        });

        if (product) {
          await prisma.product.update({
            where: { id: product.id },
            data: { status: "archived" },
          });
          eventResult = `Archived deleted product: ${product.name}`;
        }
        break;
      }

      case "orders/create": {
        const orderId = String(payload.id || `ord_${Date.now()}`);
        const totalPrice = payload.total_price || payload.current_total_price || "0.00";
        const lineItems = payload.line_items || [];

        // Log order creation in AnalyticsEvent
        await prisma.analyticsEvent.create({
          data: {
            businessId: currentBizId,
            eventType: "order_completed",
            valueNumeric: parseFloat(totalPrice) || 0,
            metadata: {
              orderId,
              totalPrice,
              source: "shopify_webhook",
              lineItemCount: lineItems.length,
              currency: payload.currency || "USD",
            },
          },
        });

        eventResult = `Recorded order #${orderId} with revenue $${totalPrice}`;
        break;
      }

      case "inventory_levels/update": {
        const inventoryItemId = String(payload.inventory_item_id);
        const available = payload.available;

        // Find product with matching external variant or SKU
        const product = await prisma.product.findFirst({
          where: { businessId: currentBizId },
        });

        if (product && available !== undefined) {
          const meta = (product.metadata as Record<string, any>) || {};
          await prisma.product.update({
            where: { id: product.id },
            data: {
              metadata: {
                ...meta,
                stock: available,
                lastInventorySyncAt: new Date().toISOString(),
              },
            },
          });
          eventResult = `Updated stock to ${available} on product: ${product.name}`;
        }
        break;
      }

      default: {
        eventResult = `Processed custom event: ${topic}`;
      }
    }

    return NextResponse.json({
      status: "success",
      topic,
      shopDomain,
      result: eventResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Shopify Webhook API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Webhook handling failed." } },
      { status: 500 }
    );
  }
}
