"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { parseGoogleCalendarIcs } from "@/lib/google-calendar-import";
import { importCategory, normalizedImportValue, parseManualCalendarJson } from "@/lib/manual-calendar-import";
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
      transaction.customer.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, displayName: true } }),
      transaction.service.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
      transaction.appointment.findMany({ where: { calendarEventId: { in: parsed.events.map((event) => event.sourceId) } }, select: { calendarEventId: true } }),
      transaction.studioCategory.upsert({
        where: { slug: "other" },
        update: { active: true, deletedAt: null },
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
        notes: [event.description, "Imported from Google Calendar. Manually added/unreported; excluded from income and working-hour totals."].filter(Boolean).join("\n\n"),
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
  return { status: "success", message: result.imported ? "Manually added appointments imported successfully." : "No new appointments were imported.", imported: result.imported, duplicates: result.duplicates, skipped: parsed.issues.length, issues: parsed.issues.slice(0, 5) };
}

function importSlug(name: string) {
  const latin = name.normalize("NFKD").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  const fallback = Array.from(name).reduce((hash, character) => ((hash * 31) + character.codePointAt(0)!) >>> 0, 2166136261).toString(36);
  return latin || `imported-${fallback}`;
}

export async function importManualCalendarJson(_previous: CalendarImportState, formData: FormData): Promise<CalendarImportState> {
  const user = await requireUser();
  const upload = formData.get("jsonFile");
  const pasted = String(formData.get("jsonText") || "").trim();
  if (upload instanceof File && upload.size > 2_000_000) return { status: "error", message: "The JSON file must be smaller than 2 MB." };
  const source = pasted || (upload instanceof File && upload.size ? await upload.text() : "");
  if (!source) return { status: "error", message: "Paste JSON or choose a .json file." };

  const timezone = user.settings?.timezone || "America/Toronto";
  const currency = user.settings?.currency || "CAD";
  const parsed = parseManualCalendarJson(source, timezone);
  if (parsed.issues.length || !parsed.appointments.length) {
    return { status: "error", message: "The batch is invalid. Nothing was imported.", skipped: parsed.issues.length, issues: parsed.issues.slice(0, 8) };
  }
  if (parsed.appointments.length > 200) return { status: "error", message: "Import at most 200 appointments at a time." };

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const [customers, categories, services, existingAppointments] = await Promise.all([
        transaction.customer.findMany({ where: { deletedAt: null }, select: { id: true, firstName: true, lastName: true, displayName: true, phone: true, email: true } }),
        transaction.studioCategory.findMany({ select: { id: true, name: true, slug: true, active: true, deletedAt: true } }),
        transaction.service.findMany({ where: { deletedAt: null }, select: { id: true, name: true, categoryId: true, active: true } }),
        transaction.appointment.findMany({ where: { calendarEventId: { in: parsed.appointments.map((appointment) => appointment.sourceId) } }, select: { calendarEventId: true } }),
      ]);
      const customersByIdentity = new Map<string, string>();
      customers.forEach((customer) => {
        const name = customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
        customersByIdentity.set(`name:${normalizedImportValue(name)}`, customer.id);
        if (customer.phone) customersByIdentity.set(`phone:${normalizedImportValue(customer.phone)}`, customer.id);
        if (customer.email) customersByIdentity.set(`email:${normalizedImportValue(customer.email)}`, customer.id);
      });
      const categoriesByName = new Map(categories.filter((category) => !category.deletedAt).map((category) => [normalizedImportValue(category.name), { id: category.id, active: category.active }]));
      const usedSlugs = new Set(categories.map((category) => category.slug));
      const servicesByCategoryAndName = new Map(services.map((service) => [`${service.categoryId}:${normalizedImportValue(service.name)}`, { id: service.id, active: service.active }]));
      const sourceIds = new Set(existingAppointments.flatMap((appointment) => appointment.calendarEventId ? [appointment.calendarEventId] : []));
      let imported = 0;
      let duplicates = 0;

      for (const appointment of parsed.appointments) {
        if (sourceIds.has(appointment.sourceId)) { duplicates += 1; continue; }
        const customer = appointment.customer;
        const customerKeys = [customer.phone && `phone:${normalizedImportValue(customer.phone)}`, customer.email && `email:${normalizedImportValue(customer.email)}`, `name:${normalizedImportValue(customer.name)}`].filter(Boolean) as string[];
        let customerId = customerKeys.map((key) => customersByIdentity.get(key)).find(Boolean);
        if (!customerId) {
          const created = await transaction.customer.create({ data: { firstName: customer.name, displayName: customer.name, phone: customer.phone, email: customer.email || undefined, notes: customer.notes, preferredLanguage: customer.preferredLanguage } });
          customerId = created.id;
          customerKeys.forEach((key) => customersByIdentity.set(key, created.id));
        }

        const lineData: { serviceId: string; serviceNameSnapshot: string; durationMinutes: number; price: number; selectedColor?: string; position: number }[] = [];
        for (const [position, importedService] of appointment.services.entries()) {
          const categoryData = importCategory(importedService.category);
          const categoryKey = normalizedImportValue(categoryData.name);
          const existingCategory = categoriesByName.get(categoryKey);
          let categoryId = existingCategory?.id;
          if (existingCategory && !existingCategory.active) await transaction.studioCategory.update({ where: { id: existingCategory.id }, data: { active: true } });
          if (!categoryId) {
            const base = importSlug(categoryData.name);
            let slug = base;
            let suffix = 2;
            while (usedSlugs.has(slug)) { slug = `${base}-${suffix}`; suffix += 1; }
            const created = await transaction.studioCategory.create({ data: { name: categoryData.name, slug, description: categoryData.description, icon: categoryData.icon || "sparkles", accentColor: categoryData.accentColor?.toUpperCase() || "#4F8CFF", position: categoriesByName.size } });
            categoryId = created.id;
            categoriesByName.set(categoryKey, { id: created.id, active: true });
            usedSlugs.add(slug);
          }
          const serviceKey = `${categoryId}:${normalizedImportValue(importedService.name)}`;
          const existingService = servicesByCategoryAndName.get(serviceKey);
          let serviceId = existingService?.id;
          if (existingService && !existingService.active) await transaction.service.update({ where: { id: existingService.id }, data: { active: true } });
          if (!serviceId) {
            const created = await transaction.service.create({ data: { name: importedService.name, description: importedService.description, categoryId, supportsColor: importedService.supportsColor, defaultDurationMinutes: importedService.durationMinutes, defaultPrice: importedService.price, currency } });
            serviceId = created.id;
            servicesByCategoryAndName.set(serviceKey, { id: created.id, active: true });
          }
          lineData.push({ serviceId, serviceNameSnapshot: importedService.name, durationMinutes: importedService.durationMinutes, price: importedService.price, selectedColor: importedService.color, position });
        }
        const duration = lineData.reduce((total, line) => total + line.durationMinutes, 0);
        const price = lineData.reduce((total, line) => total + line.price, 0);
        await transaction.appointment.create({ data: {
          customerId,
          serviceId: lineData[0].serviceId,
          serviceNameSnapshot: lineData.map((line) => line.serviceNameSnapshot).join(" + "),
          startAt: appointment.startDate,
          expectedDurationMinutes: duration,
          expectedPrice: price,
          currency,
          status: "HISTORICAL",
          calendarEventId: appointment.sourceId,
          notes: [appointment.notes, "Manually added from JSON; excluded from income and working-hour totals."].filter(Boolean).join("\n\n"),
          serviceLines: { create: lineData },
        } });
        sourceIds.add(appointment.sourceId);
        imported += 1;
      }
      return { imported, duplicates };
    }, { timeout: 60_000 });

    ["/appointments", "/calendar", "/customers", "/services", "/settings/categories"].forEach((path) => revalidatePath(path));
    return { status: "success", message: result.imported ? "JSON batch imported successfully." : "No new appointments were imported.", imported: result.imported, duplicates: result.duplicates, skipped: 0 };
  } catch {
    return { status: "error", message: "The batch could not be completed, and no records were saved." };
  }
}
