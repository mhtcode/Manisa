import { ArrowDown, ArrowUp, Archive, Plus, RotateCcw, Trash2 } from "lucide-react";
import { CategoryIcon, categoryIconOptions } from "@/components/category-icon";
import { BulkSelection, SelectableItem } from "@/components/bulk-selection";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma";
import { createStudioCategory, moveStudioCategory, toggleStudioCategory, updateStudioCategory } from "@/server/actions/categories";
import { bulkMoveToTrash, moveToTrash } from "@/server/actions/trash";

function CategoryFields({ category }: { category?: { name: string; description: string | null; icon: string; accentColor: string } }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label">Name *</label><input className="field" name="name" defaultValue={category?.name} placeholder="e.g. Skin studio" required/></div>
    <div><label className="label">Icon</label><select className="field" name="icon" defaultValue={category?.icon || "sparkles"}>{categoryIconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="sm:col-span-2"><label className="label">Description</label><input className="field" name="description" defaultValue={category?.description || ""} placeholder="Services included in this category"/></div>
    <div><label className="label">Accent color</label><input className="field h-11 p-1" name="accentColor" type="color" defaultValue={category?.accentColor || "#4F8CFF"}/></div>
  </div>;
}

export default async function CategoriesSettingsPage() {
  const categories = await prisma.studioCategory.findMany({
    where: { deletedAt: null },
    include: {
      services: { where: { deletedAt: null }, select: { id: true } },
      _count: { select: { services: { where: { active: true, deletedAt: null } } } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return <>
    <PageHeading backHref="/settings" title="Service categories" description="Category totals include enabled services only. Empty categories can be moved to Trash."/>
    <BulkSelection action={bulkMoveToTrash.bind(null, "category")} allIds={categories.map((category) => category.id)}><div className="space-y-4">
      <details className="panel overflow-hidden">
        <summary className="panel-header cursor-pointer list-none"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Plus size={17}/></span><div><h2 className="font-semibold text-white">New category</h2><p className="mt-0.5 text-xs text-slate-500">Create another independent studio area</p></div></div></summary>
        <form action={createStudioCategory} className="p-5"><CategoryFields/><div className="mt-5 flex justify-end"><button className="button"><Plus size={16}/>Create category</button></div></form>
      </details>
      {categories.map((category, index) => <SelectableItem id={category.id} key={category.id}><details className={`panel overflow-hidden ${category.active ? "" : "opacity-70"}`}>
        <summary className="panel-header cursor-pointer list-none"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.accentColor}1A`, color: category.accentColor }}><CategoryIcon name={category.icon}/></span><div className="min-w-0"><h2 className="truncate font-semibold text-white">{category.name}</h2><p className="mt-0.5 text-xs text-slate-500">{category._count.services} enabled {category._count.services === 1 ? "service" : "services"} · {category.active ? "active" : "archived"}</p></div></div><span className="text-xs text-blue-300">Edit</span></summary>
        <div className="p-5">
          <form action={updateStudioCategory.bind(null, category.id)}><CategoryFields category={category}/><div className="mt-5 flex justify-end"><button className="button">Save category</button></div></form>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
            <form action={moveStudioCategory.bind(null, category.id, "up")}><button aria-label={`Move ${category.name} up`} className="button-secondary" disabled={index === 0}><ArrowUp size={15}/>Move up</button></form>
            <form action={moveStudioCategory.bind(null, category.id, "down")}><button aria-label={`Move ${category.name} down`} className="button-secondary" disabled={index === categories.length - 1}><ArrowDown size={15}/>Move down</button></form>
            <form action={toggleStudioCategory.bind(null, category.id, !category.active)}><button className="button-secondary">{category.active ? <Archive size={15}/> : <RotateCcw size={15}/>} {category.active ? "Disable" : "Enable"}</button></form>
            {!category.services.length && <ConfirmActionForm action={moveToTrash.bind(null, "category", category.id)} className="icon-button border-rose-400/20 text-rose-300" message={`Move ${category.name} to Trash? It will be permanently deleted after seven days unless restored.`} title="Move category to Trash"><Trash2 size={15}/><span className="sr-only">Move category to Trash</span></ConfirmActionForm>}
          </div>
          {category.services.length > 0 && <p className="mt-3 text-xs text-slate-500">Move all {category.services.length} related {category.services.length === 1 ? "service" : "services"} to Trash before deleting this category.</p>}
        </div>
      </details></SelectableItem>)}
    </div></BulkSelection>
  </>;
}
