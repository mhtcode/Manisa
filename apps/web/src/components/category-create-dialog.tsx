"use client";

import { useRef } from "react";
import { FolderPlus, Plus, X } from "lucide-react";
import { ServiceCategoryFields } from "@/components/service-category-fields";

export function CategoryCreateDialog({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button aria-label="New category" className="inline-flex size-10 items-center justify-center rounded-full text-blue-300 transition hover:bg-white/[0.06] hover:text-white" onClick={() => dialog.current?.showModal()} title="New category" type="button"><FolderPlus size={19}/></button>
    <dialog aria-label="Create service category" className="m-auto w-[min(92vw,36rem)] overflow-hidden rounded-3xl border border-white/10 bg-[#0d141e] p-0 text-white shadow-[0_28px_90px_rgba(0,0,0,.7)] backdrop:bg-black/75 backdrop:backdrop-blur-sm" onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }} ref={dialog}>
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><h2 className="font-semibold">New category</h2><p className="mt-1 text-xs text-slate-500">Group related services together.</p></div><button aria-label="Close" className="icon-button" onClick={() => dialog.current?.close()} type="button"><X size={17}/></button></div>
      <form action={async (formData) => { await action(formData); dialog.current?.close(); }} className="p-5"><ServiceCategoryFields/><div className="mt-5 flex justify-end"><button className="button"><Plus size={16}/>Create category</button></div></form>
    </dialog>
  </>;
}
