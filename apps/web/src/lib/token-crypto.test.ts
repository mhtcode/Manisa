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
    expect(() => decryptSecret(`${encrypted.slice(0, -1)}x`, key)).toThrow();
  });
});
