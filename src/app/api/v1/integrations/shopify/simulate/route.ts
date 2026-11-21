import { NextRequest, NextResponse } from "next/server";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

export async function POST(req: NextRequest) {
  // Simulator is strictly forbidden in production environments
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: { message: "Webhook simulator is disabled in production." } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { type = "order", businessId } = body;

    const tenant = await resolveCachedTenant(req, businessId);
    if (!tenant?.business?.id) {
      return NextResponse.json(
        { error: { message: "Unauthorized: Active merchant session required for simulation." } },
        { status: 401 }
      );
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const webhookUrl = `${protocol}://${host}/api/v1/integrations/shopify/webhooks`;

    let topic = "orders/create";
    let mockPayload: Record<string, any> = {};

    if (type === "order") {
      topic = "orders/create";
      mockPayload = {
        id: Math.floor(100000 + Math.random() * 900000),
        total_price: "129.00",
        currency: "USD",
        line_items: [
          {
            title: "TrailPro Waterproof Backpack 28L",
            price: "129.00",
            quantity: 1,
            sku: "TP-28L-BLK",
          },
        ],
      };
    } else if (type === "inventory") {
      topic = "inventory_levels/update";
      mockPayload = {
        inventory_item_id: 8493021,
        available: Math.floor(20 + Math.random() * 100),
      };
    } else if (type === "product") {
      topic = "products/update";
      mockPayload = {
        id: 7654321,
        title: "Alpine Pro Expedition Pack 35L",
        handle: "alpine-pro-expedition-pack-35l",
        product_type: "Backpacks & Gear",
        variants: [
          {
            id: 998877,
            title: "Obsidian Black / 35L",
            price: "149.00",
            sku: "APP-35L-OBS",
            inventory_quantity: 88,
            available: true,
          },
        ],
      };
    }

    // Call the webhook route internally
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shopify-topic": topic,
        "x-shopify-shop-domain": "nordikgear.myshopify.com",
      },
      body: JSON.stringify(mockPayload),
    });

    const result = await webhookRes.json();

    return NextResponse.json({
      status: "success",
      simulatedType: type,
      topic,
      webhookResponse: result,
    });
  } catch (error: any) {
    console.error("[Webhook Simulator API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Simulation failed." } },
      { status: 500 }
    );
  }
}
