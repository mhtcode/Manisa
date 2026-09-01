import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { customerName, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
const statuses = ["ALL","SCHEDULED","CONFIRMED","COMPLETED","CANCELLED","NO_SHOW"] as const;
export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const requested = (await searchParams).status || "ALL"; const status = statuses.includes(requested as typeof statuses[number]) ? requested : "ALL";
  const appointments = await prisma.appointment.findMany({ where: status === "ALL" ? {} : { status: status as Exclude<typeof statuses[number],"ALL"> }, include: { customer: true }, orderBy: { startAt: "desc" }, take: 150 });
  return <><PageHeading title="Appointments" description="Schedule, track, and complete customer appointments." actions={<Link className="button" href="/appointments/new">+ New appointment</Link>}/><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{statuses.map((item) => <Link key={item} href={item === "ALL" ? "/appointments" : `/appointments?status=${item}`} className={`button-secondary h-9 min-h-9 whitespace-nowrap px-3 ${status === item ? "border-teal-300/40 text-teal-300" : ""}`}>{item.toLowerCase().replace("_"," ")}</Link>)}</div><section className="panel overflow-hidden">{appointments.length ? <div className="divide-y divide-white/8">{appointments.map((item) => <Link href={`/appointments/${item.id}`} key={item.id} className="grid gap-3 px-5 py-4 hover:bg-white/[0.025] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:px-6"><div><p className="font-medium">{customerName(item.customer)}</p><p className="mt-1 text-sm text-slate-500">{item.serviceNameSnapshot} · {item.expectedDurationMinutes} min</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.startAt,"en")}</p><p className="mt-1 text-xs text-slate-600">{formatMoney(item.finalPrice || item.expectedPrice,item.currency)} · <span className="capitalize">{item.paymentStatus.toLowerCase().replace("_"," ")}</span></p></div><StatusBadge status={item.status}/></Link>)}</div> : <div className="empty">No appointments in this view.</div>}</section></>;
}
