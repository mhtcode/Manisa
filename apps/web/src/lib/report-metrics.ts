type CoreRecord = { status: string; finalPrice: unknown; actualDurationMinutes: number | null; paymentStatus: string };

export function calculateCoreReportMetrics(records: CoreRecord[]) {
  const completed = records.filter((record) => record.status === "COMPLETED");
  const revenue = completed.reduce((sum, record) => sum + Number(record.finalPrice || 0), 0);
  const minutes = completed.reduce((sum, record) => sum + (record.actualDurationMinutes || 0), 0);
  return {
    revenue,
    visits: completed.length,
    hours: minutes / 60,
    hourlyIncome: minutes ? revenue / (minutes / 60) : 0,
    averageTicket: completed.length ? revenue / completed.length : 0,
    outstanding: completed.filter((record) => record.paymentStatus !== "PAID").reduce((sum, record) => sum + Number(record.finalPrice || 0), 0),
    cancellations: records.filter((record) => record.status === "CANCELLED").length,
    noShows: records.filter((record) => record.status === "NO_SHOW").length,
  };
}

export function reportPercentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}
