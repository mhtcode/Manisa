import "server-only";
import type { AppointmentStatus, PaymentStatus, Prisma } from "@prisma/client";
import { subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { calculateCoreReportMetrics } from "@/lib/report-metrics";
import { intlLocale, type AppLocale } from "@/lib/i18n";

const validPresets = ["7", "30", "90", "ytd", "all", "custom"] as const;
const validStatuses: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED", "COMPLETED", "HISTORICAL", "CANCELLED", "NO_SHOW"];
const validPayments: PaymentStatus[] = ["UNPAID", "PAID", "PARTIALLY_PAID"];

export type ReportQuery = { preset?: string; from?: string; to?: string; serviceId?: string; status?: string; paymentStatus?: string };

function validDate(value?: string) { return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value)); }

async function reportRange(businessId: string, query: ReportQuery, timezone: string) {
  const preset = validPresets.includes(query.preset as (typeof validPresets)[number]) ? query.preset as (typeof validPresets)[number] : "90";
  const today = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  let end = fromZonedTime(`${validDate(query.to) && preset === "custom" ? query.to : today}T23:59:59.999`, timezone);
  let start: Date;
  if (preset === "custom" && validDate(query.from)) start = fromZonedTime(`${query.from}T00:00:00`, timezone);
  else if (preset === "ytd") start = fromZonedTime(`${formatInTimeZone(new Date(), timezone, "yyyy")}-01-01T00:00:00`, timezone);
  else if (preset === "all") {
    const earliest = await prisma.appointment.findFirst({ where: { businessId, deletedAt: null }, orderBy: { startAt: "asc" }, select: { startAt: true } });
    start = earliest?.startAt || fromZonedTime(`${today}T00:00:00`, timezone);
  } else {
    const days = ["7", "30", "90"].includes(preset) ? Number(preset) : 90;
    start = fromZonedTime(`${formatInTimeZone(subDays(end, days - 1), timezone, "yyyy-MM-dd")}T00:00:00`, timezone);
  }
  if (start > end) [start, end] = [fromZonedTime(`${today}T00:00:00`, timezone), fromZonedTime(`${today}T23:59:59.999`, timezone)];
  const milliseconds = end.getTime() - start.getTime() + 1;
  return { preset, start, end, previousStart: new Date(start.getTime() - milliseconds), previousEnd: new Date(start.getTime() - 1), days: Math.max(1, Math.round(milliseconds / 86_400_000)) };
}

function filteredWhere(businessId: string, start: Date, end: Date, query: ReportQuery): Prisma.AppointmentWhereInput {
  const status = validStatuses.includes(query.status as AppointmentStatus) ? query.status as AppointmentStatus : undefined;
  const paymentStatus = validPayments.includes(query.paymentStatus as PaymentStatus) ? query.paymentStatus as PaymentStatus : undefined;
  return {
    businessId, deletedAt: null,
    startAt: { gte: start, lte: end },
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(query.serviceId ? { OR: [
      { actualServiceLines: { some: { serviceId: query.serviceId } } },
      { serviceLines: { some: { serviceId: query.serviceId } } },
      { serviceId: query.serviceId },
    ] } : {}),
  };
}

type ReportAppointment = Prisma.AppointmentGetPayload<{ include: { customer: true; serviceLines: true; actualServiceLines: true; payments: true } }>;

function bucketKey(date: Date, days: number, timezone: string, locale: AppLocale) {
  if (days > 180) return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "numeric", timeZone: timezone }).format(date);
  if (days > 31) return formatInTimeZone(date, timezone, "yyyy-'W'ww");
  return new Intl.DateTimeFormat(intlLocale(locale), { month: "short", day: "numeric", timeZone: timezone }).format(date);
}

