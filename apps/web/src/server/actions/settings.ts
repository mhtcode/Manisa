"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { parseGoogleCalendarIcs } from "@/lib/google-calendar-import";
import { secureCookiesEnabled } from "@/lib/env";
import { mobileNavigationKeys } from "@/lib/mobile-navigation";
import { prisma } from "@/lib/prisma";

const collectionKeys = ["appointments", "customers", "services", "gallery", "reportRecords"] as const;
type CollectionKey = (typeof collectionKeys)[number];

function preferenceObject(value: unknown): Prisma.InputJsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | number | boolean] => ["string", "number", "boolean"].includes(typeof entry[1])));
}

export type CalendarImportState = {
  status: "idle" | "success" | "error";
  message?: string;
  imported?: number;
  duplicates?: number;
  skipped?: number;
  issues?: string[];
};

export async function updateSettings(formData: FormData) {
  const user = await requireUser();
  const locale = formData.get("locale") === "fa" ? "fa" : "en";
  const themeValue = String(formData.get("theme"));
  const theme = themeValue === "LIGHT" || themeValue === "SYSTEM" ? themeValue : "DARK";
  const businessName = String(formData.get("businessName") || "Manisa").trim().slice(0, 120);
  const currency = String(formData.get("currency") || "CAD").toUpperCase().slice(0, 3);
  await prisma.settings.upsert({ where: { userId: user.id }, create: { userId: user.id, locale, theme, businessName, currency }, update: { locale, theme, businessName, currency } });
  const secure = secureCookiesEnabled();
  (await cookies()).set("manisa_locale", locale, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 31536000 });
  (await cookies()).set("manisa_theme", theme.toLowerCase(), { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 31536000 });
  revalidatePath("/", "layout");
}

export async function updateMobileNavigation(formData: FormData) {
  const user = await requireUser();
  const items = formData.getAll("mobileNavItems").map(String);
  const valid = items.length === 4 && new Set(items).size === 4 && items.every((item) => mobileNavigationKeys.includes(item as (typeof mobileNavigationKeys)[number]));
  if (!valid) throw new Error("Choose four unique destinations for the mobile navigation.");
  await prisma.settings.upsert({ where: { userId: user.id }, create: { userId: user.id, mobileNavOrder: items.join(",") }, update: { mobileNavOrder: items.join(",") } });
  revalidatePath("/", "layout");
}

export async function updateCollectionView(page: CollectionKey, mode: "grid" | "list") {
  const user = await requireUser();
  if (!collectionKeys.includes(page) || !["grid", "list"].includes(mode)) throw new Error("Invalid collection preference.");
  const current = preferenceObject(user.settings?.collectionViews);
  await prisma.settings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, collectionViews: { ...current, [page]: mode } },
    update: { collectionViews: { ...current, [page]: mode } },
  });
  revalidatePath("/", "layout");
}

export async function updateCollapsedSection(sectionId: string, collapsed: boolean) {
  const user = await requireUser();
  if (!/^[-_a-zA-Z0-9]{1,100}$/.test(sectionId)) throw new Error("Invalid section preference.");
  const current = preferenceObject(user.settings?.collapsedSections);
  await prisma.settings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, collapsedSections: { ...current, [sectionId]: collapsed } },
    update: { collapsedSections: { ...current, [sectionId]: collapsed } },
  });
  revalidatePath("/services");
}

