"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Grid2X2, List } from "lucide-react";
import { updateCollectionView } from "@/server/actions/settings";

type CollectionKey = "appointments" | "customers" | "services" | "gallery" | "reportRecords";

export function ViewModeToggle({ page, initialMode }: { page: CollectionKey; initialMode: "grid" | "list" }) {
  const [mode, setMode] = useState(initialMode);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function choose(next: "grid" | "list") {
    if (next === mode) return;
    setMode(next);
    startTransition(async () => { await updateCollectionView(page, next); router.refresh(); });
  }
  return <div aria-label="Collection layout" className="view-toggle" data-swipe-lock>{(["grid", "list"] as const).map((value) => <button aria-label={`${value} view`} aria-pressed={mode === value} className={mode === value ? "active" : ""} disabled={pending} key={value} onClick={() => choose(value)} type="button">{value === "grid" ? <Grid2X2 size={15}/> : <List size={16}/>}<span className="hidden sm:inline">{value === "grid" ? "Grid" : "List"}</span></button>)}</div>;
}
