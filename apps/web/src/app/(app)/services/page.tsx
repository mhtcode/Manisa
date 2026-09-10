import Link from "next/link";
import { Archive, ArrowDown, ArrowUp, Check, FolderPlus, Plus, RotateCcw, SwatchBook } from "lucide-react";
import { BulkSelection, SelectableItem } from "@/components/bulk-selection";
import { CategoryCreateDialog } from "@/components/category-create-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { CollapsibleCategory } from "@/components/collapsible-category";
import { PageHeading } from "@/components/page-heading";
import { ServiceCategoryFields } from "@/components/service-category-fields";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { hasBusinessPermission } from "@/lib/permissions";
import { collectionView, sectionCollapsed } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { createStudioCategory, moveStudioCategory, toggleStudioCategory, updateStudioCategory } from "@/server/actions/categories";
import { toggleService } from "@/server/actions/services";
import { bulkMoveToTrash } from "@/server/actions/trash";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ from?: string; section?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireBusinessPermission("services.view")]);
  const canManage = hasBusinessPermission(user.role, user.permissionOverrides, "services.manage");
  const view = collectionView(user.settings?.collectionViews, "services", "grid");
  const categories = await prisma.studioCategory.findMany({
    where: { deletedAt: null, OR: [{ active: true }, { services: { some: { deletedAt: null } } }] },
    include: {
      services: { where: { deletedAt: null }, include: { actualAppointmentServices: { where: { appointment: { deletedAt: null, status: "COMPLETED" } }, select: { finalPrice: true, actualDurationMinutes: true } }, appointments: { where: { deletedAt: null, status: "COMPLETED", actualServiceLines: { none: {} } }, select: { finalPrice: true, actualDurationMinutes: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] },
      _count: { select: { services: { where: { active: true, deletedAt: null } } } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const serviceCount = categories.reduce((sum, category) => sum + category.services.length, 0);

  return <>
    <PageHeading backHref={query.from === "settings" ? "/settings" : undefined} title="Services" actions={<><ViewModeToggle initialMode={view} page="services"/>{canManage && <CategoryCreateDialog action={createStudioCategory}/>} {canManage && categories.length > 0 && <Link aria-label="New service" className="inline-flex size-10 items-center justify-center rounded-full text-blue-300 transition hover:bg-white/[0.06] hover:text-white" href="/services/new" title="New service"><Plus size={20}/></Link>}</>}/>

    {canManage && serviceCount === 0 && <section className="mb-6 rounded-2xl bg-gradient-to-br from-blue-500/[0.09] to-teal-400/[0.04] p-5 ring-1 ring-blue-300/12 sm:p-6"><div className="flex items-start gap-4"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-400/10 text-blue-300">{categories.length ? <Check size={20}/> : "1"}</div><div><h2 className="font-semibold">{categories.length ? "Category ready—create your first service" : "Start with a service category"}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{categories.length ? "Step 2 of 2: add a service, then choose its default time, price, and whether it records a color." : "Step 1 of 2: categories keep related services together. Create at least one before adding services."}</p>{categories.length ? <Link className="button mt-4" href="/services/new"><Plus size={16}/>Create first service</Link> : <details className="mt-4"><summary className="button inline-flex cursor-pointer list-none [&::-webkit-details-marker]:hidden"><FolderPlus size={16}/>Create category</summary><form action={createStudioCategory} className="mt-4 rounded-xl bg-black/10 p-4 ring-1 ring-white/8"><ServiceCategoryFields/><button className="button mt-4">Save category and continue</button></form></details>}</div></div></section>}

    {canManage && categories.length > 0 && <details className="panel mb-6 overflow-hidden" open={query.section === "categories"}><summary className="panel-header cursor-pointer list-none [&::-webkit-details-marker]:hidden"><div><h2 className="font-semibold">Categories</h2><p className="mt-1 text-xs text-slate-500">{categories.length} {categories.length === 1 ? "category" : "categories"} · fold to keep the service catalog focused</p></div><span className="text-xs text-blue-300">Manage</span></summary><div className="space-y-3 border-t border-white/6 p-4">{categories.map((category, index) => <details className={`rounded-xl bg-white/[0.02] ring-1 ring-white/7 ${category.active ? "" : "opacity-65"}`} key={category.id}><summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden"><span className="flex size-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${category.accentColor}1A`, color: category.accentColor }}><CategoryIcon name={category.icon}/></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold" dir="auto">{category.name}</span><span className="text-xs text-slate-500">{category._count.services} active services</span></span><span className="text-xs text-slate-500">Edit</span></summary><div className="border-t border-white/6 p-4"><form action={updateStudioCategory.bind(null, category.id)}><ServiceCategoryFields category={category}/><button className="button mt-4">Save category</button></form><div className="mt-4 flex flex-wrap gap-2"><form action={moveStudioCategory.bind(null, category.id, "up")}><button aria-label={`Move ${category.name} up`} className="icon-button" disabled={index === 0} title="Move up"><ArrowUp size={15}/></button></form><form action={moveStudioCategory.bind(null, category.id, "down")}><button aria-label={`Move ${category.name} down`} className="icon-button" disabled={index === categories.length - 1} title="Move down"><ArrowDown size={15}/></button></form><form action={toggleStudioCategory.bind(null, category.id, !category.active)}><button aria-label={category.active ? "Disable category" : "Enable category"} className="icon-button" title={category.active ? "Disable" : "Enable"}>{category.active ? <Archive size={15}/> : <RotateCcw size={15}/>}</button></form></div></div></details>)}</div></details>}

    <BulkSelection action={bulkMoveToTrash.bind(null, "service")} allIds={categories.flatMap((category) => category.services.map((service) => service.id))} locale={user.settings?.locale || "en"}><div className="space-y-4">
      {categories.map((category) => <CollapsibleCategory accentColor={category.accentColor} count={category.services.filter((service) => service.active).length} description={category.description || "Custom studio category"} icon={category.icon} initialCollapsed={sectionCollapsed(user.settings?.collapsedSections, `service-category-${category.id}`)} key={category.id} name={category.name} sectionId={`service-category-${category.id}`}>
        <div className={view === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>{category.services.map((service) => {
          const revenue = service.actualAppointmentServices.reduce((sum, line) => sum + Number(line.finalPrice), 0) + service.appointments.reduce((sum, appointment) => sum + Number(appointment.finalPrice || 0), 0);
          const minutes = service.actualAppointmentServices.reduce((sum, line) => sum + line.actualDurationMinutes, 0) + service.appointments.reduce((sum, appointment) => sum + (appointment.actualDurationMinutes || 0), 0);
          const deliveredCount = service.actualAppointmentServices.length + service.appointments.length;
          return <SelectableItem className="h-full" id={service.id} key={service.id}><article className={`panel flex h-full flex-col p-5 ${service.active ? "" : "opacity-60"}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-medium" dir="auto">{service.name}</h3><p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-500" dir="auto">{service.description || "No description"}</p></div><span className={`badge ${service.active ? "bg-emerald-400/10 text-emerald-300" : "text-slate-500"}`}>{service.active ? "active" : "inactive"}</span></div><div className="mt-3 min-h-6">{service.supportsColor && <span className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-300/[0.07] px-2 py-1 text-[11px] text-fuchsia-200"><SwatchBook size={13}/>Color selectable</span>}</div><div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/6 py-3 text-center"><div><p className="font-semibold">{service.defaultDurationMinutes}m</p><p className="mt-1 text-[10px] text-slate-600">default</p></div><div><p className="font-semibold">{formatMoney(service.defaultPrice, service.currency)}</p><p className="mt-1 text-[10px] text-slate-600">price</p></div><div><p className="font-semibold">{deliveredCount}</p><p className="mt-1 text-[10px] text-slate-600">delivered</p></div></div><div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4"><div><p className="text-[10px] uppercase tracking-wider text-slate-600">Actual revenue · hourly</p><p className="mt-1 text-xs text-slate-300">{formatMoney(revenue, service.currency)} · {formatMoney(minutes ? revenue / (minutes / 60) : 0, service.currency)}</p></div>{canManage && <div className="flex gap-2"><Link className="button-secondary h-9 min-h-9 px-3" href={`/services/${service.id}/edit`}>Edit</Link><form action={toggleService.bind(null, service.id, !service.active)}><button className="button-secondary h-9 min-h-9 px-3">{service.active ? "Disable" : "Enable"}</button></form></div>}</div></article></SelectableItem>;
        })}{!category.services.length && <div className="empty md:col-span-2 xl:col-span-3">No services in this category yet.</div>}</div>
      </CollapsibleCategory>)}
    </div></BulkSelection>
    {!categories.length && !canManage && <div className="panel empty">No service categories are available.</div>}
  </>;
}
