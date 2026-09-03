"use client";

import { useId, useState, useTransition } from "react";

export function ConfirmActionForm({ action, children, className = "button-danger", message }: {
  action: (formData: FormData) => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  message: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  return <>
    <button className={className} disabled={pending} onClick={() => setConfirming(true)} type="button">{children}</button>
    {confirming && <div aria-labelledby={titleId} aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center bg-[#030711]/80 p-3 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target && !pending) setConfirming(false); }} role="dialog">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-300/20 bg-[#0c1422] shadow-[0_28px_90px_rgba(0,0,0,.65)]">
        <div className="border-b border-white/10 bg-[#080d15] px-5 py-4"><h2 className="font-semibold text-white" id={titleId}>Confirm action</h2></div>
        <div className="p-5"><p className="text-sm leading-6 text-slate-300">{message}</p><div className="mt-5 grid grid-cols-2 gap-2"><button className="button-secondary" disabled={pending} onClick={() => setConfirming(false)} type="button">Cancel</button><button className="button-danger" disabled={pending} onClick={() => startTransition(async () => { await action(new FormData()); })} type="button">{pending ? "Working…" : "Confirm"}</button></div></div>
      </div>
    </div>}
  </>;
}
