import { describe, expect, it } from "vitest";
import { createGoogleCalendarOAuthState, verifyGoogleCalendarOAuthState } from "./google-calendar-oauth-state";

const secret = "a-secure-test-secret-that-is-long-enough";

describe("Google Calendar OAuth state", () => {
  it("round trips a signed business-scoped state", () => {
    const created = createGoogleCalendarOAuthState("user-1", "business-1", secret, 1_000);
    expect(verifyGoogleCalendarOAuthState(created.state, created.nonce, secret, 2_000)).toMatchObject({ userId: "user-1", businessId: "business-1" });
  });

  it("rejects tampering, a different nonce, and expiry", () => {
    const created = createGoogleCalendarOAuthState("user-1", "business-1", secret, 1_000);
    expect(verifyGoogleCalendarOAuthState(`${created.state}x`, created.nonce, secret, 2_000)).toBeNull();
    expect(verifyGoogleCalendarOAuthState(created.state, "wrong", secret, 2_000)).toBeNull();
    expect(verifyGoogleCalendarOAuthState(created.state, created.nonce, secret, 1_000 + 11 * 60_000)).toBeNull();
  });
});
