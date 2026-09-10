"use server";

import { revalidatePath } from "next/cache";
import { requireBusinessPermission } from "@/lib/auth";
import { getServerEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";
import { enqueueGoogleCalendarSync, googleCalendarAccessToken } from "@/server/google-calendar";

export type CalendarOption = { id: string; name: string; primary: boolean; selected: boolean };
export type CalendarActionResult = { error?: string; success?: string; calendars?: CalendarOption[]; queued?: number };

async function ownedCalendars(connectionId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection) throw new Error("Calendar connection not found.");
  const encryptionKey = getServerEnv().INTEGRATION_ENCRYPTION_KEY;
  if (!encryptionKey) throw new Error("Integration encryption is not configured.");
  const token = await googleCalendarAccessToken(decryptSecret(connection.encryptedRefreshToken, encryptionKey));
  const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250&showDeleted=false", { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (response.status === 401 || response.status === 403) throw new Error("Reconnect this Google account to choose calendars.");
  if (!response.ok) throw new Error(`Google calendars could not be loaded (${response.status}).`);
  const body = await response.json() as { items?: Array<{ id?: string; summary?: string; primary?: boolean; selected?: boolean; accessRole?: string }> };
  return { connection, calendars: (body.items || []).filter((item) => item.id && item.accessRole === "owner").map((item) => ({ id: item.id!, name: item.summary || item.id!, primary: Boolean(item.primary), selected: Boolean(item.selected) })) };
}

export async function saveGoogleCalendarCredentials(_previous: CalendarActionResult, formData: FormData): Promise<CalendarActionResult> {
  const user = await requireBusinessPermission("integrations.manage");
  const clientId = String(formData.get("clientId") || "").trim();
  const clientSecret = String(formData.get("clientSecret") || "").trim();
  const redirectUri = String(formData.get("redirectUri") || "").trim();
  const existing = await prisma.googleCalendarCredential.findUnique({ where: { id: "google-calendar" } });
  if (clientId.length < 10) return { error: "Enter the OAuth web client ID from Google Cloud." };
  if (!clientSecret && !existing) return { error: "Enter the OAuth client secret." };
  let callback: URL;
  try { callback = new URL(redirectUri); } catch { return { error: "Enter a valid public HTTPS callback URL." }; }
  if (callback.protocol !== "https:" || callback.pathname !== "/api/integrations/google-calendar/callback") return { error: "The callback must be HTTPS and end with /api/integrations/google-calendar/callback." };
  const encryptionKey = getServerEnv().INTEGRATION_ENCRYPTION_KEY;
  if (!encryptionKey) return { error: "The server owner must configure INTEGRATION_ENCRYPTION_KEY once before credentials can be stored." };
  const encryptedClientSecret = clientSecret ? encryptSecret(clientSecret, encryptionKey) : existing!.encryptedClientSecret;
  const changed = Boolean(existing && (existing.clientId !== clientId || existing.redirectUri !== redirectUri || clientSecret));
  await prisma.$transaction(async (tx) => {
    await tx.googleCalendarCredential.upsert({ where: { id: "google-calendar" }, create: { id: "google-calendar", clientId, encryptedClientSecret, redirectUri, configuredById: user.id }, update: { clientId, encryptedClientSecret, redirectUri, configuredById: user.id } });
    if (changed) await tx.googleCalendarConnection.updateMany({ data: { status: "PAUSED", lastError: "OAuth credentials changed. Reconnect this account." } });
    await tx.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: existing ? "google_calendar.credentials_updated" : "google_calendar.credentials_created", targetType: "GoogleCalendarCredential", targetId: "google-calendar", before: existing ? { clientId: existing.clientId, redirectUri: existing.redirectUri } : undefined, after: { clientId, redirectUri } } });
  });
  revalidatePath("/settings/google-calendar");
  return { success: changed ? "Credentials saved. Reconnect existing accounts to continue syncing." : "Google Calendar credentials saved." };
}

