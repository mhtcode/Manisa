"use client";
/* eslint-disable @next/next/no-img-element -- image source is an authorized short-lived media endpoint */
import { Camera, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export function CustomerAvatarUploader({ customerId, assetId, name }: { customerId: string; assetId?: string; name: string }) {
  const input = useRef<HTMLInputElement>(null); const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function upload(file?: File) {
    if (!file) return; setBusy(true); setError("");
    try {
      const reserved = await fetch("/api/media/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerType: "CUSTOMER_AVATAR", customerId, fileName: file.name, contentType: file.type, sizeBytes: file.size }) });
      const payload = await reserved.json(); if (!reserved.ok) throw new Error(payload.error || "Upload could not start");
      const sent = await fetch(payload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }); if (!sent.ok) throw new Error("Photo upload failed");
      const confirmed = await fetch(`/api/media/uploads/${payload.assetId}/complete`, { method: "POST" }); if (!confirmed.ok) throw new Error("Photo could not be confirmed"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload failed"); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="mb-5 flex items-center gap-4"><button aria-label={`Change ${name}'s profile photo`} className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/25 bg-blue-500/10 text-blue-200" disabled={busy} onClick={() => input.current?.click()} type="button">{assetId ? <img alt={`${name} profile`} className="size-full object-cover" src={`/api/media/${assetId}/avatar_small`}/> : <Camera size={24}/>}<span className="absolute inset-x-0 bottom-0 flex h-6 items-center justify-center bg-black/65">{busy ? <LoaderCircle className="animate-spin" size={13}/> : <Camera size={12}/>}</span></button><div><button className="button-secondary" disabled={busy} onClick={() => input.current?.click()} type="button">Profile photo</button>{error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : <p className="mt-2 text-xs text-slate-500">Private to this workspace</p>}</div><input accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} ref={input} type="file"/></div>;
}
