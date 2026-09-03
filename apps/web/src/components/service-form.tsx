import Link from "next/link";

type ServiceValue = {
  name: string;
  description: string | null;
  categoryId: string;
  supportsColor: boolean;
  defaultDurationMinutes: number;
  defaultPrice: { toString(): string };
  currency: string;
};

type CategoryOption = { id: string; name: string; active: boolean };

export function ServiceForm({ action, categories, service }: { action: (data: FormData) => void | Promise<void>; categories: CategoryOption[]; service?: ServiceValue }) {
  return (
    <form action={action} className="panel max-w-3xl p-5 sm:p-7">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">Service name *</label>
          <input className="field" dir="auto" id="name" name="name" defaultValue={service?.name} required />
        </div>
        <div>
          <label className="label" htmlFor="categoryId">Category *</label>
          <select className="field" id="categoryId" name="categoryId" defaultValue={service?.categoryId || categories.find((category) => category.active)?.id} required>
            {categories.map((category) => <option disabled={!category.active && category.id !== service?.categoryId} key={category.id} value={category.id}>{category.name}{category.active ? "" : " (archived)"}</option>)}
          </select>
        </div>
        <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] px-3.5 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.045]">
          <input className="size-4 accent-teal-300" defaultChecked={service?.supportsColor} name="supportsColor" type="checkbox" />
          Let appointments record a chosen color
        </label>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Description</label>
          <textarea className="field min-h-24" dir="auto" id="description" name="description" defaultValue={service?.description || ""} />
        </div>
        <div>
          <label className="label" htmlFor="defaultDurationMinutes">Default duration (minutes)</label>
          <input className="field" id="defaultDurationMinutes" name="defaultDurationMinutes" type="number" min="5" step="5" defaultValue={service?.defaultDurationMinutes} placeholder="60" required />
        </div>
        <div>
          <label className="label" htmlFor="defaultPrice">Default price</label>
          <div className="flex gap-2">
            <input className="field" id="defaultPrice" name="defaultPrice" inputMode="decimal" defaultValue={service?.defaultPrice.toString()} placeholder="0.00" required />
            <select className="field max-w-24" name="currency" defaultValue={service?.currency || "CAD"}><option>CAD</option><option>USD</option></select>
          </div>
        </div>
      </div>
      <div className="mt-7 flex justify-end gap-3">
        <Link className="button-secondary" href="/services">Cancel</Link>
        <button className="button">Save service</button>
      </div>
    </form>
  );
}
