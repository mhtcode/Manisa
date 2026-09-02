import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock3, DollarSign, Sparkles } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { formatMoney } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { completeAppointment } from "@/server/actions/appointments";

export default async function CompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.appointment.findUnique({ where: { id }, include: { serviceLines: { orderBy: { position: "asc" } } } });
  if (!item) notFound();
  return <>
    <PageHeading title="Finalize appointment" description="Stage 2 records the actual time and income after the visit is finished."/>
    <div className="grid max-w-5xl gap-5 lg:grid-cols-[.72fr_1.28fr]">
      <aside className="panel h-fit p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300"><Clock3 size={17}/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Stage 1</p><h2 className="mt-0.5 font-semibold text-white">Scheduled estimate</h2></div></div>
        <div className="mt-5 space-y-4 border-t border-white/8 pt-5">
          <div><p className="text-xs text-slate-600">Services</p><div className="mt-2 space-y-1.5">{item.serviceLines.map((line) => <p className="flex items-center gap-2 text-sm text-slate-300" key={line.id}><Sparkles className="text-teal-300" size={13}/><span dir="auto">{line.serviceNameSnapshot}</span></p>)}</div></div>
          <div className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Estimated time</p><p className="mt-1.5 font-semibold text-white">{item.expectedDurationMinutes} min</p></div><div className="rounded-xl bg-white/[0.03] p-3"><p className="text-[10px] uppercase tracking-wider text-slate-600">Estimated price</p><p className="mt-1.5 font-semibold text-white">{formatMoney(item.expectedPrice, item.currency)}</p></div></div>
        </div>
        <p className="mt-5 text-xs leading-5 text-slate-500">Estimates help prevent scheduling overlaps. They are not included in revenue or working-hour totals.</p>
      </aside>

      <form action={completeAppointment.bind(null, id)} className="panel p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-300"><BadgeCheck size={19}/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Stage 2</p><h2 className="mt-0.5 font-semibold text-white">Finalized actuals</h2></div></div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="actualDurationMinutes">Actual duration *</label><div className="relative"><Clock3 className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17}/><input className="field ps-10" id="actualDurationMinutes" name="actualDurationMinutes" type="number" min="1" defaultValue={item.actualDurationMinutes || item.expectedDurationMinutes} required/></div><p className="mt-1.5 text-xs text-slate-600">Exact time spent delivering the services.</p></div>
          <div><label className="label" htmlFor="finalPrice">Final income *</label><div className="relative"><DollarSign className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={17}/><input className="field ps-10" id="finalPrice" name="finalPrice" inputMode="decimal" defaultValue={(item.finalPrice || item.expectedPrice).toString()} required/></div><p className="mt-1.5 text-xs text-slate-600">Exact amount earned from this appointment.</p></div>
          <div><label className="label" htmlFor="paymentStatus">Payment status</label><select className="field" id="paymentStatus" name="paymentStatus" defaultValue={item.paymentStatus}><option value="UNPAID">Unpaid</option><option value="PAID">Paid</option><option value="PARTIALLY_PAID">Partially paid</option></select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="completionNotes">Completion notes</label><textarea className="field min-h-28" id="completionNotes" name="completionNotes" defaultValue={item.completionNotes || ""}/></div>
        </div>
        <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-3.5 text-xs leading-5 text-emerald-100/80">Once finalized, the actual income and duration will be included in Dashboard, Reports, and Working Hours.</div>
        <div className="mt-7 flex justify-end gap-3"><Link className="button-secondary" href={`/appointments/${id}`}>Cancel</Link><button className="button"><BadgeCheck size={17}/>Finalize appointment</button></div>
      </form>
    </div>
  </>;
}
