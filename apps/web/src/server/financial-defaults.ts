import type { Prisma } from "@prisma/client";

const accounts = [
  ["Cash on hand", "CASH"],
  ["Bank", "BANK"],
  ["Undeposited funds", "OTHER"],
] as const;

const categories = [
  ["Appointment services", "INCOME"], ["Other income", "INCOME"],
  ["Supplies & materials", "EXPENSE"], ["Rent", "EXPENSE"], ["Utilities", "EXPENSE"],
  ["Advertising", "EXPENSE"], ["Insurance", "EXPENSE"], ["Professional fees", "EXPENSE"],
  ["Repairs & maintenance", "EXPENSE"], ["Bank fees", "EXPENSE"], ["Other expense", "EXPENSE"],
] as const;

export async function createFinancialDefaults(tx: Prisma.TransactionClient) {
  const createdAccounts = await Promise.all(accounts.map(([name, type], position) => tx.financialAccount.create({ data: { name, type, position } })));
  await Promise.all(categories.map(([name, type], position) => tx.financialCategory.create({ data: { name, type, position } })));
  return {
    cash: createdAccounts[0],
    bank: createdAccounts[1],
    undeposited: createdAccounts[2],
  };
}

export async function connectPaymentMethodDefaults(tx: Prisma.TransactionClient, accountIds: { cash: string; bank: string; undeposited: string }) {
  const methods = await tx.paymentMethod.findMany();
  await Promise.all(methods.map((method) => {
    const name = method.name.toLowerCase();
    const defaultAccountId = name === "cash" ? accountIds.cash : name.includes("legacy") || name.includes("unspecified") || name === "other" ? accountIds.undeposited : accountIds.bank;
    return tx.paymentMethod.update({ where: { id: method.id }, data: { defaultAccountId } });
  }));
}
