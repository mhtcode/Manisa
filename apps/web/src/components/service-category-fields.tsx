import { categoryIconOptions } from "@/components/category-icon";

export function ServiceCategoryFields({ category }: { category?: { name: string; description: string | null; icon: string; accentColor: string } }) {
  return <div className="grid gap-4 sm:grid-cols-2">
    <div><label className="label">Name *</label><input className="field" dir="auto" name="name" defaultValue={category?.name} placeholder="e.g. Skin studio" required/></div>
    <div><label className="label">Icon</label><select className="field" name="icon" defaultValue={category?.icon || "sparkles"}>{categoryIconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="sm:col-span-2"><label className="label">Description</label><input className="field" dir="auto" name="description" defaultValue={category?.description || ""} placeholder="Services included in this category"/></div>
    <div><label className="label">Accent color</label><input className="field h-11 p-1" name="accentColor" type="color" defaultValue={category?.accentColor || "#4F8CFF"}/></div>
  </div>;
}
