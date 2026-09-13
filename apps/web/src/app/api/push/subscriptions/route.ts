import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getServerEnv, webPushConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { isSafePushEndpoint } from "@/lib/push-subscriptions";

const subscriptionSchema = z.object({
  endpoint: z.string().max(2048),
  keys: z.object({ p256dh: z.string().min(20).max(512), auth: z.string().min(8).max(256) }),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const env = getServerEnv();
  return NextResponse.json({ configured: webPushConfigured(), publicKey: env.WEB_PUSH_PUBLIC_KEY ?? null });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!webPushConfigured()) return NextResponse.json({ error: "Push notifications are not configured." }, { status: 503 });
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isSafePushEndpoint(parsed.data.endpoint)) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    update: { userId: user.id, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth, active: true, lastError: null },
    create: { userId: user.id, endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const endpoint = z.object({ endpoint: z.string().max(2048) }).safeParse(await request.json().catch(() => null));
  if (!endpoint.success) return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  await prisma.pushSubscription.updateMany({ where: { userId: user.id, endpoint: endpoint.data.endpoint }, data: { active: false } });
  return NextResponse.json({ ok: true });
}
