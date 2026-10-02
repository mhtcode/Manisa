"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, GripVertical, LoaderCircle, Save } from "lucide-react";
import { mobileNavigationKeys, mobileNavigationLabels, type MobileNavigationKey } from "@/lib/mobile-navigation";
import { updateMobileNavigation } from "@/server/actions/settings";

const selectableItems = mobileNavigationKeys;

export function MobileNavigationSettings({ initialOrder }: { initialOrder: MobileNavigationKey[] }) {
  const [items, setItems] = useState(initialOrder);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function save(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await updateMobileNavigation(formData);
      setSaved(true);
      router.refresh();
    });
  }

  function move(index: number, direction: -1 | 1) {
    const destination = index + direction;
    if (destination < 0 || destination >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
    setSaved(false);
  }

  function replace(index: number, value: MobileNavigationKey) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? value : item));
    setSaved(false);
  }

  return <form action={save} className="panel overflow-hidden">
    <div className="panel-header"><h2 className="font-semibold text-white">Mobile navigation</h2></div>
    <div className="space-y-2 p-4 sm:p-5">
      {items.map((item, index) => <div className="flex min-w-0 items-center gap-1.5 rounded-xl border border-white/9 bg-white/[0.025] p-2 sm:gap-2" key={`${item}-${index}`}>
        <GripVertical className="hidden shrink-0 text-slate-600 sm:block" size={17}/>
        <span className="hidden w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-600 sm:block">Slot {index + 1}</span>
        <select aria-label={`Mobile navigation slot ${index + 1}`} className="field min-w-0 flex-1" onChange={(event) => replace(index, event.target.value as MobileNavigationKey)} value={item}>
          {selectableItems.map((option) => <option disabled={items.includes(option) && option !== item} key={option} value={option}>{mobileNavigationLabels[option]}</option>)}
        </select>
        <button aria-label={`Move ${mobileNavigationLabels[item]} up`} className="icon-button rounded-full" disabled={index === 0} onClick={() => move(index, -1)} type="button"><ArrowUp size={15}/></button>
        <button aria-label={`Move ${mobileNavigationLabels[item]} down`} className="icon-button rounded-full" disabled={index === items.length - 1} onClick={() => move(index, 1)} type="button"><ArrowDown size={15}/></button>
        <input name="mobileNavItems" type="hidden" value={item}/>
      </div>)}
      <div className="flex items-center justify-end gap-3 pt-2">{saved && <span className="flex items-center gap-1.5 text-xs text-emerald-300"><Check size={14}/>Saved</span>}<button aria-label="Save mobile navigation" className="icon-button rounded-full bg-blue-500/15 text-blue-100" disabled={pending} title="Save mobile navigation">{pending ? <LoaderCircle className="animate-spin" size={16}/> : <Save size={16}/>}</button></div>
    </div>
  </form>;
}
