"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

const retention = 7 * 24 * 60 * 60 * 1000;
function label(deletedAt: string, now: number) {
  const remaining = new Date(deletedAt).getTime() + retention - now;
  if (remaining <= 0) return "Pending deletion";
  const hours = Math.ceil(remaining / 3_600_000);
  return hours >= 48 ? `${Math.floor(hours / 24)}d ${hours % 24}h` : `${hours}h`;
}

export function TrashCountdown({ deletedAt }: { deletedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(timer); }, []);
  return <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-200/75"><Clock3 size={12}/>{label(deletedAt, now)}</span>;
}
