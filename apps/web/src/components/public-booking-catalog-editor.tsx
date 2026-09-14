"use client";

import { useState, useTransition } from "react";
import { ChevronDown, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import type { PublicBookingCatalogCategory } from "@/lib/public-booking";
import { updatePublicBookingCatalog } from "@/server/actions/settings";

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
}

export function PublicBookingCatalogEditor({ initialCatalog, currency }: { initialCatalog: PublicBookingCatalogCategory[]; currency: string }) {
  const [catalog, setCatalog] = useState(initialCatalog);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function updateCategory(categoryId: string, patch: Partial<PublicBookingCatalogCategory>) {
    setCatalog((current) => current.map((category) => category.id === categoryId ? { ...category, ...patch } : category));
  }

  function save(formData: FormData) {
    setMessage("");
    startTransition(async () => {
      try { await updatePublicBookingCatalog(formData); setMessage("Booking services saved."); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Booking services could not be saved."); }
    });
  }

  return <details className="group panel overflow-hidden">
    <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
      <ChevronDown className="shrink-0 text-slate-500 transition group-open:rotate-180" size={17}/>
      <span className="min-w-0 flex-1"><strong className="block text-sm">Public booking services</strong><span className="mt-0.5 block text-xs text-slate-500">Independent from internal services and categories.</span></span>
    </summary>
    <form action={save} className="space-y-3 border-t border-white/7 p-4">
      {catalog.map((category, categoryIndex) => <details className="rounded-2xl bg-white/[.025] ring-1 ring-white/8" key={category.id} open>
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-2 px-3 [&::-webkit-details-marker]:hidden">
          <ChevronDown className="shrink-0 text-slate-600" size={15}/>
          <input aria-label={`Category ${categoryIndex + 1} name`} className="field min-w-0 flex-1 border-0 bg-transparent shadow-none" dir="auto" maxLength={120} onChange={(event) => updateCategory(category.id, { name: event.target.value })} placeholder="Category name" required value={category.name}/>
          <button aria-label={`Delete ${category.name || "category"}`} className="icon-button rounded-full text-rose-300" onClick={(event) => { event.preventDefault(); setCatalog((current) => current.filter((item) => item.id !== category.id)); }} title="Delete category" type="button"><Trash2 size={16}/></button>
        </summary>
        <div className="space-y-2 border-t border-white/7 p-3">
          {category.services.map((service, serviceIndex) => <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_3rem] items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_5rem_6rem_3rem] sm:gap-2" key={service.id}>
            <input aria-label={`Service ${serviceIndex + 1} name`} className="field min-w-0" dir="auto" maxLength={160} onChange={(event) => updateCategory(category.id, { services: category.services.map((item) => item.id === service.id ? { ...item, name: event.target.value } : item) })} placeholder="Service name" required value={service.name}/>
            <input aria-label={`${service.name || "Service"} duration in minutes`} className="field px-2 text-center" inputMode="numeric" max={1440} min={5} onChange={(event) => updateCategory(category.id, { services: category.services.map((item) => item.id === service.id ? { ...item, durationMinutes: Number(event.target.value) } : item) })} title="Minutes" type="number" value={service.durationMinutes}/>
            <input aria-label={`${service.name || "Service"} price`} className="field px-2 text-center" inputMode="decimal" min={0} onChange={(event) => updateCategory(category.id, { services: category.services.map((item) => item.id === service.id ? { ...item, price: event.target.value } : item) })} step="0.01" title={currency} type="number" value={service.price}/>
            <button aria-label={`Delete ${service.name || "service"}`} className="icon-button size-12 rounded-full text-rose-300" onClick={() => updateCategory(category.id, { services: category.services.filter((item) => item.id !== service.id) })} title="Delete service" type="button"><Trash2 size={15}/></button>
          </div>)}
          <button aria-label={`Add service to ${category.name}`} className="icon-button rounded-full" onClick={() => updateCategory(category.id, { services: [...category.services, { id: id("service"), name: "", durationMinutes: 60, price: "0.00", currency, position: category.services.length }] })} title="Add service" type="button"><Plus size={17}/></button>
        </div>
      </details>)}
      <div className="flex items-center justify-between gap-3 pt-1">
        <button aria-label="Add booking category" className="icon-button rounded-full" onClick={() => setCatalog((current) => [...current, { id: id("category"), name: "", position: current.length, services: [] }])} title="Add category" type="button"><Plus size={18}/></button>
        <span className={`text-xs ${message.includes("saved") ? "text-emerald-300" : "text-rose-300"}`} role="status">{message}</span>
        <button aria-label="Save booking services" className="icon-button rounded-full bg-blue-500/15 text-blue-200" disabled={pending} title="Save booking services"><span className="sr-only">Save booking services</span>{pending ? <LoaderCircle className="animate-spin" size={17}/> : <Save size={17}/>}</button>
      </div>
      <input name="catalog" type="hidden" value={JSON.stringify(catalog)}/>
    </form>
  </details>;
}
