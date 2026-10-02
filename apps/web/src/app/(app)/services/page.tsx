import Link from "next/link";
import { Folder, Pencil, Plus, Power, Save, Settings2, SwatchBook, Trash2 } from "lucide-react";
import { BulkSelection, BulkSelectionControls, SelectableItem, SelectableLink } from "@/components/bulk-selection";
import { CategoryCreateDialog } from "@/components/category-create-dialog";
import { CategoryIcon } from "@/components/category-icon";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { ServiceCategoryFields } from "@/components/service-category-fields";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { hasBusinessPermission } from "@/lib/permissions";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { createStudioCategory, updateStudioCategory } from "@/server/actions/categories";
import { toggleService } from "@/server/actions/services";
import { bulkMoveToTrash, moveToTrash } from "@/server/actions/trash";

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ from?: string; category?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireBusinessPermission("services.view")]);
  const canManage = hasBusinessPermission(user.role, user.permissionOverrides, "services.manage");
  const canDelete = hasBusinessPermission(user.role, user.permissionOverrides, "trash.manage");
  const view = collectionView(user.settings?.collectionViews, "services", "grid");
  const categories = await prisma.studioCategory.findMany({
    where: { deletedAt: null, OR: [{ active: true }, { services: { some: { deletedAt: null } } }] },
    include: {
      services: { where: { deletedAt: null }, include: { actualAppointmentServices: { where: { appointment: { deletedAt: null, status: "COMPLETED" } }, select: { finalPrice: true, actualDurationMinutes: true } }, appointments: { where: { deletedAt: null, status: "COMPLETED", actualServiceLines: { none: {} } }, select: { finalPrice: true, actualDurationMinutes: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] },
      _count: { select: { services: { where: { active: true, deletedAt: null } } } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });
  const selectedCategory = categories.find((category) => category.id === query.category);
  const rootHref = `/services${query.from === "settings" ? "?from=settings" : ""}`;

  return <>
    <PageHeading backHref={selectedCategory ? rootHref : query.from === "settings" ? "/settings" : undefined} backLabel={selectedCategory ? "Back to categories" : undefined} title={selectedCategory?.name || "Categories"} actions={selectedCategory ? canManage && <Link aria-label="New service" className="icon-button" href={`/services/new?categoryId=${selectedCategory.id}`} title="New service"><Plus size={19}/></Link> : canManage && <CategoryCreateDialog action={createStudioCategory}/>}/>

    {!selectedCategory && (categories.length ? <BulkSelection action={bulkMoveToTrash.bind(null, "category")} allIds={categories.map((category) => category.id)} integrated locale={user.settings?.locale || "en"}><section className="panel overflow-hidden"><div className="panel-header"><BulkSelectionControls/><span className="text-xs text-slate-500">{categories.length} folders</span></div><div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-4">{categories.map((category) => <SelectableLink className="group flex min-h-32 min-w-0 flex-col justify-between rounded-2xl bg-white/[0.025] p-3 ring-1 ring-white/8 transition hover:bg-blue-500/[0.06] hover:ring-blue-300/25" href={`/services?category=${category.id}${query.from === "settings" ? "&from=settings" : ""}`} id={category.id} key={category.id} reserveSelectionSpace={false}><span className="flex size-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.accentColor}1A`, color: category.accentColor }}><CategoryIcon name={category.icon}/></span><span className="min-w-0"><strong className="block truncate text-sm" dir="auto">{category.name}</strong><span className="mt-1 flex items-center gap-1 text-[11px] text-slate-500"><Folder size={12}/>{category.services.length} services</span></span></SelectableLink>)}</div></section></BulkSelection> : <section className="panel empty">{canManage ? "Create a category folder to begin." : "No service categories are available."}</section>)}

    {selectedCategory && <>
      {canManage && <details className="group mb-3 rounded-xl bg-white/[0.025]"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm text-slate-400 [&::-webkit-details-marker]:hidden"><Settings2 size={16}/><span className="flex-1">Folder settings</span></summary><div className="border-t border-white/7 p-4"><form action={updateStudioCategory.bind(null, selectedCategory.id)}><ServiceCategoryFields category={selectedCategory}/><button aria-label="Save category" className="icon-button mt-4" title="Save category"><Save size={17}/></button></form>{canDelete && <ConfirmActionForm action={moveToTrash.bind(null, "category", selectedCategory.id)} className="icon-button mt-3 text-rose-300" message={`Move ${selectedCategory.name} and its related services to Trash? They can be restored together for seven days.`} title={`Delete ${selectedCategory.name}`}><Trash2 size={15}/></ConfirmActionForm>}</div></details>}
      <BulkSelection action={bulkMoveToTrash.bind(null, "service")} allIds={selectedCategory.services.map((service) => service.id)} integrated locale={user.settings?.locale || "en"}><section className="panel overflow-hidden"><div className="panel-header"><BulkSelectionControls/><ViewModeToggle initialMode={view} page="services"/></div><div className={view === "grid" ? "grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-3 p-3"}>{selectedCategory.services.map((service) => {
          const revenue = service.actualAppointmentServices.reduce((sum, line) => sum + Number(line.finalPrice), 0) + service.appointments.reduce((sum, appointment) => sum + Number(appointment.finalPrice || 0), 0);
          const minutes = service.actualAppointmentServices.reduce((sum, line) => sum + line.actualDurationMinutes, 0) + service.appointments.reduce((sum, appointment) => sum + (appointment.actualDurationMinutes || 0), 0);
          const deliveredCount = service.actualAppointmentServices.length + service.appointments.length;
          return <SelectableItem className="h-full" id={service.id} key={service.id}><article className={`service-card panel flex h-full flex-col p-4 sm:p-5 ${service.active ? "" : "opacity-60"}`}><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate text-base font-semibold" dir="auto">{service.name}</h3><p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-400" dir="auto">{service.description || "No description"}</p></div><span className={`badge ${service.active ? "bg-emerald-400/10 text-emerald-300" : "text-slate-500"}`}>{service.active ? "active" : "inactive"}</span></div><div className="mt-3 min-h-6">{service.supportsColor && <span className="inline-flex items-center gap-1.5 rounded-lg bg-fuchsia-300/[0.07] px-2 py-1 text-xs text-fuchsia-200"><SwatchBook size={13}/>Color selectable</span>}</div><div className="mt-4 grid grid-cols-3 gap-2 border-y border-white/10 py-3 text-center"><div><p className="text-base font-semibold">{service.defaultDurationMinutes}m</p><p className="mt-1 text-xs text-slate-500">default</p></div><div><p className="text-base font-semibold">{formatMoney(service.defaultPrice, "CAD")}</p><p className="mt-1 text-xs text-slate-500">price</p></div><div><p className="text-base font-semibold">{deliveredCount}</p><p className="mt-1 text-xs text-slate-500">delivered</p></div></div><div className="mt-auto flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-slate-400">Revenue · hourly</p><p className="mt-1 text-base font-semibold text-white">{formatMoney(revenue, "CAD")} · {formatMoney(minutes ? revenue / (minutes / 60) : 0, "CAD")}</p></div>{canManage && <div className="flex shrink-0 justify-end gap-2"><Link aria-label={`Edit ${service.name}`} className="icon-button" href={`/services/${service.id}/edit`} title="Edit service"><Pencil size={16}/></Link><form action={toggleService.bind(null, service.id, !service.active)}><button aria-label={`${service.active ? "Disable" : "Enable"} ${service.name}`} className="icon-button" title={service.active ? "Disable service" : "Enable service"}><Power size={16}/></button></form></div>}</div></article></SelectableItem>;
        })}{!selectedCategory.services.length && <div className="empty md:col-span-2 xl:col-span-3">No services in this folder yet.</div>}</div></section></BulkSelection>
    </>}
  </>;
}
