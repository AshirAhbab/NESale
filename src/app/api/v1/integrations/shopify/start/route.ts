import { NextRequest, NextResponse } from "next/server";
import { ShopifyProvider } from "@/lib/integrations/shopify";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { shop } = body;

    if (!shop || typeof shop !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid Shopify store identifier is required.",
          },
        },
        { status: 400 }
      );
    }

    const clientId = process.env.SHOPIFY_API_KEY || "sample_shopify_client_id";
    const redirectUri =
      process.env.SHOPIFY_REDIRECT_URI ||
      "http://localhost:3000/api/v1/integrations/shopify/callback";
    const stateToken = crypto.randomBytes(16).toString("hex");

    const authUrl = ShopifyProvider.buildOAuthUrl(
      shop,
      clientId,
      redirectUri,
      stateToken
    );

    return NextResponse.json({
      status: "success",
      authUrl,
      stateToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to initiate Shopify OAuth.",
        },
      },
      { status: 500 }
    );
  }
}
