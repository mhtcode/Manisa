import { googleCalendarConfigured } from "@/lib/env";

export type CalendarSyncResult = { status: "not-configured" | "synced" | "failed"; eventId?: string; error?: string };

export interface CalendarIntegration {
  createEvent(appointmentId: string): Promise<CalendarSyncResult>;
  updateEvent(appointmentId: string): Promise<CalendarSyncResult>;
  cancelEvent(appointmentId: string): Promise<CalendarSyncResult>;
}

export const googleCalendar: CalendarIntegration = {
  async createEvent() { return googleCalendarConfigured() ? { status: "failed", error: "OAuth connection is not established." } : { status: "not-configured" }; },
  async updateEvent() { return googleCalendarConfigured() ? { status: "failed", error: "OAuth connection is not established." } : { status: "not-configured" }; },
  async cancelEvent() { return googleCalendarConfigured() ? { status: "failed", error: "OAuth connection is not established." } : { status: "not-configured" }; },
};
