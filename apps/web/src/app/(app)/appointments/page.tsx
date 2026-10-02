import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { BadgeCheck, CalendarCheck2, CalendarClock, CalendarPlus, History, Inbox, Layers3, TriangleAlert } from "lucide-react";
import { BookingRequestActions } from "@/components/booking-request-actions";
import { BulkSelection, BulkSelectionControls, SelectableLink } from "@/components/bulk-selection";
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
    <PageHeading backHref={params.from === "settings" ? "/settings" : undefined} title="Appointments" description="Review online requests, schedule estimates, and confirm visits." actions={<Link className="button" href="/appointments/new"><CalendarPlus size={17}/>New appointment</Link>}/>
    <nav aria-label="Appointment stages" className="mb-4 flex items-center overflow-x-auto border-b border-white/8 pb-2 [scrollbar-width:none] [&>a+a]:border-s [&>a+a]:border-white/10">
      <StageNavItem active={stage === "all"} count={allCount} href={stageHref("all")} icon={Layers3} label="All"/>
      <StageNavItem active={stage === "scheduled"} count={scheduledCount} href={stageHref("scheduled")} icon={CalendarClock} label="Schedule"/>
      <StageNavItem active={stage === "confirmed"} count={confirmedCount} href={stageHref("confirmed")} icon={CalendarCheck2} label="Confirm"/>
      <StageNavItem active={stage === "finalized"} count={finalizedCount} href={stageHref("finalized")} icon={BadgeCheck} label="Finalized"/>
      <StageNavItem active={stage === "requests"} count={requestCount} href={stageHref("requests")} icon={Inbox} label="Requests"/>
      <StageNavItem active={stage === "historical"} count={historicalCount} href={stageHref("historical")} icon={History} label="Manually added"/>
      <StageNavItem active={stage === "exceptions"} count={exceptionCount} href={stageHref("exceptions")} icon={TriangleAlert} label="Exceptions"/>
    </nav>

    {stage === "requests" ? <section className="panel overflow-hidden"><div className="panel-header"><div><h2 className="font-medium text-white">{stageTitle}</h2><span className="text-xs text-slate-600">{bookingRequests.length} shown</span></div><ViewModeToggle initialMode={view} page="appointments"/></div>{bookingRequests.length ? <div className={view === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{bookingRequests.map((item) => <article className={view === "grid" ? "rounded-xl border border-fuchsia-300/12 bg-fuchsia-300/[0.025] p-4" : "grid gap-3 px-4 py-4 sm:grid-cols-[1.1fr_1fr_auto] sm:items-center sm:px-6"} key={item.id}><div className="min-w-0"><p className="truncate font-medium" dir="auto">{item.customerName}</p><p className="mt-1 truncate text-sm text-slate-500" dir="auto">{item.services.map((service) => service.serviceNameSnapshot).join(" · ")}</p><p className="mt-1 text-xs text-slate-600" dir="ltr">{item.phone}{item.email ? ` · ${item.email}` : ""}</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.requestedStartAt, "en", user.settings.timezone)}</p><p className="mt-1 text-xs text-fuchsia-200/70">{item.durationMinutes} min · {formatMoney(item.totalPrice, item.currency)}</p></div>{canManage ? <BookingRequestActions id={item.id}/> : <span className="badge">Pending</span>}</article>)}</div> : <div className="empty">No booking requests are waiting.</div>}</section> : <BulkSelection action={bulkMoveToTrash.bind(null, "appointment")} allIds={allMatchingIds.map((item) => item.id)} integrated locale={user.settings?.locale || "en"}><section className="panel overflow-hidden">
      <div className="panel-header"><BulkSelectionControls/><ViewModeToggle initialMode={view} page="appointments"/></div>
      {appointments.length ? <div className={view === "grid" ? "grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3" : "divide-y divide-white/8"}>{appointments.map((item) => {
        const isFinalized = item.status === "COMPLETED";
        const isHistorical = item.status === "HISTORICAL";
        return <SelectableLink href={`/appointments/${item.id}`} id={item.id} key={item.id} className={view === "grid" ? "grid gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-blue-400/20 hover:bg-blue-500/[0.04]" : "grid gap-3 px-4 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1.2fr_1fr_auto] sm:items-center sm:px-6"}><div className="min-w-0"><p className="truncate font-medium" dir="auto">{customerName(item.customer)}</p><p className="mt-1 truncate text-sm text-slate-500" dir="auto">{item.serviceNameSnapshot}</p></div><div><p className="text-sm text-slate-300">{formatBusinessDate(item.startAt,"en")}</p><p className={`mt-1 text-xs ${isFinalized ? "text-emerald-300/75" : isHistorical ? "text-violet-300/70" : "text-sky-300/65"}`}>{isFinalized ? `Actual · ${item.actualDurationMinutes || 0} min · ${formatMoney(item.finalPrice || 0,item.currency)}` : isHistorical ? `Manually added · ${item.expectedDurationMinutes} min · excluded from reports` : `Estimate · ${item.expectedDurationMinutes} min · ${formatMoney(item.expectedPrice,item.currency)}`}</p></div><StatusBadge status={item.status}/></SelectableLink>;
      })}</div> : <div className="empty">No appointments in this stage.</div>}
    </section></BulkSelection>}
  </>;
}

function StageNavItem({ active, count, href, icon: Icon, label }: { active: boolean; count: number; href: string; icon: typeof CalendarClock; label: string }) {
  return <Link aria-current={active ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 px-3 py-2 text-sm transition first:ps-0 ${active ? "font-semibold text-blue-200" : "text-slate-500 hover:text-slate-200"}`} href={href}><Icon className={active ? "text-blue-300" : "text-slate-600"} size={15}/><span>{label}</span><strong className={`tabular-nums ${active ? "text-white" : "text-slate-400"}`}>{count}</strong></Link>;
}
