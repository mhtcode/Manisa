export type CustomerVisitRecord = {
  actualDurationMinutes: number | null;
  finalPrice: number | string | null;
  paymentStatus: string;
  serviceNames: string[];
  startAt: Date;
  status: string;
};

export function buildCustomerInsights(records: CustomerVisitRecord[], now = new Date()) {
  const completed = records.filter((record) => record.status === "COMPLETED" && record.startAt <= now);
  const historical = records.filter((record) => record.status === "HISTORICAL" && record.startAt <= now);
  const delivered = [...completed, ...historical].sort((a, b) => b.startAt.valueOf() - a.startAt.valueOf());
  const upcoming = records.filter((record) => record.startAt > now && ["SCHEDULED", "CONFIRMED"].includes(record.status)).sort((a, b) => a.startAt.valueOf() - b.startAt.valueOf());
  const noShows = records.filter((record) => record.status === "NO_SHOW").length;
  const cancelled = records.filter((record) => record.status === "CANCELLED").length;
  const serviceCounts = new Map<string, number>();
  delivered.forEach((record) => record.serviceNames.forEach((name) => serviceCounts.set(name, (serviceCounts.get(name) || 0) + 1)));
  const services = [...serviceCounts].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const revenue = completed.reduce((sum, record) => sum + Number(record.finalPrice || 0), 0);
  const actualMinutes = completed.reduce((sum, record) => sum + (record.actualDurationMinutes || 0), 0);
  const unsettledValue = completed.filter((record) => record.paymentStatus !== "PAID").reduce((sum, record) => sum + Number(record.finalPrice || 0), 0);
  const chronological = [...delivered].sort((a, b) => a.startAt.valueOf() - b.startAt.valueOf());
  const gaps = chronological.slice(1).map((record, index) => (record.startAt.valueOf() - chronological[index].startAt.valueOf()) / 86_400_000);
  const cadenceDays = gaps.length ? Math.round(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length) : null;
  const attendanceBase = completed.length + noShows;

  return {
    actualMinutes,
    attendanceRate: attendanceBase ? Math.round((completed.length / attendanceBase) * 100) : null,
    averageSpend: completed.length ? revenue / completed.length : 0,
    cadenceDays,
    cancelled,
    completedCount: completed.length,
    favoriteService: services[0] || null,
    firstVisit: chronological[0] || null,
    historicalCount: historical.length,
    latestVisit: delivered[0] || null,
    noShows,
    revenue,
    services,
    unsettledValue,
    upcoming,
  };
}
