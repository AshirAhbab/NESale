import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyStripeSignature } from "@/lib/billing/stripe";
import { PlanCode } from "@/lib/billing/entitlements";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") || "";
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    // In production with webhook secret, verify cryptographic signature
    if (webhookSecret) {
      const isValid = verifyStripeSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("[Stripe Webhook] Invalid signature rejected.");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);
    const eventType = event.type;
    const dataObject = event.data?.object;

    console.log(`[Stripe Webhook] Processing event: ${eventType} (${event.id})`);

    switch (eventType) {
      case "checkout.session.completed": {
        const businessId = dataObject.client_reference_id || dataObject.metadata?.businessId;
        const planCode = (dataObject.metadata?.planCode || "starter") as PlanCode;
        const customerId = dataObject.customer;
        const subscriptionId = dataObject.subscription;

        if (businessId) {
          const now = new Date();
          const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

          await prisma.subscription.upsert({
            where: { id: `sub_${businessId}` },
            update: {
              planCode,
              status: "active",
              externalCustomerId: customerId ? String(customerId) : null,
              externalSubscriptionId: subscriptionId ? String(subscriptionId) : null,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              updatedAt: now,
            },
            create: {
              id: `sub_${businessId}`,
              businessId,
              planCode,
              status: "active",
              externalCustomerId: customerId ? String(customerId) : null,
              externalSubscriptionId: subscriptionId ? String(subscriptionId) : null,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
          });
          console.log(`[Stripe Webhook] Business ${businessId} upgraded to ${planCode}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscriptionId = dataObject.id;
        const status = dataObject.status; // active, past_due, canceled, trialing
        const currentPeriodEnd = dataObject.current_period_end
          ? new Date(dataObject.current_period_end * 1000)
          : null;

        const sub = await prisma.subscription.findFirst({
          where: { externalSubscriptionId: subscriptionId },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: status === "active" ? "active" : status === "past_due" ? "past_due" : "canceled",
              currentPeriodEnd,
              updatedAt: new Date(),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscriptionId = dataObject.id;
        const sub = await prisma.subscription.findFirst({
          where: { externalSubscriptionId: subscriptionId },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              planCode: "free",
              status: "canceled",
              updatedAt: new Date(),
            },
          });
          console.log(`[Stripe Webhook] Subscription ${subscriptionId} cancelled -> reverted to Free tier.`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const customerId = dataObject.customer;
        const sub = await prisma.subscription.findFirst({
          where: { externalCustomerId: String(customerId) },
        });

        if (sub) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "past_due", updatedAt: new Date() },
          });
          console.warn(`[Stripe Webhook] Payment failed for customer ${customerId}`);
        }
        break;
      }

      default:
        // Unhandled event types acknowledged with 200 OK
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[Stripe Webhook Handler] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal webhook processing error" },
      { status: 500 }
    );
  }
}
