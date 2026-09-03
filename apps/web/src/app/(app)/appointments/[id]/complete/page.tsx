import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, LockKeyhole, Sparkles } from "lucide-react";
import { CompletionForm } from "@/components/completion-form";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { appointmentExpectedEnd, canFinalizeAppointment } from "@/lib/scheduling";
import { formatBusinessDate } from "@/lib/time";
import { completeAppointment } from "@/server/actions/appointments";

export default async function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.appointment.findUnique({ where: { id, deletedAt: null }, include: { serviceLines: { orderBy: { position: "asc" } } } });
  if (!item) notFound();
  const currentServiceIds = item.serviceLines.flatMap((line) => line.serviceId ? [line.serviceId] : []);
  const services = await prisma.service.findMany({ where: { deletedAt: null, category: { deletedAt: null }, OR: [{ active: true, category: { active: true } }, { id: { in: currentServiceIds } }] }, include: { category: true }, orderBy: [{ category: { position: "asc" } }, { name: "asc" }] });
  const estimatedEnd = appointmentExpectedEnd(item.startAt, item.expectedDurationMinutes);
  const blockedReason = item.status !== "CONFIRMED"
    ? "This appointment must be confirmed before it can be finalized."
    : !canFinalizeAppointment(item.status, item.startAt, item.expectedDurationMinutes)
      ? `Finalization becomes available after the estimated visit ends on ${formatBusinessDate(estimatedEnd, "en")}.`
      : null;

  return <>
    <PageHeading title="Finalize appointment" description="Record the services actually delivered, their exact time, and final income."/>
    {blockedReason ? <section className="panel mx-auto max-w-xl p-7 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200"><LockKeyhole size={21}/></span>
      <h2 className="mt-4 font-semibold text-white">Finalization is locked</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{blockedReason}</p>
      <Link className="button-secondary mt-6" href={`/appointments/${id}`}>Back to appointment</Link>
    </section> : <div className="grid max-w-6xl gap-5 lg:grid-cols-[.68fr_1.32fr]">
      <aside className="panel h-fit p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300"><Clock3 size={17}/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Confirmed plan</p><h2 className="mt-0.5 font-semibold text-white">Original estimate</h2></div></div>
        <div className="mt-5 space-y-4 border-t border-white/8 pt-5">
          <div><p className="text-xs text-slate-600">Services promised</p><div className="mt-2 space-y-1.5">{item.serviceLines.map((line) => <p className="flex items-center gap-2 text-sm text-slate-300" key={line.id}><Sparkles className="text-teal-300" size={13}/><span dir="auto">{line.serviceNameSnapshot}</span>{line.selectedColor && <span className="ms-auto size-3 rounded-full border border-white/20" style={{ backgroundColor: line.selectedColor }}/>}</p>)}</div></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Estimated time</p><p className="mt-1.5 font-semibold text-white">{item.expectedDurationMinutes} min</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Estimated price</p><p className="mt-1.5 font-semibold text-white">{formatMoney(item.expectedPrice, item.currency)}</p></div></div>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">The confirmed plan is preserved for history. Your final choices become the source for reports.</p>
      </aside>
      <CompletionForm action={completeAppointment.bind(null, id)} appointmentId={id} completionNotes={item.completionNotes} paymentStatus={item.paymentStatus} scheduledLines={item.serviceLines.flatMap((line) => line.serviceId ? [{ serviceId: line.serviceId, duration: line.durationMinutes, price: line.price.toString(), selectedColor: line.selectedColor }] : [])} services={services.map((service) => ({ id: service.id, name: service.name, category: service.category, supportsColor: service.supportsColor, duration: service.defaultDurationMinutes, price: service.defaultPrice.toString(), currency: service.currency }))}/>
    </div>}
  </>;
}
