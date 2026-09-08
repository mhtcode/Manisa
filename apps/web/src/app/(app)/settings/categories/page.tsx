import { ArrowDown, ArrowUp, Archive, Plus, RotateCcw } from "lucide-react";
import { CategoryIcon, categoryIconOptions } from "@/components/category-icon";
import { BulkSelection, SelectableItem } from "@/components/bulk-selection";
import { PageHeading } from "@/components/page-heading";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { createStudioCategory, moveStudioCategory, toggleStudioCategory, updateStudioCategory } from "@/server/actions/categories";
import { bulkMoveToTrash } from "@/server/actions/trash";

function CategoryFields({ category }: { category?: { name: string; description: string | null; icon: string; accentColor: string } }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label">Name *</label><input className="field" name="name" defaultValue={category?.name} placeholder="e.g. Skin studio" required/></div>
    <div><label className="label">Icon</label><select className="field" name="icon" defaultValue={category?.icon || "sparkles"}>{categoryIconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="sm:col-span-2"><label className="label">Description</label><input className="field" name="description" defaultValue={category?.description || ""} placeholder="Services included in this category"/></div>
    <div><label className="label">Accent color</label><input className="field h-11 p-1" name="accentColor" type="color" defaultValue={category?.accentColor || "#4F8CFF"}/></div>
  </div>;
}

export default async function CategoriesSettingsPage() {
  const user = await requireBusinessPermission("services.manage");
  const categories = await prisma.studioCategory.findMany({
    where: { deletedAt: null },
    include: {
      services: { where: { deletedAt: null }, select: { id: true } },
      _count: { select: { services: { where: { active: true, deletedAt: null } } } },
    },
    orderBy: [{ position: "asc" }, { name: "asc" }],
  });

  return <>
    <PageHeading backHref="/settings" title="Service categories" actions={<details className="group relative">
      <summary aria-label="New category" className="inline-flex size-9 cursor-pointer list-none items-center justify-center text-blue-300 transition hover:text-white [&::-webkit-details-marker]:hidden" title="New category"><Plus size={21}/></summary>
      <div className="absolute end-0 top-11 z-40 w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#0d141e] p-5 shadow-[0_24px_70px_rgba(0,0,0,.65)]">
        <form action={createStudioCategory}><CategoryFields/><div className="mt-5 flex justify-end"><button className="button"><Plus size={16}/>Create category</button></div></form>
      </div>
    </details>}/>
    <BulkSelection action={bulkMoveToTrash.bind(null, "category")} allIds={categories.map((category) => category.id)}><div className="space-y-4">
      {categories.map((category, index) => <SelectableItem id={category.id} key={category.id}><details className={`panel overflow-hidden ${category.active ? "" : "opacity-70"}`}>
        <summary className="panel-header cursor-pointer list-none"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${category.accentColor}1A`, color: category.accentColor }}><CategoryIcon name={category.icon}/></span><div className="min-w-0"><h2 className="truncate font-semibold text-white">{category.name}</h2><p className="mt-0.5 text-xs text-slate-500">{category._count.services} enabled {category._count.services === 1 ? "service" : "services"} · {category.active ? "active" : "archived"}</p></div></div><span className="text-xs text-blue-300">Edit</span></summary>
        <div className="p-5">
          <form action={updateStudioCategory.bind(null, category.id)}><CategoryFields category={category}/><div className="mt-5 flex justify-end"><button className="button">Save category</button></div></form>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-white/8 pt-5">
            <form action={moveStudioCategory.bind(null, category.id, "up")}><button aria-label={`Move ${category.name} up`} className="button-secondary" disabled={index === 0}><ArrowUp size={15}/>Move up</button></form>
            <form action={moveStudioCategory.bind(null, category.id, "down")}><button aria-label={`Move ${category.name} down`} className="button-secondary" disabled={index === categories.length - 1}><ArrowDown size={15}/>Move down</button></form>
            <form action={toggleStudioCategory.bind(null, category.id, !category.active)}><button className="button-secondary">{category.active ? <Archive size={15}/> : <RotateCcw size={15}/>} {category.active ? "Disable" : "Enable"}</button></form>
          </div>
          {category.services.length > 0 && <p className="mt-3 text-xs text-slate-500">Move all {category.services.length} related {category.services.length === 1 ? "service" : "services"} to Trash before deleting this category.</p>}
        </div>
      </details></SelectableItem>)}
    </div></BulkSelection>
  </>;
}
