import "server-only";

import type { Prisma } from "@prisma/client";
import { normalizeNotificationHref, notificationPermission, type NotificationKind } from "@/lib/booking-requests";
import { hasBusinessPermission } from "@/lib/permissions";

export type NotificationEvent = {
  kind: NotificationKind;
  title: string;
  body: string;
  actionHref: string;
};

export async function enqueueNotification(tx: Prisma.TransactionClient, event: NotificationEvent) {
  const permission = notificationPermission(event.kind);
  const users = await tx.user.findMany({
    where: { active: true, deletedAt: null },
    select: { id: true, role: true, permissionOverrides: true, pushSubscriptions: { where: { active: true }, select: { id: true } } },
  });
  const recipients = users.filter((user) => hasBusinessPermission(user.role, user.permissionOverrides, permission));
  for (const recipient of recipients) {
    await tx.userNotification.create({
      data: {
        userId: recipient.id,
        kind: event.kind,
        title: event.title.slice(0, 120),
        body: event.body.slice(0, 240),
        actionHref: normalizeNotificationHref(event.actionHref),
        deliveries: { create: recipient.pushSubscriptions.map((subscription) => ({ subscriptionId: subscription.id })) },
      },
    });
  }
}
