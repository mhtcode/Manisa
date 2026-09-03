import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey(secret: string) {
  if (secret.length < 32) throw new Error("The integration encryption key must be at least 32 characters.");
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(value: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, secret: string) {
  const [version, ivValue, tagValue, encryptedValue, extra] = payload.split(".");
  if (version !== VERSION || !ivValue || !tagValue || !encryptedValue || extra) throw new Error("Invalid encrypted secret.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
