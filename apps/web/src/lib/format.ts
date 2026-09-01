import type { Decimal } from "@prisma/client/runtime/library";
export function formatMoney(value: Decimal | string | number, currency = "CAD", locale: "en" | "fa" = "en") {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-CA", { style: "currency", currency }).format(Number(value));
}
export function customerName(customer: { firstName: string; lastName: string | null; displayName: string | null }) {
  return customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
}
