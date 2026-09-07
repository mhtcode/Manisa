export type CashMovement = {
  type: "INCOME" | "EXPENSE" | "TRANSFER" | "OPENING_ADJUSTMENT" | "APPOINTMENT_PAYMENT" | "BILL_PAYMENT";
  amount: number;
  accountId: string;
  destinationAccountId?: string | null;
};

export type CashAccount = { id: string; openingBalance: number };

export function calculateCashbook(accounts: CashAccount[], before: CashMovement[], period: CashMovement[]) {
  const openingByAccount = new Map(accounts.map((account) => [account.id, account.openingBalance]));
  const apply = (balances: Map<string, number>, item: CashMovement) => {
    if (item.type === "TRANSFER") {
      balances.set(item.accountId, (balances.get(item.accountId) || 0) - item.amount);
      if (item.destinationAccountId) balances.set(item.destinationAccountId, (balances.get(item.destinationAccountId) || 0) + item.amount);
    } else if (item.type === "EXPENSE" || item.type === "BILL_PAYMENT") {
      balances.set(item.accountId, (balances.get(item.accountId) || 0) - item.amount);
    } else {
      balances.set(item.accountId, (balances.get(item.accountId) || 0) + item.amount);
    }
  };
  before.forEach((item) => apply(openingByAccount, item));
  const opening = [...openingByAccount.values()].reduce((sum, value) => sum + value, 0);
  const cashIn = period.filter((item) => item.type === "INCOME" || item.type === "APPOINTMENT_PAYMENT" || item.type === "OPENING_ADJUSTMENT").reduce((sum, item) => sum + item.amount, 0);
  const cashOut = period.filter((item) => item.type === "EXPENSE" || item.type === "BILL_PAYMENT").reduce((sum, item) => sum + item.amount, 0);
  const closingByAccount = new Map(openingByAccount);
  period.forEach((item) => apply(closingByAccount, item));
  return { opening, cashIn, cashOut, netCashFlow: cashIn - cashOut, closing: [...closingByAccount.values()].reduce((sum, value) => sum + value, 0), balances: closingByAccount };
}

export function billPaymentStatus(total: number, paid: number, dueDate?: Date | null, now = new Date()) {
  if (paid >= total - 0.001) return "PAID" as const;
  if (dueDate && dueDate < now) return "OVERDUE" as const;
  if (paid > 0) return "PARTIAL" as const;
  return "UNPAID" as const;
}
