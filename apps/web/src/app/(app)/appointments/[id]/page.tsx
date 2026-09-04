import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarCheck2, Check, ChevronRight, CircleDot, Clock3, Images, LockKeyhole, Pencil, Trash2, XCircle } from "lucide-react";
import { AppointmentPhotoUploadForm } from "@/components/appointment-photo-upload-form";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { customerName, formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { appointmentExpectedEnd, canFinalizeAppointment } from "@/lib/scheduling";
import { formatBusinessDate } from "@/lib/time";
import { addAppointmentPhotos, markPaid, setAppointmentStatus } from "@/server/actions/appointments";
import { moveToTrash } from "@/server/actions/trash";

export default async function AppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.appointment.findUnique({
    where: { id, deletedAt: null },
    include: {
      customer: true,
      serviceLines: { orderBy: { position: "asc" } },
      actualServiceLines: { orderBy: { position: "asc" } },
      photos: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8 },
      _count: { select: { photos: { where: { deletedAt: null } } } },
    },
  });
  if (!item) notFound();
  const plannedLines = item.serviceLines.length ? item.serviceLines : [{ id: item.serviceId, serviceNameSnapshot: item.serviceNameSnapshot, durationMinutes: item.expectedDurationMinutes, price: item.expectedPrice, selectedColor: null }];
  const estimatedEnd = appointmentExpectedEnd(item.startAt, item.expectedDurationMinutes);
  const now = new Date();
  const editable = ["SCHEDULED", "CONFIRMED"].includes(item.status);
  const canConfirm = item.status === "SCHEDULED";
  const canFinalize = canFinalizeAppointment(item.status, item.startAt, item.expectedDurationMinutes, now);
  const canNoShow = editable && item.startAt <= now;
  const finalized = item.status === "COMPLETED";
  const historical = item.status === "HISTORICAL";
  const progressIndex = item.status === "COMPLETED" ? 2 : item.status === "CONFIRMED" ? 1 : item.status === "SCHEDULED" ? 0 : -1;
  const stages = [
    { title: "Scheduled", copy: "Estimated services, time, and price.", icon: CircleDot },
    { title: "Confirmed", copy: "Customer committed to the visit.", icon: CalendarCheck2 },
    { title: "Finalized", copy: "Actual work, income, and time.", icon: BadgeCheck },
  ];

  return <>
    <PageHeading title={item.serviceNameSnapshot} description={`${customerName(item.customer)} · ${formatBusinessDate(item.startAt, "en")}`} actions={editable && <Link className="button-secondary" href={`/appointments/${id}/edit`}><Pencil size={16}/>Edit appointment</Link>}/>

    {!historical && <ol aria-label="Appointment progress" className="mb-5 flex items-stretch gap-1.5 overflow-x-auto pb-1" data-horizontal-scroll>
      {stages.map((stage, index) => { const current = progressIndex === index; const complete = progressIndex > index; const Icon = complete ? Check : stage.icon; return <li className="flex min-w-[9rem] flex-1 items-center gap-1.5" key={stage.title}><div aria-current={current ? "step" : undefined} className={`min-h-full min-w-0 flex-1 rounded-xl border p-3 ${current ? "border-blue-300/40 bg-gradient-to-br from-blue-500/[0.16] to-blue-900/[0.1] shadow-[inset_0_1px_rgba(255,255,255,.05)]" : complete ? "border-emerald-300/20 bg-emerald-300/[0.055]" : "border-white/8 bg-white/[0.02]"}`}><div className="flex items-center gap-2"><span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${current ? "bg-blue-400/15 text-blue-200" : complete ? "bg-emerald-300/10 text-emerald-300" : "bg-white/[0.04] text-slate-500"}`}><Icon size={13} strokeWidth={complete ? 3 : 2}/></span><p className={`truncate text-xs font-semibold ${current ? "text-blue-100" : complete ? "text-emerald-200" : "text-slate-400"}`}>{index + 1} · {stage.title}</p></div><p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">{stage.copy}</p></div>{index < stages.length - 1 && <ChevronRight aria-hidden="true" className={`shrink-0 rtl:rotate-180 ${complete ? "text-emerald-300/60" : "text-slate-700"}`} size={17}/>}</li>; })}
    </ol>}

    <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge status={item.status}/>{!historical && <StatusBadge status={item.paymentStatus}/>}</div>
        <dl className="mt-7 grid gap-6 sm:grid-cols-2">
          <div><dt className="text-xs uppercase tracking-wider text-slate-600">Customer</dt><dd className="mt-2"><Link className="font-medium text-teal-300" href={`/customers/${item.customerId}`}>{customerName(item.customer)}</Link><p className="mt-1 text-sm text-slate-500">{item.customer.phone || item.customer.email || "No contact details"}</p></dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-slate-600">{historical ? "Manually added schedule" : "Scheduled estimate"}</dt><dd className="mt-2 text-sm text-slate-300">{formatBusinessDate(item.startAt, "en")} · {item.expectedDurationMinutes} minutes</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-600">Services planned</dt><dd className="mt-2 grid gap-2 sm:grid-cols-2">{plannedLines.map((line) => <div className="rounded-xl border border-white/8 bg-white/[0.025] px-3 py-2.5" key={line.id}><div className="flex items-center gap-2"><p className="min-w-0 flex-1 text-sm font-medium text-slate-200" dir="auto">{line.serviceNameSnapshot}</p>{line.selectedColor && <span aria-label={`Selected color ${line.selectedColor}`} className="size-4 rounded-full border border-white/20" style={{ backgroundColor: line.selectedColor }}/>}</div><p className="mt-1 text-xs text-slate-500">{line.durationMinutes} min{!historical && ` · ${formatMoney(line.price, item.currency)}`}</p></div>)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-slate-600">{historical ? "Reporting" : "Estimated price"}</dt><dd className="mt-2 text-sm text-slate-300">{historical ? "Excluded from income and hours" : formatMoney(item.expectedPrice, item.currency)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wider text-slate-600">Actual result</dt><dd className="mt-2 text-sm text-slate-300">{finalized ? `${formatMoney(item.finalPrice || 0, item.currency)} · ${item.actualDurationMinutes || 0} minutes` : historical ? "Manually added · unreported" : "Not finalized yet"}</dd></div>
          {finalized && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-600">Services actually delivered</dt><dd className="mt-2 grid gap-2 sm:grid-cols-2">{item.actualServiceLines.map((line) => <div className="rounded-xl border border-emerald-300/12 bg-emerald-300/[0.035] px-3 py-2.5" key={line.id}><div className="flex items-center gap-2"><p className="min-w-0 flex-1 text-sm font-medium text-slate-200" dir="auto">{line.serviceNameSnapshot}</p>{line.selectedColor && <span className="size-4 rounded-full border border-white/20" style={{ backgroundColor: line.selectedColor }}/>}</div><p className="mt-1 text-xs text-emerald-200/60">{line.actualDurationMinutes} min · {formatMoney(line.finalPrice, item.currency)}</p></div>)}</dd></div>}
          <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-600">Notes</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.notes || "—"}</dd></div>
          {item.completionNotes && <div className="sm:col-span-2"><dt className="text-xs uppercase tracking-wider text-slate-600">Completion notes</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{item.completionNotes}</dd></div>}
        </dl>
        {finalized && <div className="mt-7 border-t border-white/8 pt-6">
          <div className="flex items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 font-semibold text-white"><Images className="text-sky-300" size={18}/>Visit photos</h2><p className="mt-1 text-xs text-slate-500">{item._count.photos ? `${item._count.photos} saved with this appointment` : "No photos added yet"}</p></div>{item._count.photos > 0 && <Link className="text-sm font-medium text-teal-300 hover:text-teal-200" href={`/gallery?customerId=${item.customerId}`}>Open gallery</Link>}</div>
          {item.photos.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {item.photos.map((photo) => <a className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-slate-900" href={`/media/${photo.imagePath}`} key={photo.id} rel="noreferrer" target="_blank"><Image alt={`${customerName(item.customer)} visit result`} className="object-cover transition duration-300 group-hover:scale-[1.03]" fill sizes="(max-width: 640px) 45vw, 220px" src={`/media/${photo.thumbnailPath}`} unoptimized/></a>)}
          </div>}
          {item._count.photos > item.photos.length && <p className="mt-3 text-xs text-slate-500">Showing the latest {item.photos.length}. Open Gallery to see all photos.</p>}
        </div>}
      </section>

      <aside className="space-y-5">
        {!historical && <section className="panel p-5"><h2 className="font-medium">Next action</h2><div className="mt-4 grid gap-2">
          {canConfirm && <form action={setAppointmentStatus.bind(null, id, "CONFIRMED")}><button className="button w-full"><CalendarCheck2 size={17}/>Confirm appointment</button></form>}
          {item.status === "CONFIRMED" && (canFinalize ? <Link className="button w-full" href={`/appointments/${id}/complete`}><BadgeCheck size={17}/>Finalize visit</Link> : <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3.5"><div className="flex items-center gap-2 text-sm font-medium text-slate-300"><LockKeyhole size={16}/>Finalization locked</div><p className="mt-1.5 text-xs leading-5 text-slate-500">Available after {formatBusinessDate(estimatedEnd, "en")}.</p></div>)}
          {item.paymentStatus !== "PAID" && finalized && <form action={markPaid.bind(null, id)}><button className="button-secondary w-full">Mark paid</button></form>}
          {editable && <Link className="button-secondary w-full" href={`/appointments/${id}/edit`}><Pencil size={16}/>Edit estimate</Link>}
          {canNoShow && <form action={setAppointmentStatus.bind(null, id, "NO_SHOW")}><button className="button-secondary w-full">Mark no-show</button></form>}
          {editable && <form action={setAppointmentStatus.bind(null, id, "CANCELLED")}><button className="button-danger w-full"><XCircle size={16}/>Cancel appointment</button></form>}
        </div></section>}
        {finalized && <section className="panel p-5"><div className="mb-4"><h2 className="font-medium text-white">Add visit photos</h2><p className="mt-1 text-xs leading-5 text-slate-500">Optional. You can return and add more at any time.</p></div><AppointmentPhotoUploadForm action={addAppointmentPhotos.bind(null, id)}/></section>}
        <section className="panel p-5"><div className="flex items-center gap-2"><Clock3 className="text-slate-500" size={16}/><h2 className="font-medium">Calendar source</h2></div><p className="mt-3 text-sm leading-6 text-slate-500">{historical ? "Manually added from a calendar file or JSON batch." : item.calendarEventId ? "Connected to Google Calendar." : item.calendarSyncError || "Managed in Manisa. Calendar synchronization can be connected later."}</p></section>
        <ConfirmActionForm action={moveToTrash.bind(null, "appointment", id)} className="icon-button border-rose-400/20 text-rose-300" message={`Move this ${item.serviceNameSnapshot} appointment to Trash? Its visit photos will move with it. Everything will be permanently deleted after seven days unless restored.`} title="Move appointment to Trash"><Trash2 size={16}/><span className="sr-only">Move appointment to Trash</span></ConfirmActionForm>
      </aside>
    </div>
  </>;
}
