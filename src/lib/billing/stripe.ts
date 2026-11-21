import crypto from "crypto";
import { getPlanConfig, PlanCode } from "./entitlements";

export interface StripeCheckoutOptions {
  businessId: string;
  userEmail: string;
  planCode: PlanCode;
  appUrl: string;
}

/**
 * Returns unit amount in cents for recurring monthly subscription plans.
 */
export function getPlanPriceInCents(planCode: PlanCode): number {
  switch (planCode) {
    case "starter":
      return 1900; // $19.00
    case "growth":
      return 3900; // $39.00
    case "pro":
      return 9900; // $99.00 base pay-as-you-go retainer
    default:
      return 0;
  }
}

/**
 * Creates a Stripe Checkout Session via Stripe REST API.
 */
export async function createStripeCheckoutSession(opts: StripeCheckoutOptions): Promise<{ url: string; id: string }> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }

  const plan = getPlanConfig(opts.planCode);
  const priceInCents = getPlanPriceInCents(opts.planCode);

  const params = new URLSearchParams();
  params.append("client_reference_id", opts.businessId);
  if (opts.userEmail) {
    params.append("customer_email", opts.userEmail);
  }
  params.append("mode", "subscription");
  params.append("success_url", `${opts.appUrl}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${opts.appUrl}/dashboard/billing?status=cancelled`);
  params.append("metadata[businessId]", opts.businessId);
  params.append("metadata[planCode]", opts.planCode);

  // Line item definition
  params.append("line_items[0][price_data][currency]", "usd");
  params.append("line_items[0][price_data][product_data][name]", `NE_Sale ${plan.name} Plan`);
  params.append("line_items[0][price_data][product_data][description]", plan.description);
  params.append("line_items[0][price_data][unit_amount]", priceInCents.toString());
  params.append("line_items[0][price_data][recurring][interval]", "month");
  params.append("line_items[0][quantity]", "1");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (!res.ok || !data.url) {
    throw new Error(data.error?.message || "Failed to create Stripe Checkout session.");
  }

  return { url: data.url, id: data.id };
}

/**
 * Verifies the Stripe webhook signature header using native HMAC-SHA256.
 */
export function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string): boolean {
  try {
    if (!signatureHeader || !secret) return false;

    // Signature header format: t=1492774577,v1=5257a869e7ecebeda32affa62cd49231...
    const parts = signatureHeader.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) return false;

    const timestamp = timestampPart.substring(2);
    const expectedSignature = signaturePart.substring(3);

    // Prevent replay attacks (5 minute threshold)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - parseInt(timestamp, 10)) > 300) {
      return false;
    }

    const payload = `${timestamp}.${rawBody}`;
    const computedSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(expectedSignature));
  } catch {
    return false;
  }
}
