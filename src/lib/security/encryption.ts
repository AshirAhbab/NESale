import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const TAG_LENGTH = 16;

/**
 * Derives a 32-byte encryption key from environment variable or deterministic fallback.
 */
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "nesale-default-encryption-key-32b";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts sensitive merchant API tokens, SMTP passwords, or webhook URLs using AES-256-GCM.
 * Format: iv_hex:auth_tag_hex:cipher_hex
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an encrypted credential string using AES-256-GCM and verifies the authentication tag.
 */
export function decryptSecret(encryptedPayload: string): string {
  if (!encryptedPayload) return "";
  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      // In case it was stored unencrypted in legacy development
      return encryptedPayload;
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const cipherText = Buffer.from(cipherHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    console.warn("[Encryption] Decryption failed or corrupted payload:", error);
    return "";
  }
}

/**
 * Masks a secret string for safe display on the merchant UI (e.g. "https://hooks.slack.com/services/...****" or "sk_live_...1234")
 */
export function maskSecret(secret: string): string {
  if (!secret) return "••••••••";
  const trimmed = secret.trim();

  // If it's a URL (like Slack/Discord webhook)
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1] || "";
      const maskedPart = lastPart.length > 4 ? `••••${lastPart.slice(-4)}` : "••••";
      return `${url.origin}/${pathParts.slice(0, -1).join("/")}/${maskedPart}`;
    } catch {
      return `${trimmed.slice(0, 12)}••••••••`;
    }
  }

  // If it's an API key / token (e.g. pat-na1-..., xoxb-..., sk_live_...)
  if (trimmed.length <= 8) {
    return "••••••••";
  }

  const prefix = trimmed.slice(0, Math.min(6, Math.floor(trimmed.length / 3)));
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}
