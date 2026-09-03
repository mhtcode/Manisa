export type NotificationKind = "overdue" | "payment" | "confirm";

export function notificationAction(appointment: { id: string; status: string; paymentStatus: string; startAt: Date; expectedDurationMinutes: number }, now = new Date()) {
  const endAt = new Date(appointment.startAt.getTime() + appointment.expectedDurationMinutes * 60_000);
  if (["SCHEDULED", "CONFIRMED"].includes(appointment.status) && endAt <= now) return { key: `overdue:${appointment.id}`, kind: "overdue" as const, actionHref: appointment.status === "CONFIRMED" ? `/appointments/${appointment.id}/complete` : `/appointments/${appointment.id}`, actionLabel: appointment.status === "CONFIRMED" ? "Finalize" : "Review" };
  if (appointment.status === "SCHEDULED" && appointment.startAt > now && appointment.startAt.getTime() <= now.getTime() + 24 * 60 * 60 * 1000) return { key: `confirm:${appointment.id}`, kind: "confirm" as const, actionHref: `/appointments/${appointment.id}`, actionLabel: "Confirm" };
  if (appointment.status === "COMPLETED" && appointment.paymentStatus !== "PAID") return { key: `payment:${appointment.id}`, kind: "payment" as const, actionHref: `/appointments/${appointment.id}`, actionLabel: "Record payment" };
  return null;
}
