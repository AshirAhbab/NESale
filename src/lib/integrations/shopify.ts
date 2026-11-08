import crypto from "crypto";

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  variants: {
    id: string;
    title: string;
    price: string;
    sku: string;
    inventory_quantity: number;
    available: boolean;
  }[];
}

export class ShopifyProvider {
  /**
   * Generates a 1-click direct checkout / cart permalink.
   * Format: https://{shop}.myshopify.com/cart/{variantId}:{quantity}
   */
  public static generateCartUrl(
    shopDomain: string,
    variantId: string,
    quantity: number = 1
  ): string {
    const cleanShop = shopDomain.replace(/https?:\/\//, "").replace(/\/$/, "");
    const cleanVariant = variantId.replace(/^gid:\/\/shopify\/ProductVariant\//, "");
    return `https://${cleanShop}/cart/${cleanVariant}:${quantity}`;
  }

  /**
   * Generates Shopify OAuth start URL with security state token.
   */
  public static buildOAuthUrl(
    shop: string,
    clientId: string,
    redirectUri: string,
    state: string
  ): string {
    const cleanShop = shop.replace(".myshopify.com", "");
    const scopes = "read_products,read_inventory,read_orders";
    return `https://${cleanShop}.myshopify.com/admin/oauth/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&state=${state}`;
  }

  /**
   * Verifies Shopify Webhook HMAC signature.
   */
  public static verifyWebhookHmac(
    rawBody: string,
    hmacHeader: string,
    apiSecret: string
  ): boolean {
    if (!hmacHeader || !apiSecret) return false;
    const digest = crypto
      .createHmac("sha256", apiSecret)
      .update(rawBody, "utf8")
      .digest("base64");
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
  }
}
