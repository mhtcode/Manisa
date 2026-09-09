"use client";
/* eslint-disable @next/next/no-img-element -- image source is an authorized short-lived media endpoint */
import { Camera, Expand, LoaderCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function CustomerAvatarUploader({ customerId, assetId, name }: { customerId: string; assetId?: string; name: string }) {
  const input = useRef<HTMLInputElement>(null); const dialog = useRef<HTMLDialogElement>(null); const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [currentAssetId, setCurrentAssetId] = useState(assetId); const [previewUrl, setPreviewUrl] = useState<string>();
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  async function waitUntilReady(id: string) {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const response = await fetch(`/api/media/uploads/${id}/complete`, { cache: "no-store" });
      const status = await response.json() as { status?: string; errorMessage?: string; error?: string };
      if (!response.ok) throw new Error(status.error || "Photo processing status is unavailable");
      if (status.status === "READY") return;
      if (status.status === "FAILED") throw new Error(status.errorMessage || "Photo processing failed");
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    }
    throw new Error("Photo processing is taking longer than expected. It will appear when ready.");
  }

  async function upload(file?: File) {
    if (!file) return; setBusy(true); setError(""); const localPreview = URL.createObjectURL(file); setPreviewUrl(localPreview);
    try {
      const reserved = await fetch("/api/media/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerType: "CUSTOMER_AVATAR", customerId, fileName: file.name, contentType: file.type, sizeBytes: file.size }) });
      const payload = await reserved.json(); if (!reserved.ok) throw new Error(payload.error || "Upload could not start");
      const sent = await fetch(payload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }); if (!sent.ok) throw new Error("Photo upload failed");
      const confirmed = await fetch(`/api/media/uploads/${payload.assetId}/complete`, { method: "POST" }); if (!confirmed.ok) throw new Error("Photo could not be confirmed");
      await waitUntilReady(payload.assetId); setCurrentAssetId(payload.assetId); setPreviewUrl(undefined); URL.revokeObjectURL(localPreview); router.refresh();
    } catch (cause) { setPreviewUrl(undefined); URL.revokeObjectURL(localPreview); setError(cause instanceof Error ? cause.message : "Upload failed"); } finally { setBusy(false); if (input.current) input.current.value = ""; }
  }
  const smallPhoto = previewUrl || (currentAssetId ? `/api/media/${currentAssetId}/avatar_small` : undefined); const largePhoto = previewUrl || (currentAssetId ? `/api/media/${currentAssetId}/avatar_large` : undefined);
  return <div className="mb-5"><button aria-label={`Open ${name}'s profile picture`} className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/25 bg-blue-500/10 text-blue-200 shadow-lg" onClick={() => dialog.current?.showModal()} type="button">{smallPhoto ? <img alt={`${name} profile`} className="size-full object-cover" src={smallPhoto}/> : <Camera size={24}/>}<span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100"><Expand size={17}/></span></button>{error && <p className="mt-2 text-xs text-rose-300">{error}</p>}<dialog aria-label={`${name} profile picture`} className="m-auto w-[min(92vw,34rem)] overflow-hidden rounded-3xl border border-white/12 bg-[#0a111d] p-0 text-white shadow-2xl backdrop:bg-black/80" onClick={(event) => { if (event.target === dialog.current) dialog.current?.close(); }} ref={dialog}><div className="flex items-center justify-between border-b border-white/8 p-3"><p className="min-w-0 truncate px-2 text-sm font-semibold" dir="auto">{name}</p><form method="dialog"><button aria-label="Close" className="icon-button size-9" title="Close"><X size={17}/></button></form></div><div className="relative flex min-h-64 items-center justify-center bg-black/35 p-4">{largePhoto ? <img alt={`${name} profile`} className="max-h-[65vh] max-w-full rounded-2xl object-contain" src={largePhoto}/> : <span className="flex size-28 items-center justify-center rounded-full bg-blue-500/10 text-blue-200"><Camera size={32}/></span>}{busy && <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs text-white"><LoaderCircle className="animate-spin" size={14}/>Processing</span>}</div><div className="flex items-center justify-end gap-2 border-t border-white/8 p-3"><button aria-label={currentAssetId ? "Replace profile picture" : "Add profile picture"} className="icon-button" disabled={busy} onClick={() => input.current?.click()} title={currentAssetId ? "Replace profile picture" : "Add profile picture"} type="button">{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Camera size={17}/>}</button></div></dialog><input accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="sr-only" onChange={(event) => upload(event.target.files?.[0])} ref={input} type="file"/></div>;
}
