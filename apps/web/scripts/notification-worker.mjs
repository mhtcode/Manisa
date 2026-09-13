import { PrismaClient } from "@prisma/client";
import webpush from "web-push";

const prisma = new PrismaClient();
const enabled = Boolean(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
if (enabled) webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || "mailto:admin@manisa.local", process.env.WEB_PUSH_PUBLIC_KEY, process.env.WEB_PUSH_PRIVATE_KEY);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const retryDelay = (attempts) => Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
const permissionForKind = (kind) => kind === "REVIEW_SUBMITTED" ? "reviews.manage" : kind === "PAYMENT_ATTENTION" ? "payments.manage" : "appointments.manage";
const roleAllows = (role, permission) => role === "OWNER" || role === "ADMIN" || (role === "MANAGER" && ["reviews.manage", "payments.manage", "appointments.manage"].includes(permission)) || (role === "STAFF" && permission === "appointments.manage");
function deliveryStillAllowed(item) {
  const permission = permissionForKind(item.notification.kind);
  const overrides = item.subscription.user.permissionOverrides;
  return overrides && !Array.isArray(overrides) && typeof overrides === "object" && typeof overrides[permission] === "boolean" ? overrides[permission] : roleAllows(item.subscription.user.role, permission);
}

async function claimDelivery() {
  const candidate = await prisma.notificationDelivery.findFirst({
    where: { status: "PENDING", availableAt: { lte: new Date() }, subscription: { active: true } },
    orderBy: { createdAt: "asc" }, select: { id: true },
  });
  if (!candidate) return null;
  const claimed = await prisma.notificationDelivery.updateMany({
    where: { id: candidate.id, status: "PENDING" }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (!claimed.count) return null;
  return prisma.notificationDelivery.findUnique({ where: { id: candidate.id }, include: { notification: true, subscription: { include: { user: { select: { role: true, permissionOverrides: true } } } } } });
}

async function deliver(item) {
  if (!deliveryStillAllowed(item)) {
    await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "FAILED", lockedAt: null, lastError: "Recipient permission no longer allows this alert" } });
    return;
  }
  if (!enabled) {
    await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "PENDING", lockedAt: null, availableAt: new Date(Date.now() + 5 * 60_000), lastError: "Web Push keys are not configured" } });
    return;
  }
  try {
    await webpush.sendNotification({ endpoint: item.subscription.endpoint, keys: { p256dh: item.subscription.p256dh, auth: item.subscription.auth } }, JSON.stringify({ title: item.notification.title, body: item.notification.body, url: item.notification.actionHref, tag: item.notification.id }), { TTL: 24 * 60 * 60, urgency: "normal" });
    await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "SENT", sentAt: new Date(), lockedAt: null, lastError: null } });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 0);
    const message = error instanceof Error ? error.message.slice(0, 500) : "Push delivery failed";
    if (statusCode === 404 || statusCode === 410) {
      await prisma.$transaction([
        prisma.pushSubscription.update({ where: { id: item.subscriptionId }, data: { active: false, lastError: message } }),
        prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "FAILED", lockedAt: null, lastError: message } }),
      ]);
    } else {
      const failed = item.attempts >= 5;
      await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: failed ? "FAILED" : "PENDING", lockedAt: null, lastError: message, availableAt: new Date(Date.now() + retryDelay(item.attempts)) } });
    }
  }
}

async function run() {
  await prisma.notificationDelivery.updateMany({
    where: { status: "PROCESSING", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
    data: { status: "PENDING", lockedAt: null, availableAt: new Date() },
  });
  for (;;) {
    const item = await claimDelivery();
    if (item) await deliver(item);
    else await pause(3000);
  }
}

process.on("SIGTERM", async () => { await prisma.$disconnect(); process.exit(0); });
run().catch(async (error) => { console.error(error); await prisma.$disconnect(); process.exit(1); });
