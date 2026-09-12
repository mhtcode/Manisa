import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, CalendarCheck2, CalendarClock, CalendarPlus, History, Inbox, Layers3, TriangleAlert } from "lucide-react";
import { BookingRequestActions } from "@/components/booking-request-actions";
import { BulkSelection, SelectableLink } from "@/components/bulk-selection";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName, formatMoney } from "@/lib/format";
import { hasBusinessPermission } from "@/lib/permissions";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { bulkMoveToTrash } from "@/server/actions/trash";

const stages = ["requests", "scheduled", "confirmed", "finalized", "historical", "exceptions", "all"] as const;
type Stage = (typeof stages)[number];

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<{ stage?: string; status?: string; from?: string }> }) {
  const [params, user] = await Promise.all([searchParams, requireBusinessPermission("appointments.view")]);
  const view = collectionView(user.settings?.collectionViews, "appointments", "list");
  const legacyStage = params.stage === "requested" ? "requests" : params.status === "COMPLETED" ? "finalized" : params.status === "CONFIRMED" ? "confirmed" : params.status === "CANCELLED" || params.status === "NO_SHOW" ? "exceptions" : params.status ? "scheduled" : undefined;
  const requested = params.stage === "requested" ? "requests" : params.stage || legacyStage || "scheduled";
  const stage: Stage = stages.includes(requested as Stage) ? requested as Stage : "scheduled";
  const stageWhere: Prisma.AppointmentWhereInput = stage === "scheduled" ? { status: "SCHEDULED" } : stage === "confirmed" ? { status: "CONFIRMED" } : stage === "finalized" ? { status: "COMPLETED" } : stage === "historical" ? { status: "HISTORICAL" } : stage === "exceptions" ? { status: { in: ["CANCELLED", "NO_SHOW"] } } : {};
  const where: Prisma.AppointmentWhereInput = { deletedAt: null, ...stageWhere };
  const [appointments, allMatchingIds, bookingRequests, requestCount, scheduledCount, confirmedCount, finalizedCount, historicalCount, exceptionCount, allCount] = await Promise.all([
    stage === "requests" ? Promise.resolve([]) : prisma.appointment.findMany({ where, include: { customer: true }, orderBy: { startAt: ["scheduled", "confirmed"].includes(stage) ? "asc" : "desc" }, take: 150 }),
    stage === "requests" ? Promise.resolve([]) : prisma.appointment.findMany({ where, select: { id: true } }),
    stage === "requests" ? prisma.publicBookingRequest.findMany({ where: { status: "PENDING" }, include: { services: { orderBy: { position: "asc" } }, reviewedBy: { select: { name: true } } }, orderBy: { requestedStartAt: "asc" }, take: 150 }) : Promise.resolve([]),
    prisma.publicBookingRequest.count({ where: { status: "PENDING" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "SCHEDULED" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "CONFIRMED" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: "HISTORICAL" } }),
    prisma.appointment.count({ where: { deletedAt: null, status: { in: ["CANCELLED", "NO_SHOW"] } } }),
    prisma.appointment.count({ where: { deletedAt: null } }),
  ]);
  const canManage = hasBusinessPermission(user.role, user.permissionOverrides, "appointments.manage");
  const stageTitle = stage === "requests" ? "Online booking requests" : stage === "scheduled" ? "Scheduled estimates" : stage === "confirmed" ? "Confirmed appointments" : stage === "finalized" ? "Finalized visit records" : stage === "historical" ? "Manually added · Unreported" : stage === "exceptions" ? "Cancelled and no-show" : "All appointments";
  const stageHref = (nextStage: Stage) => `/appointments?stage=${nextStage}${params.from === "settings" ? "&from=settings" : ""}`;

  return <>
    <PageHeading backHref={params.from === "settings" ? "/settings" : undefined} title="Appointments" description="Review online requests, schedule estimates, and confirm visits." actions={<><ViewModeToggle initialMode={view} page="appointments"/><Link className="button" href="/appointments/new"><CalendarPlus size={17}/>New appointment</Link></>}/>
    <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
      <StageCard active={stage === "scheduled"} count={scheduledCount} href={stageHref("scheduled")} icon={CalendarClock} label="Schedule" tone="sky"/>
      <StageCard active={stage === "confirmed"} count={confirmedCount} href={stageHref("confirmed")} icon={CalendarCheck2} label="Confirm" tone="blue"/>
      <StageCard active={stage === "finalized"} count={finalizedCount} href={stageHref("finalized")} icon={BadgeCheck} label="Finalize" tone="emerald"/>
    </div>
    <div className="mb-4 flex flex-wrap items-center gap-2"><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "requests" ? "border-fuchsia-300/30 bg-fuchsia-300/8 text-fuchsia-200" : ""}`} href={stageHref("requests")}><Inbox size={15}/>Requests · {requestCount}</Link><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "historical" ? "border-violet-300/30 bg-violet-300/8 text-violet-200" : ""}`} href={stageHref("historical")}><History size={15}/>Manually added · {historicalCount}</Link><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "exceptions" ? "border-rose-300/30 bg-rose-300/8 text-rose-200" : ""}`} href={stageHref("exceptions")}><TriangleAlert size={15}/>Exceptions · {exceptionCount}</Link><Link className={`button-secondary h-9 min-h-9 shrink-0 px-3 ${stage === "all" ? "border-blue-300/30 bg-blue-300/8 text-blue-200" : ""}`} href={stageHref("all")}><Layers3 size={15}/>All · {allCount}</Link></div>

    {stage === "requests" ? <section className="panel overflow-hidden"><div className="panel-header"><h2 className="font-medium text-white">{stageTitle}</h2><span className="text-xs text-slate-600">{bookingRequests.length} shown</span></div>{bookingRequests.length ? <div className={view === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{bookingRequests.map((item) => <article className={view === "grid" ? "rounded-xl border border-fuchsia-300/12 bg-fuchsia-300/[0.025] p-4" : "grid gap-3 px-4 py-4 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center sm:px-6"} key={item.id}><div className="min-w-0"><p className="truncate font-medium" dir="auto">{item.customerName}</p><p className="mt-1 truncate text-sm text-slate-500" dir="auto">{item.services.map((service) => service.serviceNameSnapshot).join(" · ")}</p><p className="mt-1 text-xs text-slate-600" dir="ltr">{item.phone}{item.email ? ` · ${item.email}` : ""}</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.requestedStartAt, "en", user.settings.timezone)}</p><p className="mt-1 text-xs text-fuchsia-200/70">{item.durationMinutes} min · {formatMoney(item.totalPrice, item.currency)}</p></div>{canManage ? <BookingRequestActions id={item.id}/> : <span className="badge">Pending</span>}</article>)}</div> : <div className="empty">No booking requests are waiting.</div>}</section> : <BulkSelection action={bulkMoveToTrash.bind(null, "appointment")} allIds={allMatchingIds.map((item) => item.id)} locale={user.settings?.locale || "en"}><section className="panel overflow-hidden">
      <div className="panel-header"><h2 className="font-medium text-white">{stageTitle}</h2><span className="text-xs text-slate-600">{appointments.length} shown</span></div>
      {appointments.length ? <div className={view === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{appointments.map((item) => {
        const isFinalized = item.status === "COMPLETED";
        const isHistorical = item.status === "HISTORICAL";
        return <SelectableLink href={`/appointments/${item.id}`} id={item.id} key={item.id} className={view === "grid" ? "grid gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04]" : "grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:px-6"}><div className="min-w-0"><p className="truncate font-medium" dir="auto">{customerName(item.customer)}</p><p className="mt-1 truncate text-sm text-slate-500" dir="auto">{item.serviceNameSnapshot}</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.startAt,"en")}</p><p className={`mt-1 text-xs ${isFinalized ? "text-emerald-300/75" : isHistorical ? "text-violet-300/70" : "text-sky-300/65"}`}>{isFinalized ? `Actual · ${item.actualDurationMinutes || 0} min · ${formatMoney(item.finalPrice || 0,item.currency)}` : isHistorical ? `Manually added · ${item.expectedDurationMinutes} min · excluded from reports` : `Estimate · ${item.expectedDurationMinutes} min · ${formatMoney(item.expectedPrice,item.currency)}`}</p></div><StatusBadge status={item.status}/></SelectableLink>;
      })}</div> : <div className="empty">No appointments in this stage.</div>}
    </section></BulkSelection>}
  </>;
}

function StageCard({ active, count, href, icon: Icon, label, tone }: { active: boolean; count: number; href: string; icon: typeof CalendarClock; label: string; tone: "sky" | "blue" | "emerald" }) {
  const colors = tone === "sky" ? "text-sky-300 bg-sky-300/12 border-sky-300/30" : tone === "blue" ? "text-blue-300 bg-blue-400/12 border-blue-300/30" : "text-emerald-300 bg-emerald-300/12 border-emerald-300/30";
  return <Link className={`min-w-0 rounded-2xl border p-3 transition active:scale-[.98] sm:p-4 ${active ? colors.split(" ").at(-1) + " bg-white/[0.055]" : "border-white/8 bg-[#0e131b] hover:border-white/15"}`} href={href}><div className="flex items-center justify-between gap-1"><span className={`flex size-8 items-center justify-center rounded-xl sm:size-9 ${colors.split(" ").slice(0, 2).join(" ")}`}><Icon size={17}/></span><span className="text-xl font-semibold text-white sm:text-2xl">{count}</span></div><p className={`mt-2 truncate text-[10px] font-semibold uppercase tracking-wide sm:mt-3 sm:text-xs ${colors.split(" ")[0]}`}>{label}</p></Link>;
}