export async function listAvailableGoogleCalendars(connectionId: string): Promise<CalendarActionResult> {
  await requireBusinessPermission("integrations.manage");
  try {
    const { connection, calendars } = await ownedCalendars(connectionId);
    const existing = await prisma.googleCalendarConnection.findMany({ where: { googleAccountEmail: connection.googleAccountEmail }, select: { calendarId: true, primary: true } });
    const ids = new Set(existing.map((item) => item.calendarId));
    return { calendars: calendars.filter((item) => !(item.primary ? existing.some((current) => current.primary) : ids.has(item.id))) };
  } catch (error) { return { error: error instanceof Error ? error.message : "Google calendars could not be loaded." }; }
}

export async function addGoogleCalendars(sourceConnectionId: string, calendarIds: string[]): Promise<CalendarActionResult> {
  const user = await requireBusinessPermission("integrations.manage");
  if (!calendarIds.length) return { error: "Choose at least one calendar." };
  try {
    const { connection, calendars } = await ownedCalendars(sourceConnectionId);
    const selected = calendars.filter((item) => calendarIds.includes(item.id));
    if (selected.length !== new Set(calendarIds).size) return { error: "One or more selected calendars are unavailable or are not owned by this account." };
    const appointments = await prisma.appointment.findMany({ where: { deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] } }, select: { id: true } });
    const createdIds: string[] = [];
    await prisma.$transaction(async (tx) => {
      for (const calendar of selected) {
        const calendarId = calendar.primary ? "primary" : calendar.id;
        const item = await tx.googleCalendarConnection.upsert({
          where: { googleAccountEmail_calendarId: { googleAccountEmail: connection.googleAccountEmail, calendarId } },
          create: { credentialId: connection.credentialId, connectedById: user.id, googleAccountEmail: connection.googleAccountEmail, calendarId, calendarName: calendar.name, primary: calendar.primary, encryptedRefreshToken: connection.encryptedRefreshToken, grantedScopes: connection.grantedScopes },
          update: { connectedById: user.id, calendarName: calendar.name, primary: calendar.primary, encryptedRefreshToken: connection.encryptedRefreshToken, grantedScopes: connection.grantedScopes, status: "CONNECTED", lastError: null },
        });
        createdIds.push(item.id);
      }
      await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "UPSERT", createdIds);
    });
    revalidatePath("/settings/google-calendar");
    return { success: `${createdIds.length} calendar${createdIds.length === 1 ? "" : "s"} added.`, queued: appointments.length * createdIds.length };
  } catch (error) { return { error: error instanceof Error ? error.message : "The calendars could not be added." }; }
}

export async function retryGoogleCalendar(connectionId: string) {
  await requireBusinessPermission("integrations.manage");
  const failed = await prisma.googleCalendarSyncJob.findMany({ where: { connectionId, status: "FAILED" } });
  await prisma.$transaction(async (tx) => {
    for (const job of failed) await enqueueGoogleCalendarSync(tx, [job.appointmentId], job.operation, [connectionId]);
  });
  revalidatePath("/settings/google-calendar");
}

export async function synchronizeGoogleCalendar(connectionId: string) {
  await requireBusinessPermission("integrations.manage");
  const appointments = await prisma.appointment.findMany({ where: { deletedAt: null, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] } }, select: { id: true } });
  await prisma.$transaction(async (tx) => { await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "UPSERT", [connectionId]); });
  revalidatePath("/settings/google-calendar");
}

export async function checkGoogleCalendar(connectionId: string) {
  await requireBusinessPermission("integrations.manage");
  try {
    await ownedCalendars(connectionId);
    await prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { status: "CONNECTED", lastCheckedAt: new Date(), lastError: null } });
  } catch (error) {
    await prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { status: "PAUSED", lastCheckedAt: new Date(), lastError: error instanceof Error ? error.message : "Calendar check failed." } });
  }
  revalidatePath("/settings/google-calendar");
}

export async function disconnectGoogleCalendar(connectionId: string) {
  const user = await requireBusinessPermission("integrations.manage");
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection) return;
  await prisma.$transaction([
    prisma.googleCalendarConnection.delete({ where: { id: connectionId } }),
    prisma.auditLog.create({ data: { actorId: user.id, actorSnapshot: user.email, action: "google_calendar.disconnected", targetType: "GoogleCalendarConnection", targetId: connectionId, before: { email: connection.googleAccountEmail, calendarId: connection.calendarId, calendarName: connection.calendarName } } }),
  ]);
  revalidatePath("/settings/google-calendar");
}
