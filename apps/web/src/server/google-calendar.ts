import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { getServerEnv } from "../lib/env";
import { getGoogleCalendarOAuthConfig } from "../lib/google-calendar-config";
import { decryptSecret } from "../lib/token-crypto";

type Db = PrismaClient | Prisma.TransactionClient;
type Operation = "UPSERT" | "DELETE";

export function stableGoogleEventId(appointmentId: string) {
  return `manisa${createHash("sha256").update(appointmentId).digest("hex")}`;
}

export async function enqueueGoogleCalendarSync(db: Db, appointmentIds: string[], operation: Operation, connectionIds?: string[]) {
  if (!appointmentIds.length) return 0;
  const connections = await db.googleCalendarConnection.findMany({ where: { status: "CONNECTED", id: connectionIds ? { in: connectionIds } : undefined }, select: { id: true } });
  if (!connections.length) return 0;
  const mappings = operation === "DELETE" ? await db.googleCalendarEvent.findMany({ where: { connectionId: { in: connections.map((item) => item.id) }, appointmentId: { in: appointmentIds } }, select: { connectionId: true, appointmentId: true, googleEventId: true } }) : [];
  const map = new Map(mappings.map((item) => [`${item.connectionId}:${item.appointmentId}`, item.googleEventId]));
  for (const connection of connections) for (const appointmentId of [...new Set(appointmentIds)]) {
    const googleEventId = map.get(`${connection.id}:${appointmentId}`);
    await db.googleCalendarSyncJob.upsert({
      where: { connectionId_appointmentId: { connectionId: connection.id, appointmentId } },
      create: { connectionId: connection.id, appointmentId, operation, googleEventId, status: "PENDING", availableAt: new Date() },
      update: { operation, googleEventId, status: "PENDING", attempts: 0, revision: { increment: 1 }, availableAt: new Date(), lockedAt: null, lastError: null },
    });
  }
  return appointmentIds.length * connections.length;
}

export async function googleCalendarAccessToken(refreshToken: string) {
  const config = await getGoogleCalendarOAuthConfig();
  if (!config) throw new Error("Google Calendar credentials are not configured.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }), cache: "no-store" });
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
      const config = await getGoogleCalendarOAuthConfig();
      if (!config) throw new Error("Google Calendar credentials are not configured.");
      const token = await googleCalendarAccessToken(decryptSecret(job.connection.encryptedRefreshToken, env.INTEGRATION_ENCRYPTION_KEY!));
      const mapping = await prisma.googleCalendarEvent.findUnique({ where: { connectionId_appointmentId: { connectionId: job.connectionId, appointmentId: job.appointmentId } } });
      const appointment = await prisma.appointment.findFirst({ where: { id: job.appointmentId, }, include: { customer: { select: { firstName: true, lastName: true, displayName: true } } } });
      const shouldDelete = job.operation === "DELETE" || !appointment || Boolean(appointment.deletedAt);
      const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(job.connection.calendarId)}/events`;
      if (shouldDelete) {
        const eventId = job.googleEventId || mapping?.googleEventId;
        if (eventId) { const response = await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "DELETE" }); if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(`Google event deletion failed (${response.status}).`); }
        await prisma.$transaction([prisma.googleCalendarEvent.deleteMany({ where: { connectionId: job.connectionId, appointmentId: job.appointmentId } }), prisma.googleCalendarSyncJob.deleteMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" } }), prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { lastSuccessfulSyncAt: new Date(), lastError: null } })]);
      } else {
        const payload = googleEventPayload(appointment, new URL(config.redirectUri).origin);
        const eventId = mapping?.googleEventId || payload.id;
        let response = mapping ? await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "PATCH", body: JSON.stringify(payload) }) : await googleRequest(token, `${base}?sendUpdates=none`, { method: "POST", body: JSON.stringify(payload) });
        if (mapping && response.status === 404) response = await googleRequest(token, `${base}?sendUpdates=none`, { method: "POST", body: JSON.stringify(payload) });
        if (!mapping && response.status === 409) response = await googleRequest(token, `${base}/${encodeURIComponent(eventId)}?sendUpdates=none`, { method: "PATCH", body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`Google event synchronization failed (${response.status}).`);
        const result = await response.json() as { id?: string; etag?: string };
        await prisma.$transaction([prisma.googleCalendarEvent.upsert({ where: { connectionId_appointmentId: { connectionId: job.connectionId, appointmentId: job.appointmentId } }, create: { connectionId: job.connectionId, appointmentId: job.appointmentId, googleEventId: result.id || eventId, etag: result.etag }, update: { googleEventId: result.id || eventId, etag: result.etag, lastSyncedAt: new Date() } }), prisma.googleCalendarSyncJob.deleteMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" } }), prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { lastSuccessfulSyncAt: new Date(), lastError: null } }), prisma.appointment.updateMany({ where: { id: job.appointmentId, }, data: { calendarSyncError: null } })]);
      }
      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google Calendar synchronization failed.";
      const reconnect = message === "RECONNECT_REQUIRED";
      const attempts = job.attempts;
      await prisma.$transaction([
        prisma.googleCalendarSyncJob.updateMany({ where: { id: job.id, revision: job.revision, status: "PROCESSING" }, data: { status: reconnect || attempts >= 10 ? "FAILED" : "PENDING", lockedAt: null, lastError: reconnect ? "Google authorization expired. Reconnect the account." : message, availableAt: new Date(Date.now() + Math.min(3600, 30 * 2 ** Math.min(attempts, 7)) * 1000) } }),
        prisma.googleCalendarConnection.update({ where: { id: job.connectionId }, data: { status: reconnect ? "PAUSED" : undefined, lastError: reconnect ? "Google authorization expired. Reconnect the account." : message } }),
        prisma.appointment.updateMany({ where: { id: job.appointmentId, }, data: { calendarSyncError: message } }),
      ]);
    }
  }
  return processed;
}
