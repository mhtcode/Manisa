import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Banknote, CalendarCheck2, CalendarClock, ChartNoAxesCombined, Clock3, Contact, GitFork, History, Sparkles, Trash2, TrendingUp, UserCheck } from "lucide-react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { CustomerAvatarUploader } from "@/components/customer-avatar-uploader";
import { buildCustomerInsights } from "@/lib/customer-insights";
import { customerName, formatMoney } from "@/lib/format";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { moveToTrash } from "@/server/actions/trash";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireBusinessPermission("customers.view");
  const customer = await prisma.customer.findUnique({ where: { id, businessId: user.businessId, deletedAt: null }, include: { referrer: true, referrals: { where: { deletedAt: null }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }, appointments: { where: { deletedAt: null }, include: { serviceLines: { orderBy: { position: "asc" } }, actualServiceLines: { orderBy: { position: "asc" } } }, orderBy: { startAt: "desc" } } } });
  if (!customer) notFound();
  const profilePhoto = await prisma.mediaAsset.findFirst({ where: { businessId: user.businessId, customerId: id, ownerType: "CUSTOMER_AVATAR", deletedAt: null, status: "READY" }, select: { id: true } });
  const now = new Date();
  const insights = buildCustomerInsights(customer.appointments.map((appointment) => ({
    actualDurationMinutes: appointment.actualDurationMinutes,
    finalPrice: appointment.finalPrice?.toString() || null,
    paymentStatus: appointment.paymentStatus,
    serviceNames: appointment.status === "COMPLETED" && appointment.actualServiceLines.length ? appointment.actualServiceLines.map((line) => line.serviceNameSnapshot) : appointment.serviceLines.length ? appointment.serviceLines.map((line) => line.serviceNameSnapshot) : [appointment.serviceNameSnapshot],
    startAt: appointment.startAt,
    status: appointment.status,
  })), now);
  const latestVisit = insights.latestVisit;
  const firstVisit = insights.firstVisit;
  const nextVisit = insights.upcoming[0];
  const reportCards = [
    { label: "Finalized visits", value: String(insights.completedCount), icon: CalendarCheck2 },
    { label: "Lifetime income", value: formatMoney(insights.revenue), icon: Banknote },
    { label: "Average visit", value: formatMoney(insights.averageSpend), icon: TrendingUp },
    { label: "Service hours", value: `${(insights.actualMinutes / 60).toFixed(1)}h`, icon: Clock3 },
    { label: "Attendance", value: insights.attendanceRate === null ? "—" : `${insights.attendanceRate}%`, icon: UserCheck },
    { label: "Upcoming", value: String(insights.upcoming.length), icon: CalendarClock },
  ];

  return <>
    <PageHeading title={customerName(customer)} description="Customer relationship report built from stored appointment, service, and payment history." actions={<><Link className="button" href={`/appointments/new?customerId=${id}`}>+ Appointment</Link><Link className="button-secondary" href={`/customers/${id}/edit`}>Edit profile</Link></>}/>
    <CustomerAvatarUploader assetId={profilePhoto?.id} customerId={id} name={customerName(customer)}/>
    <div className="mb-5 flex flex-wrap items-center gap-2"><span className="badge border-teal-300/20 bg-teal-300/8 text-teal-200"><ChartNoAxesCombined size={13}/>Database-backed report</span>{customer.referrer && !customer.referrer.deletedAt && <span className="badge border-blue-300/20 bg-blue-300/8 text-blue-200"><GitFork size={13}/>Referred by {customerName(customer.referrer)}</span>}{insights.historicalCount > 0 && <span className="badge border-violet-300/20 bg-violet-300/8 text-violet-200"><History size={13}/>{insights.historicalCount} manually added · unreported</span>}<span className={`badge ${customer.active ? "border-emerald-300/20 bg-emerald-300/8 text-emerald-200" : "border-slate-300/15 text-slate-400"}`}>{customer.active ? "Active customer" : "Disabled customer"}</span></div>

    <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-6">{reportCards.map(({ label, value, icon: Icon }) => <article className="stat min-w-0 p-3.5 sm:p-4" key={label}><Icon className="text-teal-300/65" size={17}/><p className="mt-3 text-[11px] text-slate-500">{label}</p><p className="mt-1.5 truncate text-lg font-semibold tracking-tight text-white">{value}</p></article>)}</section>

    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <div className="space-y-5">
        <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-medium text-white">Relationship insights</h2><p className="mt-1 text-xs text-slate-500">Recency, frequency, preferences, and value</p></div></div><div className="grid gap-px bg-white/8 sm:grid-cols-2"><div className="bg-[#0e131b] p-5"><p className="text-xs text-slate-600">Latest visit</p><p className="mt-2 font-medium text-white">{latestVisit ? formatBusinessDate(latestVisit.startAt, "en") : "No completed visits"}</p><p className="mt-1 text-xs text-slate-500">{latestVisit ? `${latestVisit.serviceNames.join(" + ")} · ${formatDistanceToNow(latestVisit.startAt, { addSuffix: true })}` : "History will appear after a visit or import."}</p></div><div className="bg-[#0e131b] p-5"><p className="text-xs text-slate-600">Most booked service</p><p className="mt-2 font-medium text-white" dir="auto">{insights.favoriteService?.name || "Not enough history"}</p><p className="mt-1 text-xs text-slate-500">{insights.favoriteService ? `${insights.favoriteService.count} recorded service lines` : "No delivered services yet."}</p></div><div className="bg-[#0e131b] p-5"><p className="text-xs text-slate-600">Typical return cadence</p><p className="mt-2 font-medium text-white">{insights.cadenceDays ? `Every ${insights.cadenceDays} days` : "Not enough history"}</p><p className="mt-1 text-xs text-slate-500">Average interval between recorded visits.</p></div><div className="bg-[#0e131b] p-5"><p className="text-xs text-slate-600">Next appointment</p><p className="mt-2 font-medium text-white">{nextVisit ? formatBusinessDate(nextVisit.startAt, "en") : "Nothing scheduled"}</p><p className="mt-1 text-xs text-slate-500">{nextVisit?.serviceNames.join(" + ") || "Create an appointment when ready."}</p></div></div></section>

        <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-medium text-white">Service preferences</h2><p className="mt-1 text-xs text-slate-500">Frequency across finalized and manually added visits</p></div><Sparkles className="text-violet-300/65" size={18}/></div>{insights.services.length ? <div className="divide-y divide-white/8">{insights.services.map((service) => { const maximum = insights.services[0].count; return <div className="px-5 py-4" key={service.name}><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium text-slate-200" dir="auto">{service.name}</p><span className="text-xs text-slate-500">{service.count}×</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-violet-400/70 to-teal-300/70" style={{ width: `${Math.max(12, (service.count / maximum) * 100)}%` }}/></div></div>; })}</div> : <div className="empty">Service preferences will appear as history grows.</div>}</section>

        <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-medium text-white">Appointment history</h2><p className="mt-1 text-xs text-slate-500">Complete stored activity timeline</p></div><span className="text-xs text-slate-600">{customer.appointments.length} records</span></div>{customer.appointments.length ? <div className="divide-y divide-white/8">{customer.appointments.map((item) => <Link key={item.id} href={`/appointments/${item.id}`} className="flex flex-col gap-2 px-5 py-4 transition hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium" dir="auto">{item.serviceNameSnapshot}</p><p className="mt-1 text-sm text-slate-500">{formatBusinessDate(item.startAt, "en")} · {item.actualDurationMinutes || item.expectedDurationMinutes} min</p></div><div className="flex shrink-0 items-center gap-2"><StatusBadge status={item.status}/>{item.status === "COMPLETED" && item.finalPrice !== null && <span className="text-sm text-slate-400">{formatMoney(item.finalPrice, item.currency)}</span>}</div></Link>)}</div> : <div className="empty">No appointments yet.</div>}</section>
      </div>

      <aside className="space-y-5">
        <section className="panel overflow-hidden"><div className="panel-header"><div className="flex items-center gap-2"><GitFork className="text-blue-300" size={18}/><h2 className="font-medium text-white">Referral network</h2></div><Link className="text-xs font-semibold text-blue-300" href="/settings/referrals">Open graph</Link></div><div className="space-y-4 p-5"><div><p className="text-xs text-slate-600">Referred by</p>{customer.referrer && !customer.referrer.deletedAt ? <Link className="mt-1.5 block text-sm font-semibold text-blue-200 hover:text-white" href={`/customers/${customer.referrer.id}`} dir="auto">{customerName(customer.referrer)}</Link> : <p className="mt-1.5 text-sm text-slate-400">No referral source recorded</p>}</div><div className="border-t border-white/8 pt-4"><p className="text-xs text-slate-600">Customers referred ({customer.referrals.length})</p>{customer.referrals.length ? <div className="mt-2 flex flex-wrap gap-2">{customer.referrals.map((referral) => <Link className="rounded-full border border-blue-300/15 bg-blue-400/[0.06] px-2.5 py-1 text-xs text-blue-200 hover:border-blue-300/30" dir="auto" href={`/customers/${referral.id}`} key={referral.id}>{customerName(referral)}</Link>)}</div> : <p className="mt-1.5 text-sm text-slate-400">No recorded referrals yet</p>}</div></div></section>
        <section className="panel p-5 sm:p-6"><div className="flex items-center gap-2"><Contact className="text-teal-300/70" size={18}/><h2 className="font-medium text-white">Profile</h2></div><dl className="mt-5 space-y-4 text-sm"><div><dt className="text-xs text-slate-600">Phone</dt><dd className="mt-1 text-slate-300">{customer.phone || "—"}</dd></div><div><dt className="text-xs text-slate-600">Email</dt><dd className="mt-1 break-all text-slate-300">{customer.email || "—"}</dd></div><div><dt className="text-xs text-slate-600">Address</dt><dd className="mt-1 whitespace-pre-wrap text-slate-300">{customer.address || "—"}</dd></div><div><dt className="text-xs text-slate-600">Preferred language</dt><dd className="mt-1 text-slate-300">{customer.preferredLanguage === "fa" ? "فارسی" : "English"}</dd></div><div><dt className="text-xs text-slate-600">Customer since</dt><dd className="mt-1 text-slate-300">{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(customer.createdAt)}</dd></div><div><dt className="text-xs text-slate-600">Notes and preferences</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-slate-300">{customer.notes || "No profile notes yet."}</dd></div></dl></section>

        <section className="panel p-5 sm:p-6"><h2 className="font-medium text-white">Operational summary</h2><dl className="mt-5 space-y-3 text-sm"><div className="flex items-center justify-between gap-3"><dt className="text-slate-500">First recorded visit</dt><dd className="text-right text-slate-300">{firstVisit ? new Intl.DateTimeFormat("en-CA", { dateStyle: "medium" }).format(firstVisit.startAt) : "—"}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-slate-500">No-shows</dt><dd className="text-slate-300">{insights.noShows}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Cancellations</dt><dd className="text-slate-300">{insights.cancelled}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Unsettled visit value</dt><dd className="text-slate-300">{formatMoney(insights.unsettledValue)}</dd></div><div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Stored appointments</dt><dd className="text-slate-300">{customer.appointments.length}</dd></div></dl></section>

        <ConfirmActionForm action={moveToTrash.bind(null, "customer", id)} className="icon-button border-rose-400/20 text-rose-300" message={`Move ${customerName(customer)} to Trash? Their appointments and visit photos will move with them. Everything will be permanently deleted after seven days unless restored.`} title="Move customer to Trash"><Trash2 size={16}/><span className="sr-only">Move customer to Trash</span></ConfirmActionForm>
      </aside>
    </div>
  </>;
}
