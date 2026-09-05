import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, CalendarCheck2, CalendarClock, CalendarPlus, History, Layers3, TriangleAlert } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { BulkSelection, SelectableLink } from "@/components/bulk-selection";
import { StatusBadge } from "@/components/status-badge";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName, formatMoney } from "@/lib/format";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { bulkMoveToTrash } from "@/server/actions/trash";

const stages = ["scheduled", "confirmed", "finalized", "historical", "exceptions", "all"] as const;
type Stage = typeof stages[number];

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ stage?: string; status?: string; from?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireBusinessPermission("appointments.view")]);
  const view = collectionView(user.settings?.collectionViews, "appointments", "list");
  const legacyStage = params.status === "COMPLETED" ? "finalized" : params.status === "CONFIRMED" ? "confirmed" : params.status === "CANCELLED" || params.status === "NO_SHOW" ? "exceptions" : params.status ? "scheduled" : undefined;
  const requested = params.stage || legacyStage || "scheduled";
  const stage: Stage = stages.includes(requested as Stage) ? requested as Stage : "scheduled";
  const stageWhere: Prisma.AppointmentWhereInput = stage === "scheduled" ? { status: "SCHEDULED" } : stage === "confirmed" ? { status: "CONFIRMED" } : stage === "finalized" ? { status: "COMPLETED" } : stage === "historical" ? { status: "HISTORICAL" } : stage === "exceptions" ? { status: { in: ["CANCELLED", "NO_SHOW"] } } : {};
  const where: Prisma.AppointmentWhereInput = { businessId: user.businessId, deletedAt: null, ...stageWhere };
  const [appointments, allMatchingIds, scheduledCount, confirmedCount, finalizedCount, historicalCount, exceptionCount, allCount] = await Promise.all([
    prisma.appointment.findMany({ where, include: { customer: true }, orderBy: { startAt: stage === "scheduled" || stage === "confirmed" ? "asc" : "desc" }, take: 150 }),
    prisma.appointment.findMany({ where, select: { id: true } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null, status: "SCHEDULED" } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null, status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null, status: "HISTORICAL" } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null, status: { in: ["CANCELLED", "NO_SHOW"] } } }),
    prisma.appointment.count({ where: { businessId: user.businessId, deletedAt: null } }),
  ]);
  const stageTitle = stage === "scheduled" ? "Scheduled estimates" : stage === "confirmed" ? "Confirmed appointments" : stage === "finalized" ? "Finalized visit records" : stage === "historical" ? "Manually added · Unreported" : stage === "exceptions" ? "Cancelled and no-show" : "All appointments";
  const stageHref = (nextStage: Stage) => `/appointments?stage=${nextStage}${params.from === "settings" ? "&from=settings" : ""}`;

  return <>
    <PageHeading backHref={params.from === "settings" ? "/settings" : undefined} title="Appointments" description="A clear path from estimated booking to confirmed visit and final business record." actions={<><ViewModeToggle initialMode={view} page="appointments"/><Link className="button" href="/appointments/new"><CalendarPlus size={17}/>New appointment</Link></>}/>
    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      <Link className={`min-w-0 rounded-2xl border p-3 transition active:scale-[.98] sm:p-4 ${stage === "scheduled" ? "border-sky-300/30 bg-sky-300/[0.075]" : "border-white/8 bg-[#0e131b] hover:border-white/15"}`} href={stageHref("scheduled")}><div className="flex items-center justify-between gap-1"><span className="flex size-8 items-center justify-center rounded-xl bg-sky-300/12 text-sky-300 sm:size-9"><CalendarClock size={17}/></span><span className="text-xl font-semibold text-white sm:text-2xl">{scheduledCount}</span></div><p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-sky-300 sm:mt-3 sm:text-xs">1 · Schedule</p><p className="mt-1.5 hidden text-xs leading-5 text-slate-500 sm:block">Create the estimated service plan.</p></Link>
      <Link className={`min-w-0 rounded-2xl border p-3 transition active:scale-[.98] sm:p-4 ${stage === "confirmed" ? "border-blue-300/30 bg-blue-400/[0.075]" : "border-white/8 bg-[#0e131b] hover:border-white/15"}`} href={stageHref("confirmed")}><div className="flex items-center justify-between gap-1"><span className="flex size-8 items-center justify-center rounded-xl bg-blue-400/12 text-blue-300 sm:size-9"><CalendarCheck2 size={17}/></span><span className="text-xl font-semibold text-white sm:text-2xl">{confirmedCount}</span></div><p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-blue-300 sm:mt-3 sm:text-xs">2 · Confirm</p><p className="mt-1.5 hidden text-xs leading-5 text-slate-500 sm:block">Customer commits to the visit.</p></Link>
      <Link className={`min-w-0 rounded-2xl border p-3 transition active:scale-[.98] sm:p-4 ${stage === "finalized" ? "border-emerald-300/30 bg-emerald-300/[0.075]" : "border-white/8 bg-[#0e131b] hover:border-white/15"}`} href={stageHref("finalized")}><div className="flex items-center justify-between gap-1"><span className="flex size-8 items-center justify-center rounded-xl bg-emerald-300/12 text-emerald-300 sm:size-9"><BadgeCheck size={17}/></span><span className="text-xl font-semibold text-white sm:text-2xl">{finalizedCount}</span></div><p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-wide text-emerald-300 sm:mt-3 sm:text-xs">3 · Finalize</p><p className="mt-1.5 hidden text-xs leading-5 text-slate-500 sm:block">Record actual services and income.</p></Link>
    </div>
    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1" data-horizontal-scroll><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "historical" ? "border-violet-300/30 bg-violet-300/8 text-violet-200" : ""}`} href={stageHref("historical")}><History size={15}/>Manually added · {historicalCount}</Link><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "exceptions" ? "border-rose-300/30 bg-rose-300/8 text-rose-200" : ""}`} href={stageHref("exceptions")}><TriangleAlert size={15}/>Exceptions · {exceptionCount}</Link><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "all" ? "border-blue-300/30 bg-blue-300/8 text-blue-200" : ""}`} href={stageHref("all")}><Layers3 size={15}/>All · {allCount}</Link></div>
    <BulkSelection action={bulkMoveToTrash.bind(null, "appointment")} allIds={allMatchingIds.map((item) => item.id)} locale={user.settings?.locale || "en"}><section className="panel overflow-hidden">
      <div className="panel-header"><h2 className="font-medium text-white">{stageTitle}</h2><span className="text-xs text-slate-600">{appointments.length} shown</span></div>
      {appointments.length ? <div className={view === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{appointments.map((item) => {
        const isFinalized = item.status === "COMPLETED";
        const isHistorical = item.status === "HISTORICAL";
        return <SelectableLink href={`/appointments/${item.id}`} id={item.id} key={item.id} className={view === "grid" ? "grid gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04]" : "grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:px-6"}><div className="min-w-0"><p className="truncate font-medium" dir="auto">{customerName(item.customer)}</p><p className="mt-1 truncate text-sm text-slate-500" dir="auto">{item.serviceNameSnapshot}</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.startAt,"en")}</p><p className={`mt-1 text-xs ${isFinalized ? "text-emerald-300/75" : isHistorical ? "text-violet-300/70" : "text-sky-300/65"}`}>{isFinalized ? `Actual · ${item.actualDurationMinutes || 0} min · ${formatMoney(item.finalPrice || 0,item.currency)}` : isHistorical ? `Manually added · ${item.expectedDurationMinutes} min · excluded from reports` : `Estimate · ${item.expectedDurationMinutes} min · ${formatMoney(item.expectedPrice,item.currency)}`}</p></div><StatusBadge status={item.status}/></SelectableLink>;
      })}</div> : <div className="empty">No appointments in this stage.</div>}
    </section></BulkSelection>
  </>;
}