function normalized(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

export async function importGoogleCalendar(_previous: CalendarImportState, formData: FormData): Promise<CalendarImportState> {
  const user = await requireUser();
  const file = formData.get("calendarFile");
  if (!(file instanceof File) || !file.name.toLocaleLowerCase().endsWith(".ics")) {
    return { status: "error", message: "Choose a Google Calendar .ics export file." };
  }
  if (!file.size || file.size > 2_000_000) {
    return { status: "error", message: "The calendar file must be between 1 byte and 2 MB." };
  }

  const timezone = user.settings?.timezone || "America/Toronto";
  const currency = user.settings?.currency || "CAD";
  const parsed = parseGoogleCalendarIcs(await file.text(), timezone);
  if (!parsed.events.length) {
    return { status: "error", message: "No importable appointments were found.", skipped: parsed.issues.length, issues: parsed.issues.slice(0, 5) };
  }
  if (parsed.events.length > 500) {
    return { status: "error", message: "Import at most 500 appointments at a time." };
  }

  let result: { imported: number; duplicates: number };
  try {
    result = await prisma.$transaction(async (transaction) => {
    const [customers, services, existingAppointments, otherCategory] = await Promise.all([
      transaction.customer.findMany({ select: { id: true, firstName: true, lastName: true, displayName: true } }),
      transaction.service.findMany({ select: { id: true, name: true } }),
      transaction.appointment.findMany({ where: { calendarEventId: { in: parsed.events.map((event) => event.sourceId) } }, select: { calendarEventId: true } }),
      transaction.studioCategory.upsert({
        where: { slug: "other" },
        update: {},
        create: { id: "studio_category_other", slug: "other", name: "Other services", description: "Additional and imported services", icon: "sparkles", accentColor: "#64748B", position: 999 },
        select: { id: true },
      }),
    ]);
    const customerIds = new Map(customers.map((customer) => [normalized(customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ")), customer.id]));
    const serviceIds = new Map(services.map((service) => [normalized(service.name), service.id]));
    const sourceIds = new Set(existingAppointments.flatMap((appointment) => appointment.calendarEventId ? [appointment.calendarEventId] : []));
    let imported = 0;
    let duplicates = 0;

    for (const event of parsed.events) {
      if (sourceIds.has(event.sourceId)) { duplicates += 1; continue; }
      const customerKey = normalized(event.customerName);
      let customerId = customerIds.get(customerKey);
      if (!customerId) {
        const customer = await transaction.customer.create({ data: { firstName: event.customerName, displayName: event.customerName, phone: event.phone, email: event.email } });
        customerId = customer.id;
        customerIds.set(customerKey, customerId);
      }
      const serviceKey = normalized(event.serviceName);
      let serviceId = serviceIds.get(serviceKey);
      if (!serviceId) {
        const service = await transaction.service.create({ data: { name: event.serviceName, description: "Imported from Google Calendar; review pricing before future booking.", categoryId: otherCategory.id, defaultDurationMinutes: event.durationMinutes, defaultPrice: 0, currency } });
        serviceId = service.id;
        serviceIds.set(serviceKey, serviceId);
      }
      await transaction.appointment.create({ data: {
        customerId,
        serviceId,
        serviceNameSnapshot: event.serviceName,
        startAt: event.startAt,
        expectedDurationMinutes: event.durationMinutes,
        expectedPrice: 0,
        currency,
        status: "HISTORICAL",
        calendarEventId: event.sourceId,
        notes: [event.description, "Imported from Google Calendar. Historical/unreported; excluded from income and working-hour totals."].filter(Boolean).join("\n\n"),
        serviceLines: { create: { serviceId, serviceNameSnapshot: event.serviceName, durationMinutes: event.durationMinutes, price: 0 } },
      } });
      sourceIds.add(event.sourceId);
      imported += 1;
    }
      return { imported, duplicates };
    }, { timeout: 60_000 });
  } catch {
    return { status: "error", message: "The import could not be completed, and no appointments were saved. Check the file and try again." };
  }

  revalidatePath("/appointments");
  revalidatePath("/calendar");
  revalidatePath("/customers");
  revalidatePath("/services");
  return { status: "success", message: result.imported ? "Historical appointments imported successfully." : "No new appointments were imported.", imported: result.imported, duplicates: result.duplicates, skipped: parsed.issues.length, issues: parsed.issues.slice(0, 5) };
}
