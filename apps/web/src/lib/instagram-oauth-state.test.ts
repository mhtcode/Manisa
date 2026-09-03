import { describe, expect, it } from "vitest";
import { createInstagramOAuthState, verifyInstagramOAuthState } from "./instagram-oauth-state";

const secret = "test-auth-secret-that-is-long-enough-for-hmac";

describe("Instagram OAuth state", () => {
  it("validates the signed state, nonce, user, and expiry", () => {
    const created = createInstagramOAuthState("admin-1", secret, 1_000);
    expect(verifyInstagramOAuthState(created.state, created.nonce, secret, 2_000)?.userId).toBe("admin-1");
    expect(verifyInstagramOAuthState(created.state, "wrong", secret, 2_000)).toBeNull();
    expect(verifyInstagramOAuthState(created.state, created.nonce, secret, 700_000)).toBeNull();
  });

  it("rejects modified state", () => {
    const created = createInstagramOAuthState("admin-1", secret);
    expect(verifyInstagramOAuthState(`${created.state}x`, created.nonce, secret)).toBeNull();
  });
});
