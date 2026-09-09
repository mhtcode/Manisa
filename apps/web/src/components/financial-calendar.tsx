import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatMoney } from "@/lib/format";

type DayTotal = { date: string; count: number; incoming: number; outgoing: number };

function shiftMonth(month: string, offset: number) {
  const [year, value] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, value - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function FinancialCalendar({ month, selectedDate, days, currency, period, locale }: { month: string; selectedDate?: string; days: DayTotal[]; currency: string; period: string; locale: "en" | "fa" }) {
  const [year, value] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, value - 1, 1));
  const dayCount = new Date(Date.UTC(year, value, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const totals = new Map(days.map((day) => [day.date, day]));
  const labels = locale === "fa" ? ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"] : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthLabel = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR-u-nu-latn" : "en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const hrefForMonth = (target: string) => `/settings/financial?section=overview&period=${period}&month=${target}`;
  return <section className="panel mb-5 min-w-0 overflow-hidden">
    <div className="panel-header"><div><p className="text-xs font-medium text-slate-500">Cash activity calendar</p><h2 className="mt-1 font-semibold capitalize">{monthLabel}</h2></div><div className="flex items-center gap-1"><Link aria-label="Previous month" className="icon-button" href={hrefForMonth(shiftMonth(month, -1))}><ChevronLeft className="rtl:rotate-180" size={17}/></Link><Link aria-label="Next month" className="icon-button" href={hrefForMonth(shiftMonth(month, 1))}><ChevronRight className="rtl:rotate-180" size={17}/></Link>{selectedDate && <Link aria-label="Clear selected date" className="icon-button" href={hrefForMonth(month)} title="Clear date"><X size={16}/></Link>}</div></div>
    <div className="min-w-0 p-2 sm:p-4">
      <div className="grid min-w-0 grid-cols-7 text-center text-[9px] font-semibold uppercase tracking-wide text-slate-600 sm:text-[10px]">{labels.map((label) => <span className="min-w-0 truncate px-0.5 py-2" key={label} title={label}>{label}</span>)}</div>
      <div className="grid min-w-0 grid-cols-7 gap-1">{Array.from({ length: offset }, (_, index) => <span aria-hidden="true" key={`blank-${index}`}/>) }{Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const date = `${month}-${String(day).padStart(2, "0")}`;
        const total = totals.get(date);
        const net = (total?.incoming || 0) - (total?.outgoing || 0);
        return <Link aria-label={`${date}${total ? `, ${total.count} transactions, net ${formatMoney(net, currency)}` : ", no transactions"}`} className={`group min-h-16 min-w-0 rounded-xl p-2 transition sm:min-h-24 ${selectedDate === date ? "bg-blue-400/12 ring-1 ring-blue-300/45" : "bg-white/[0.025] hover:bg-white/[0.055]"}`} href={`/settings/financial?section=transactions&period=${period}&month=${month}&date=${date}`} key={date}><span className="block text-xs font-semibold text-slate-300">{day}</span>{total && <><span className={`mt-2 block size-1.5 rounded-full ${net >= 0 ? "bg-emerald-300" : "bg-rose-300"}`}/><span className={`mt-1 hidden truncate text-[10px] font-medium sm:block ${net >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{net >= 0 ? "+" : ""}{formatMoney(net, currency)}</span><span className="mt-1 hidden text-[9px] text-slate-600 sm:block">{total.count} {total.count === 1 ? "entry" : "entries"}</span></>}</Link>;
      })}</div>
    </div>
  </section>;
}
