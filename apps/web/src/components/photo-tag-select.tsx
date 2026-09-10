"use client";

import { useState, useTransition } from "react";
import { Tag } from "lucide-react";
import { setAppointmentPhotoComparisonTag } from "@/server/actions/appointments";

type ComparisonTag = "UNTAGGED" | "BEFORE" | "AFTER";

export function PhotoTagSelect({ photoId, initialValue }: { photoId: string; initialValue: ComparisonTag }) {
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  return <label className="relative flex min-w-0 items-center rounded-xl bg-black/20 text-xs text-slate-300 focus-within:ring-1 focus-within:ring-blue-400/60">
    <Tag className="pointer-events-none absolute start-2.5 text-blue-300" size={14}/>
    <span className="sr-only">Photo tag</span>
    <select aria-label="Photo tag" className="h-9 min-w-0 flex-1 appearance-none bg-transparent ps-8 pe-2 outline-none" disabled={pending} onChange={(event) => { const next = event.target.value as ComparisonTag; setValue(next); startTransition(async () => { await setAppointmentPhotoComparisonTag(photoId, next); }); }} value={value}>
      <option value="UNTAGGED">No comparison tag</option>
      <option value="BEFORE">Before photo</option>
      <option value="AFTER">After photo</option>
    </select>
  </label>;
}
