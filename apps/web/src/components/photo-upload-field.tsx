"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

type Preview = { name: string; url: string };

export function PhotoUploadField({ disabled = false }: { disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlsRef = useRef<string[]>([]);
  const [previews, setPreviews] = useState<Preview[]>([]);

  useEffect(() => () => urlsRef.current.forEach(URL.revokeObjectURL), []);

  function replacePreviews(files: File[]) {
    urlsRef.current.forEach(URL.revokeObjectURL);
    urlsRef.current = files.map((file) => URL.createObjectURL(file));
    setPreviews(files.map((file, index) => ({ name: file.name, url: urlsRef.current[index] })));
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    replacePreviews([]);
  }

  return <section className="rounded-2xl border border-white/9 bg-black/12 p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-300/10 text-sky-300"><Camera size={19}/></span>
      <div className="min-w-0 flex-1"><h3 className="font-semibold text-white">Visit photos <span className="font-normal text-slate-500">· optional</span></h3><p className="mt-1 text-xs leading-5 text-slate-500">Choose up to 8 photos. They are resized automatically for fast gallery loading.</p></div>
    </div>

    <input accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" className="sr-only" disabled={disabled} id="appointmentPhotos" multiple name="appointmentPhotos" onChange={(event) => replacePreviews(Array.from(event.target.files || []))} ref={inputRef} type="file"/>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label className={`button-secondary cursor-pointer ${disabled ? "pointer-events-none opacity-50" : ""}`} htmlFor="appointmentPhotos"><ImagePlus size={16}/>{previews.length ? "Change photos" : "Choose photos"}</label>
      {previews.length > 0 && <><span className="text-xs text-slate-400">{previews.length} selected</span><button aria-label="Clear selected photos" className="flex size-9 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/[0.05] hover:text-white" onClick={clear} type="button"><X size={16}/></button></>}
    </div>

    {previews.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
      {previews.map((preview) => <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-slate-900" key={preview.url}><Image alt={preview.name} className="object-cover" fill sizes="(max-width: 640px) 30vw, 150px" src={preview.url} unoptimized/></div>)}
    </div>}
  </section>;
}
