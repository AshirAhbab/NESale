import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret, maskSecret } from "./encryption";

describe("Credential Encryption Engine (AES-256-GCM)", () => {
  it("encrypts and decrypts API keys and secrets correctly", () => {
    const rawSecret = "pat-na1-893f41-abcdef123456789";
    const encrypted = encryptSecret(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.split(":")).toHaveLength(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(rawSecret);
  });

  it("encrypts and decrypts webhook URLs correctly", () => {
    const rawUrl = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX";
    const encrypted = encryptSecret(rawUrl);
    const decrypted = decryptSecret(encrypted);

    expect(decrypted).toBe(rawUrl);
  });

  it("fails gracefully and returns empty string if payload is tampered", () => {
    const rawSecret = "super-secret-smtp-password";
    const encrypted = encryptSecret(rawSecret);
    const parts = encrypted.split(":");
    // Tamper with the ciphertext
    parts[2] = parts[2].slice(0, -2) + "ff";
    const tampered = parts.join(":");

    const decrypted = decryptSecret(tampered);
    expect(decrypted).toBe("");
  });

  it("masks API keys and webhook URLs for safe frontend rendering", () => {
    const slackUrl = "https://hooks.slack.com/services/T123/B456/SecretToken1234";
    const maskedUrl = maskSecret(slackUrl);
    expect(maskedUrl).toContain("••••");
    expect(maskedUrl).not.toContain("SecretToken1234");

    const apiKey = "pat-na1-1234567890abcdef";
    const maskedKey = maskSecret(apiKey);
    expect(maskedKey).toContain("••••");
    expect(maskedKey.startsWith("pat-na")).toBe(true);
  });
});
