import "server-only";

import type { UserNotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ActionNotification = {
  key: string;
  kind: "request" | "review" | "overdue" | "payment" | "confirm";
  title: string;
  body: string;
  createdAt: Date;
  actionHref: string;
  read: boolean;
};

function presentationKind(kind: UserNotificationKind): ActionNotification["kind"] {
  if (kind === "BOOKING_REQUEST") return "request";
  if (kind === "REVIEW_SUBMITTED") return "review";
  if (kind === "PAYMENT_ATTENTION") return "payment";
  if (kind === "APPOINTMENT_FINALIZATION") return "overdue";
  return "confirm";
}

export async function getActionNotifications(userId: string): Promise<ActionNotification[]> {
  const items = await prisma.userNotification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 32 });
  return items.map((item) => ({ key: item.id, kind: presentationKind(item.kind), title: item.title, body: item.body, createdAt: item.createdAt, actionHref: item.actionHref, read: Boolean(item.readAt) }));
}
