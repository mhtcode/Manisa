import Link from "next/link";
import { Plus, SwatchBook } from "lucide-react";
import { CollapsibleCategory } from "@/components/collapsible-category";
import { PageHeading } from "@/components/page-heading";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { collectionView, sectionCollapsed } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { toggleService } from "@/server/actions/services";

export default async function ServicesPage() {
  const user = await requireUser();
  const view = collectionView(user.settings?.collectionViews, "services", "grid");
  const categories = await prisma.studioCategory.findMany({
    where: { OR: [{ active: true }, { services: { some: {} } }] },
    include: {
      services: {
        include: {
          actualAppointmentServices: { where: { appointment: { status: "COMPLETED" } }, select: { finalPrice: true, actualDurationMinutes: true } },
          appointments: { where: { status: "COMPLETED", actualServiceLines: { none: {} } }, select: { finalPrice: true, actualDurationMinutes: true } },
        },
        orderBy: [{ active: "desc" }, { name: "asc" }],
      },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return <>
    <PageHeading title="Service catalog" description="Organize every studio category, service default, color choice, and actual performance." actions={<><ViewModeToggle initialMode={view} page="services"/><Link className="button" href="/services/new"><Plus size={17}/>New service</Link></>}/>
    <div className="space-y-4">
      {categories.map((category) => <CollapsibleCategory accentColor={category.accentColor} count={category.services.length} description={category.description || "Custom studio category"} icon={category.icon} initialCollapsed={sectionCollapsed(user.settings?.collapsedSections, `service-category-${category.id}`)} key={category.id} name={category.name} sectionId={`service-category-${category.id}`}>
        <div className={view === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
          {category.services.map((service) => {
            const revenue = service.actualAppointmentServices.reduce((sum, line) => sum + Number(line.finalPrice), 0) + service.appointments.reduce((sum, appointment) => sum + Number(appointment.finalPrice || 0), 0);
            const minutes = service.actualAppointmentServices.reduce((sum, line) => sum + line.actualDurationMinutes, 0) + service.appointments.reduce((sum, appointment) => sum + (appointment.actualDurationMinutes || 0), 0);
            const deliveredCount = service.actualAppointmentServices.length + service.appointments.length;
            return <article className={`panel p-5 ${service.active ? "" : "opacity-60"}`} key={service.id}>
              <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-medium text-white" dir="auto">{service.name}</h3><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500">{service.description || "No description"}</p></div><span className={`badge ${service.active ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-white/10 text-slate-500"}`}>{service.active ? "active" : "inactive"}</span></div>
              {service.supportsColor && <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-300/[0.07] px-2 py-1 text-[11px] text-fuchsia-200"><SwatchBook size={13}/>Color selectable</div>}
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/8 py-3 text-center"><div><p className="font-semibold">{service.defaultDurationMinutes}m</p><p className="mt-1 text-[10px] text-slate-600">default</p></div><div><p className="font-semibold">{formatMoney(service.defaultPrice, service.currency)}</p><p className="mt-1 text-[10px] text-slate-600">price</p></div><div><p className="font-semibold">{deliveredCount}</p><p className="mt-1 text-[10px] text-slate-600">delivered</p></div></div>
              <div className="mt-4 flex items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Actual revenue · hourly</p><p className="mt-1 text-xs text-slate-300">{formatMoney(revenue, service.currency)} · {formatMoney(minutes ? revenue / (minutes / 60) : 0, service.currency)}</p></div><div className="flex gap-2"><Link className="button-secondary h-9 min-h-9 px-3" href={`/services/${service.id}/edit`}>Edit</Link><form action={toggleService.bind(null, service.id, !service.active)}><button className="button-secondary h-9 min-h-9 px-3">{service.active ? "Disable" : "Enable"}</button></form></div></div>
            </article>;
          })}
          {!category.services.length && <div className="panel empty md:col-span-2 xl:col-span-3">No services in this category yet.</div>}
        </div>
      </CollapsibleCategory>)}
    </div>
    {!categories.length && <div className="panel empty">Create a category in Settings before adding services.</div>}
  </>;
}
