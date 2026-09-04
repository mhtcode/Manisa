export type PaymentInput = { methodId: string; amount: string };

export function paymentStatusFor(finalPrice: number, paidAmount: number) {
  if (paidAmount <= 0) return "UNPAID" as const;
  if (paidAmount + 0.001 < finalPrice) return "PARTIALLY_PAID" as const;
  return "PAID" as const;
}

export function parsePaymentInputs(formData: FormData): PaymentInput[] {
  const methodIds = formData.getAll("paymentMethodId").map(String);
  const amounts = formData.getAll("paymentAmount").map(String);
  return methodIds.map((methodId, index) => ({ methodId, amount: amounts[index] || "" })).filter((item) => item.methodId || item.amount);
}
