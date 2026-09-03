import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./token-crypto";

const key = "test-only-key-with-more-than-thirty-two-characters";

describe("integration token encryption", () => {
  it("round-trips without storing plaintext", () => {
    const encrypted = encryptSecret("sensitive-token", key);
    expect(encrypted).not.toContain("sensitive-token");
    expect(decryptSecret(encrypted, key)).toBe("sensitive-token");
  });

  it("rejects tampered ciphertext", () => {
    const encrypted = encryptSecret("sensitive-token", key);
    const parts = encrypted.split(".");
    const ciphertext = Buffer.from(parts[3], "base64url");
    ciphertext[0] ^= 1;
    parts[3] = ciphertext.toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
  });
});
