import { createHash } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";

const optionalText = z.string().trim().max(2_000).optional();
const categorySchema = z.union([
  z.string().trim().min(1).max(80),
  z.object({
    name: z.string().trim().min(1).max(80),
    description: optionalText,
    icon: z.enum(["nail", "scissors", "sparkles", "palette", "wand", "flower", "gem", "heart"]).optional(),
    accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  }),
]);

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: categorySchema,
  durationMinutes: z.coerce.number().int().min(5).max(1_440),
  price: z.coerce.number().min(0).max(99_999_999).default(0),
  description: optionalText,
  supportsColor: z.boolean().default(false),
  color: z.string().trim().max(80).optional(),
});

const appointmentSchema = z.object({
  externalId: z.string().trim().min(1).max(180).optional(),
  startAt: z.string().trim().min(1),
  customer: z.object({
    name: z.string().trim().min(1).max(180),
    phone: z.string().trim().max(80).optional(),
    email: z.union([z.string().trim().email(), z.literal("")]).optional(),
    preferredLanguage: z.enum(["en", "fa"]).default("en"),
    notes: optionalText,
  }),
  services: z.array(serviceSchema).min(1).max(12),
  notes: optionalText,
});

const payloadSchema = z.union([
  z.array(appointmentSchema),
  z.object({ appointments: z.array(appointmentSchema) }),
]);

export type ManualImportAppointment = z.infer<typeof appointmentSchema> & { startDate: Date; sourceId: string };

export function normalizedImportValue(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function parseStartAt(value: string, timezone: string) {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const date = hasZone ? new Date(value) : fromZonedTime(value, timezone);
  return Number.isNaN(date.valueOf()) ? null : date;
}

function sourceIdFor(appointment: z.infer<typeof appointmentSchema>, startDate: Date) {
  const identity = appointment.externalId || JSON.stringify({
    customer: normalizedImportValue(appointment.customer.name),
    startAt: startDate.toISOString(),
    services: appointment.services.map((service) => normalizedImportValue(service.name)).sort(),
  });
  return `manual:${createHash("sha256").update(identity).digest("hex").slice(0, 40)}`;
}

export function parseManualCalendarJson(source: string, timezone: string) {
  let decoded: unknown;
  try {
    decoded = JSON.parse(source);
  } catch {
    return { appointments: [] as ManualImportAppointment[], issues: ["The file is not valid JSON."] };
  }
  const parsed = payloadSchema.safeParse(decoded);
  if (!parsed.success) {
    return {
      appointments: [] as ManualImportAppointment[],
      issues: parsed.error.issues.slice(0, 8).map((issue) => `${issue.path.join(".") || "file"}: ${issue.message}`),
    };
  }
  const rows = Array.isArray(parsed.data) ? parsed.data : parsed.data.appointments;
  if (!rows.length) return { appointments: [] as ManualImportAppointment[], issues: ["Add at least one appointment."] };
  const appointments: ManualImportAppointment[] = [];
  const issues: string[] = [];
  rows.forEach((appointment, index) => {
    const startDate = parseStartAt(appointment.startAt, timezone);
    if (!startDate) {
      issues.push(`appointments.${index}.startAt: Enter an ISO date and time.`);
      return;
    }
    const uniqueServices = new Set(appointment.services.map((service) => normalizedImportValue(service.name)));
    if (uniqueServices.size !== appointment.services.length) {
      issues.push(`appointments.${index}.services: Service names must be unique within an appointment.`);
      return;
    }
    appointments.push({ ...appointment, startDate, sourceId: sourceIdFor(appointment, startDate) });
  });
  return { appointments, issues };
}

export function importCategory(category: z.infer<typeof categorySchema>) {
  return typeof category === "string" ? { name: category } : category;
}

