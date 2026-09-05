import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getServerEnv } from "../lib/env";
import { decryptSecret } from "../lib/token-crypto";

type Db = PrismaClient | Prisma.TransactionClient;
type Operation = "UPSERT" | "DELETE";

export function stableGoogleEventId(appointmentId: string) {
  return `manisa${createHash("sha256").update(appointmentId).digest("hex")}`;
}

export async function enqueueGoogleCalendarSync(db: Db, businessId: string, appointmentIds: string[], operation: Operation) {
  if (!appointmentIds.length) return 0;
  const connection = await db.googleCalendarConnection.findUnique({ where: { businessId }, select: { id: true } });
  if (!connection) return 0;
  const mappings = operation === "DELETE" ? await db.googleCalendarEvent.findMany({ where: { businessId, appointmentId: { in: appointmentIds } }, select: { appointmentId: true, googleEventId: true } }) : [];
  const map = new Map(mappings.map((item) => [item.appointmentId, item.googleEventId]));
  for (const appointmentId of [...new Set(appointmentIds)]) {
    await db.googleCalendarSyncJob.upsert({
      where: { businessId_appointmentId: { businessId, appointmentId } },
      create: { businessId, connectionId: connection.id, appointmentId, operation, googleEventId: map.get(appointmentId), status: "PENDING", availableAt: new Date() },
      update: { connectionId: connection.id, operation, googleEventId: map.get(appointmentId), status: "PENDING", attempts: 0, revision: { increment: 1 }, availableAt: new Date(), lockedAt: null, lastError: null },
    });
  }
  return appointmentIds.length;
}

async function accessToken(refreshToken: string) {
  const env = getServerEnv();
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !body.access_token) throw new Error(body.error === "invalid_grant" ? "RECONNECT_REQUIRED" : body.error_description || `Google token refresh failed (${response.status}).`);
  return body.access_token;
}

async function googleRequest(token: string, url: string, init: RequestInit) {
  return fetch(url, { ...init, headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) }, cache: "no-store" });
}

export function googleEventPayload(appointment: { id: string; status: string; startAt: Date; expectedDurationMinutes: number; serviceNameSnapshot: string; customer: { firstName: string; lastName: string | null; displayName: string | null } }, origin: string) {
  const customer = appointment.customer.displayName?.trim() || [appointment.customer.firstName, appointment.customer.lastName].filter(Boolean).join(" ");
  const label: Record<string, string> = { SCHEDULED: "Scheduled", CONFIRMED: "Confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled", NO_SHOW: "No-show" };
  return {
    id: stableGoogleEventId(appointment.id),
    summary: `[${label[appointment.status] || appointment.status}] ${customer} — ${appointment.serviceNameSnapshot}`,
    description: `Services: ${appointment.serviceNameSnapshot}\nStatus: ${label[appointment.status] || appointment.status}\nOpen in Manisa: ${origin}/appointments/${appointment.id}`,
    start: { dateTime: appointment.startAt.toISOString() },
    end: { dateTime: new Date(appointment.startAt.getTime() + appointment.expectedDurationMinutes * 60_000).toISOString() },
    extendedProperties: { private: { manisaAppointmentId: appointment.id } },
  };
}

export async function processGoogleCalendarJobs(prisma: PrismaClient, limit = 10) {
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const candidate = await prisma.googleCalendarSyncJob.findFirst({ where: { status: { in: ["PENDING", "PROCESSING"] }, availableAt: { lte: new Date() }, OR: [{ lockedAt: null }, { lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } }] }, orderBy: { availableAt: "asc" } });
    if (!candidate) break;
    const claimed = await prisma.googleCalendarSyncJob.updateMany({ where: { id: candidate.id, updatedAt: candidate.updatedAt }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    const job = await prisma.googleCalendarSyncJob.findUnique({ where: { id: candidate.id }, include: { connection: true } });
    if (!job) continue;
    try {
      if (job.connection.status !== "CONNECTED") throw new Error("RECONNECT_REQUIRED");
      const env = getServerEnv();
      const token = await accessToken(decryptSecret(job.connection.encryptedRefreshToken, env.INTEGRATION_ENCRYPTION_KEY!));
      const mapping = await prisma.googleCalendarEvent.findUnique({ where: { businessId_appointmentId: { businessId: job.businessId, appointmentId: job.appointmentId } } });
      const appointment = await prisma.appointment.findFirst({ where: { id: job.appointmentId, businessId: job.businessId }, include: { customer: { select: { firstName: true, lastName: true, displayName: true } } } });
      const shouldDelete = job.operation === "DELETE" || !appointment || Boolean(appointment.deletedAt);
      const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(job.connection.calendarId)}/events`;
      if (shouldDelete) {
        const eventId = job.googleEventId || mapping?.googleEventId;
        if (eventId) { const response = await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "DELETE" }); if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(`Google event deletion failed (${response.status}).`); }
        await prisma.$transaction([prisma.googleCalendarEvent.deleteMany({ where: { businessId: job.businessId, appointmentId: job.appointmentId } }), prisma.googleCalendarSyncJob.deleteMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" } }), prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { lastSuccessfulSyncAt: new Date(), lastError: null } })]);
      } else {
        const payload = googleEventPayload(appointment, new URL(env.GOOGLE_CALENDAR_REDIRECT_URI!).origin);
        const eventId = mapping?.googleEventId || payload.id;
        let response = mapping ? await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "PATCH", body: JSON.stringify(payload) }) : await googleRequest(token, `${base}?sendUpdates=none`, { method: "POST", body: JSON.stringify(payload) });
        if (mapping && response.status === 404) response = await googleRequest(token, `${base}?sendUpdates=none`, { method: "POST", body: JSON.stringify(payload) });
        if (!mapping && response.status === 409) response = await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "PATCH", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Google event synchronization failed (${response.status}).`);
        const result = await response.json() as { id?: string; etag?: string };
        await prisma.$transaction([prisma.googleCalendarEvent.upsert({ where: { businessId_appointmentId: { businessId: job.businessId, appointmentId: job.appointmentId } }, create: { businessId: job.businessId, connectionId: job.connectionId, appointmentId: job.appointmentId, googleEventId: result.id || eventId, etag: result.etag }, update: { connectionId: job.connectionId, googleEventId: result.id || eventId, etag: result.etag, lastSyncedAt: new Date() } }), prisma.googleCalendarSyncJob.deleteMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" } }), prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { lastSuccessfulSyncAt: new Date(), lastError: null } }), prisma.appointment.updateMany({ where: { id: job.appointmentId, businessId: job.businessId }, data: { calendarSyncError: null } })]);
      }
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Calendar synchronization failed.";
      const reconnect = message === "RECONNECT_REQUIRED";
      const attempts = job.attempts;
      await prisma.$transaction([
        prisma.googleCalendarSyncJob.updateMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" }, data: { status: reconnect || attempts >= 10 ? "FAILED" : "PENDING", lockedAt: null, lastError: reconnect ? "Google authorization expired. Reconnect the account." : message, availableAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(attempts, 7)) * 1000) } }),
        prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { status: reconnect ? "PAUSED" : undefined, lastError: reconnect ? "Google authorization expired. Reconnect the account." : message } }),
        prisma.appointment.updateMany({ where: { id: job.appointmentId, businessId: job.businessId }, data: { calendarSyncError: message } }),
      ]);
    }
  }
  return processed;
}
