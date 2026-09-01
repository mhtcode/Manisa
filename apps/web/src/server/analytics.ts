import "server-only";
import { addDays, startOfWeek } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TIMEZONE } from "@/lib/time";

function dayRange(timezone: string) {
  const day = formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
  return { start: fromZonedTime(`${day}T00:00`, timezone), end: fromZonedTime(`${day}T23:59:59.999`, timezone) };
}

export async function getDashboardData(timezone = DEFAULT_TIMEZONE) {
  const now = new Date();
  const today = dayRange(timezone);
  const zonedNow = toZonedTime(now, timezone);
  const weekStartLocal = startOfWeek(zonedNow, { weekStartsOn: 1 });
  const weekStart = fromZonedTime(weekStartLocal, timezone);
  const monthStart = fromZonedTime(`${formatInTimeZone(now, timezone, "yyyy-MM")}-01T00:00`, timezone);
  const yearStart = fromZonedTime(`${formatInTimeZone(now, timezone, "yyyy")}-01-01T00:00`, timezone);

  const [todayCount, weekCount, customerCount, customerGroups, monthRevenue, yearRevenue, outstanding, work, upcoming, completed] = await Promise.all([
    prisma.appointment.count({ where: { startAt: { gte: today.start, lte: today.end }, status: { in: ["SCHEDULED", "CONFIRMED", "COMPLETED"] } } }),
    prisma.appointment.count({ where: { startAt: { gte: weekStart, lt: addDays(weekStart, 7) }, status: { not: "CANCELLED" } } }),
    prisma.customer.count({ where: { active: true } }),
    prisma.appointment.groupBy({ by: ["customerId"], where: { status: "COMPLETED" }, _count: true }),
    prisma.appointment.aggregate({ where: { status: "COMPLETED", completedAt: { gte: monthStart } }, _sum: { finalPrice: true } }),
    prisma.appointment.aggregate({ where: { status: "COMPLETED", completedAt: { gte: yearStart } }, _sum: { finalPrice: true } }),
    prisma.appointment.aggregate({ where: { status: "COMPLETED", paymentStatus: { not: "PAID" } }, _sum: { finalPrice: true } }),
    prisma.appointment.aggregate({ where: { status: "COMPLETED", completedAt: { gte: monthStart } }, _sum: { actualDurationMinutes: true, finalPrice: true } }),
    prisma.appointment.findMany({ where: { startAt: { gte: now }, status: { in: ["SCHEDULED", "CONFIRMED"] } }, include: { customer: true }, orderBy: { startAt: "asc" }, take: 6 }),
    prisma.appointment.findMany({ where: { status: "COMPLETED", completedAt: { gte: new Date(now.getTime() - 180 * 86400000) } }, select: { completedAt: true, finalPrice: true, serviceNameSnapshot: true }, orderBy: { completedAt: "asc" } }),
  ]);

  const hours = (work._sum.actualDurationMinutes || 0) / 60;
  const revenue = Number(work._sum.finalPrice || 0);
  const revenueByMonth = new Map<string, number>();
  const serviceRevenue = new Map<string, number>();
  completed.forEach((item) => {
    const month = formatInTimeZone(item.completedAt!, timezone, "MMM");
    revenueByMonth.set(month, (revenueByMonth.get(month) || 0) + Number(item.finalPrice || 0));
    serviceRevenue.set(item.serviceNameSnapshot, (serviceRevenue.get(item.serviceNameSnapshot) || 0) + Number(item.finalPrice || 0));
  });

  return {
    kpis: { todayCount, weekCount, customerCount, returningCustomers: customerGroups.filter((item) => item._count > 1).length, monthRevenue: Number(monthRevenue._sum.finalPrice || 0), yearRevenue: Number(yearRevenue._sum.finalPrice || 0), outstanding: Number(outstanding._sum.finalPrice || 0), hours, hourlyIncome: hours ? revenue / hours : 0 },
    upcoming,
    revenueByMonth: [...revenueByMonth].map(([name, value]) => ({ name, value })),
    serviceRevenue: [...serviceRevenue].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
  };
}