function summarize(appointments: ReportAppointment[], newCustomers: number, returningCustomers: number, days: number, timezone: string, locale: AppLocale) {
  const completed = appointments.filter((appointment) => appointment.status === "COMPLETED");
  const chronological = [...completed].sort((a, b) => (a.completedAt || a.startAt).getTime() - (b.completedAt || b.startAt).getTime());
  const core = calculateCoreReportMetrics(appointments);
  const timeline = new Map<string, { name: string; revenue: number; visits: number; hours: number }>();
  const servicePerformance = new Map<string, { id: string; name: string; revenue: number; visits: number; hours: number }>();
  const outcomes = new Map<string, number>();
  const payments = new Map<string, number>();
  const weekdays = new Map<string, number>();
  const hours = new Map<string, number>();
  const monthlyHours = new Map<string, { name: string; hours: number; revenue: number; visits: number }>();
  let knownOutstanding = 0;

  appointments.forEach((appointment) => outcomes.set(appointment.status, (outcomes.get(appointment.status) || 0) + 1));
  chronological.forEach((appointment) => {
    const date = appointment.completedAt || appointment.startAt;
    const key = bucketKey(date, days, timezone, locale);
    const point = timeline.get(key) || { name: key, revenue: 0, visits: 0, hours: 0 };
    point.revenue += Number(appointment.finalPrice || 0); point.visits += 1; point.hours += (appointment.actualDurationMinutes || 0) / 60; timeline.set(key, point);
    const validPayments = appointment.payments.filter((payment) => !payment.voidedAt);
    validPayments.forEach((payment) => payments.set(payment.methodNameSnapshot, (payments.get(payment.methodNameSnapshot) || 0) + Number(payment.amount)));
    if (!appointment.paymentReconciliationRequired) knownOutstanding += Math.max(0, Number(appointment.finalPrice || 0) - validPayments.reduce((sum, payment) => sum + Number(payment.amount), 0));
    const weekday = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", timeZone: timezone }).format(appointment.startAt);
    weekdays.set(weekday, (weekdays.get(weekday) || 0) + 1);
    const hour = new Intl.DateTimeFormat(intlLocale(locale), { hour: "numeric", timeZone: timezone }).format(appointment.startAt);
    hours.set(hour, (hours.get(hour) || 0) + 1);
    const month = new Intl.DateTimeFormat(intlLocale(locale), { month: "short", year: "numeric", timeZone: timezone }).format(date);
    const work = monthlyHours.get(month) || { name: month, hours: 0, revenue: 0, visits: 0 };
    work.hours += (appointment.actualDurationMinutes || 0) / 60; work.revenue += Number(appointment.finalPrice || 0); work.visits += 1; monthlyHours.set(month, work);
    const lines = appointment.actualServiceLines.length ? appointment.actualServiceLines.map((line) => ({ id: line.serviceId || `removed:${line.serviceNameSnapshot}`, name: line.serviceNameSnapshot, revenue: Number(line.finalPrice), minutes: line.actualDurationMinutes })) : [{ id: appointment.serviceId || `removed:${appointment.serviceNameSnapshot}`, name: appointment.serviceNameSnapshot, revenue: Number(appointment.finalPrice || 0), minutes: appointment.actualDurationMinutes || 0 }];
    lines.forEach((line) => { const row = servicePerformance.get(line.id) || { id: line.id, name: line.name, revenue: 0, visits: 0, hours: 0 }; row.revenue += line.revenue; row.visits += 1; row.hours += line.minutes / 60; servicePerformance.set(line.id, row); });
  });

  return {
    metrics: { ...core, outstanding: knownOutstanding, newCustomers, returningCustomers },
    timeline: [...timeline.values()],
    services: [...servicePerformance.values()].sort((a, b) => b.revenue - a.revenue),
    outcomes: [...outcomes].map(([name, value]) => ({ name, value })),
    payments: [...payments].map(([name, value]) => ({ name, value })),
    busiestDays: [...weekdays].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    busiestHours: [...hours].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    monthlyHours: [...monthlyHours.values()],
  };
}

export async function getReportData(businessId: string, query: ReportQuery, timezone: string, locale: AppLocale = "en") {
  const range = await reportRange(businessId, query, timezone);
  const now = new Date();
  const today = formatInTimeZone(now, timezone, "yyyy-MM-dd");
  const todayStart = fromZonedTime(`${today}T00:00:00`, timezone);
  const todayEnd = fromZonedTime(`${today}T23:59:59.999`, timezone);
  const include = { customer: true, serviceLines: { orderBy: { position: "asc" as const } }, actualServiceLines: { orderBy: { position: "asc" as const } }, payments: true };
  const currentWhere = filteredWhere(businessId, range.start, range.end, query);
  const previousWhere = filteredWhere(businessId, range.previousStart, range.previousEnd, query);
  const [current, previous, services, todayAppointments, upcoming, currentNewCustomers, previousNewCustomers] = await Promise.all([
    prisma.appointment.findMany({ where: currentWhere, include, orderBy: { startAt: "desc" } }),
    prisma.appointment.findMany({ where: previousWhere, include, orderBy: { startAt: "desc" } }),
    prisma.service.findMany({ where: { businessId, active: true, deletedAt: null, category: { active: true, deletedAt: null } }, include: { category: true }, orderBy: [{ category: { position: "asc" } }, { name: "asc" }] }),
    prisma.appointment.findMany({ where: { businessId, deletedAt: null, startAt: { gte: todayStart, lte: todayEnd }, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] } }, include: { customer: true }, orderBy: { startAt: "asc" } }),
    prisma.appointment.findMany({ where: { businessId, deletedAt: null, startAt: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } }, include: { customer: true }, orderBy: { startAt: "asc" }, take: 5 }),
    prisma.customer.count({ where: { businessId, deletedAt: null, createdAt: { gte: range.start, lte: range.end } } }),
    prisma.customer.count({ where: { businessId, deletedAt: null, createdAt: { gte: range.previousStart, lte: range.previousEnd } } }),
  ]);
  const currentCustomerIds = [...new Set(current.filter((item) => item.status === "COMPLETED").map((item) => item.customerId))];
  const previousCustomerIds = [...new Set(previous.filter((item) => item.status === "COMPLETED").map((item) => item.customerId))];
  const [currentReturning, previousReturning] = await Promise.all([
    currentCustomerIds.length ? prisma.appointment.groupBy({ by: ["customerId"], where: { businessId, deletedAt: null, customerId: { in: currentCustomerIds }, status: "COMPLETED", startAt: { lt: range.start } } }) : [],
    previousCustomerIds.length ? prisma.appointment.groupBy({ by: ["customerId"], where: { businessId, deletedAt: null, customerId: { in: previousCustomerIds }, status: "COMPLETED", startAt: { lt: range.previousStart } } }) : [],
  ]);
  return {
    range,
    current: summarize(current, currentNewCustomers, currentReturning.length, range.days, timezone, locale),
    previous: summarize(previous, previousNewCustomers, previousReturning.length, range.days, timezone, locale),
    overview: { todayCount: todayAppointments.length, todayAppointments, upcoming },
    services,
    records: current.slice(0, 250),
    recordCount: current.length,
  };
}
