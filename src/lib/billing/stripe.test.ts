import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { getPlanPriceInCents, verifyStripeSignature } from "./stripe";

describe("Stripe Billing Integration Tests", () => {
  it("returns correct price in cents for each plan code", () => {
    expect(getPlanPriceInCents("free")).toBe(0);
    expect(getPlanPriceInCents("starter")).toBe(1900);
    expect(getPlanPriceInCents("growth")).toBe(3900);
    expect(getPlanPriceInCents("pro")).toBe(9900);
  });

  describe("verifyStripeSignature", () => {
    const secret = "whsec_test_secret_123456789";
    const rawBody = JSON.stringify({ id: "evt_test_123", type: "checkout.session.completed" });

    function createValidHeader(body: string, signingSecret: string, timestampOffsetSeconds = 0): string {
      const timestamp = Math.floor(Date.now() / 1000) + timestampOffsetSeconds;
      const payload = `${timestamp}.${body}`;
      const signature = crypto.createHmac("sha256", signingSecret).update(payload).digest("hex");
      return `t=${timestamp},v1=${signature}`;
    }

    it("verifies a valid Stripe webhook signature successfully", () => {
      const header = createValidHeader(rawBody, secret);
      const isValid = verifyStripeSignature(rawBody, header, secret);
      expect(isValid).toBe(true);
    });

    it("rejects when raw body has been tampered with", () => {
      const header = createValidHeader(rawBody, secret);
      const tamperedBody = JSON.stringify({ id: "evt_test_tampered" });
      const isValid = verifyStripeSignature(tamperedBody, header, secret);
      expect(isValid).toBe(false);
    });

    it("rejects when signing secret is incorrect", () => {
      const header = createValidHeader(rawBody, secret);
      const isValid = verifyStripeSignature(rawBody, header, "whsec_wrong_secret");
      expect(isValid).toBe(false);
    });

    it("rejects replay attacks where timestamp is older than 5 minutes (300 seconds)", () => {
      const header = createValidHeader(rawBody, secret, -305); // 305 seconds in the past
      const isValid = verifyStripeSignature(rawBody, header, secret);
      expect(isValid).toBe(false);
    });

    it("rejects missing or malformed signature header", () => {
      expect(verifyStripeSignature(rawBody, "", secret)).toBe(false);
      expect(verifyStripeSignature(rawBody, "invalid-header", secret)).toBe(false);
      expect(verifyStripeSignature(rawBody, "t=12345", secret)).toBe(false);
      expect(verifyStripeSignature(rawBody, "v1=12345", secret)).toBe(false);
    });
  });
});
