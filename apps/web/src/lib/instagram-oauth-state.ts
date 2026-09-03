import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type InstagramOAuthState = { nonce: string; userId: string; expiresAt: number };

function signature(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createInstagramOAuthState(userId: string, secret: string, now = Date.now()) {
  const payload: InstagramOAuthState = { nonce: randomBytes(24).toString("base64url"), userId, expiresAt: now + 10 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { nonce: payload.nonce, state: `${encoded}.${signature(encoded, secret)}` };
}

export function verifyInstagramOAuthState(state: string, expectedNonce: string, secret: string, now = Date.now()) {
  try {
    const [encoded, suppliedSignature, extra] = state.split(".");
    if (!encoded || !suppliedSignature || extra) return null;
    const expectedSignature = signature(encoded, secret);
    const supplied = Buffer.from(suppliedSignature);
    const expected = Buffer.from(expectedSignature);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<InstagramOAuthState>;
    if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce || typeof payload.userId !== "string" || typeof payload.expiresAt !== "number" || payload.expiresAt < now) return null;
    return payload as InstagramOAuthState;
  } catch { return null; }
}
