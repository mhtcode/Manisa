import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

type StatePayload = { nonce: string; userId: string; businessId: string; expiresAt: number };

function sign(encoded: string, secret: string) {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

export function createGoogleCalendarOAuthState(userId: string, businessId: string, secret: string, now = Date.now()) {
  const payload: StatePayload = { nonce: randomBytes(24).toString("base64url"), userId, businessId, expiresAt: now + 10 * 60_000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { nonce: payload.nonce, state: `${encoded}.${sign(encoded, secret)}` };
}

export function verifyGoogleCalendarOAuthState(state: string, nonce: string, secret: string, now = Date.now()) {
  try {
    const [encoded, supplied, extra] = state.split(".");
    if (!encoded || !supplied || extra) return null;
    const expected = sign(encoded, secret);
    const a = Buffer.from(supplied); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
    if (payload.nonce !== nonce || !payload.userId || !payload.businessId || payload.expiresAt < now) return null;
    return payload;
  } catch { return null; }
}
