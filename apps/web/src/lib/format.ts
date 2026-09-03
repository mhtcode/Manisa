import type { Decimal } from "@prisma/client/runtime/library";
import { intlLocale } from "@/lib/i18n";
export function formatMoney(value: Decimal | string | number, currency = "CAD", locale: "en" | "fa" = "en") {
  return new Intl.NumberFormat(intlLocale(locale), { style: "currency", currency }).format(Number(value));
}
export function customerName(customer: { firstName: string; lastName: string | null; displayName: string | null }) {
  return customer.displayName || [customer.firstName, customer.lastName].filter(Boolean).join(" ");
}
