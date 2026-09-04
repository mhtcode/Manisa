type Money = number | string | { toString(): string };
type Visit = { finalPrice: Money | null; paymentStatus: "PAID" | "UNPAID" | "PARTIALLY_PAID"; paymentReconciliationRequired: boolean; payments: Array<{ amount: Money }> };
type Transaction = { appointmentId: string; amount: Money };

const amount = (value: Money | null) => Number(value || 0);

export function calculateFinancialMetrics(visits: Visit[], transactions: Transaction[]) {
  const finalRevenue = visits.reduce((sum, visit) => sum + amount(visit.finalPrice), 0);
  const collected = transactions.reduce((sum, transaction) => sum + amount(transaction.amount), 0);
  const payingVisits = new Set(transactions.map((transaction) => transaction.appointmentId)).size;
  const outstanding = visits.filter((visit) => !visit.paymentReconciliationRequired).reduce((sum, visit) => {
    const paid = visit.payments.reduce((paymentSum, payment) => paymentSum + amount(payment.amount), 0);
    return sum + Math.max(0, amount(visit.finalPrice) - paid);
  }, 0);
  return {
    finalRevenue,
    collected,
    outstanding,
    averageCollection: payingVisits ? collected / payingVisits : 0,
    paidVisits: visits.filter((visit) => visit.paymentStatus === "PAID").length,
    partialVisits: visits.filter((visit) => visit.paymentStatus === "PARTIALLY_PAID").length,
    unpaidVisits: visits.filter((visit) => visit.paymentStatus === "UNPAID").length,
    unreconciledVisits: visits.filter((visit) => visit.paymentReconciliationRequired).length,
  };
}
