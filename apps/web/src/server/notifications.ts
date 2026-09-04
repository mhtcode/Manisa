import "server-only";
import { subDays } from "date-fns";
import { notificationAction } from "@/lib/action-notifications";
import { prisma } from "@/lib/prisma";

export type ActionNotification = {
  key: string;
  kind: "overdue" | "payment" | "confirm";
  appointmentId: string;
  customerName: string;
  serviceName: string;
  startAt: Date;
  actionHref: string;
  actionLabel: string;
  read: boolean;
};

function name(customer: { firstName: string; lastName: string | null; displayName: string | null }) {
  return customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
}

export async function getActionNotifications(userId: string, businessId: string, now = new Date()): Promise<ActionNotification[]> {
  const recent = subDays(now, 45);
  const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const appointments = await prisma.appointment.findMany({
    where: {
      businessId, deletedAt: null,
      OR: [
        { status: { in: ["SCHEDULED", "CONFIRMED"] }, startAt: { gte: recent, lte: soon } },
        { status: "COMPLETED", paymentStatus: { not: "PAID" }, startAt: { gte: recent, lte: now } },
      ],
    },
    include: { customer: true },
    orderBy: { startAt: "desc" },
    take: 80,
  });

  const candidates = appointments.flatMap((appointment): Omit<ActionNotification, "read">[] => {
    const action = notificationAction(appointment, now);
    if (!action) return [];
    const base = {
      appointmentId: appointment.id,
      customerName: name(appointment.customer),
      serviceName: appointment.serviceNameSnapshot,
      startAt: appointment.startAt,
    };
    return [{ ...base, ...action }];
  }).slice(0, 16);

  const receipts = candidates.length ? await prisma.notificationReceipt.findMany({
    where: { userId, businessId, key: { in: candidates.map((item) => item.key) } },
    select: { key: true },
  }) : [];
  const readKeys = new Set(receipts.map((receipt) => receipt.key));
  return candidates.map((item) => ({ ...item, read: readKeys.has(item.key) }));
}
