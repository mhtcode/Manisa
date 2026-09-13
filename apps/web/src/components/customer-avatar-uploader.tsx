"use client";
/* eslint-disable @next/next/no-img-element -- local crop previews and authorized media endpoints */

import { Camera, Check, Expand, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clampImageFocus, imageCropGeometry, moveImageFocus, type ImageFocus } from "@/lib/social-composer";

const defaultFocus: ImageFocus = { x: 0, y: 0, zoom: 1 };

export function CustomerAvatarUploader({ customerId, assetId, name }: { customerId: string; assetId?: string; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cropStage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [currentAssetId, setCurrentAssetId] = useState(assetId);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [sourceFile, setSourceFile] = useState<File>();
  const [sourceUrl, setSourceUrl] = useState<string>();
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [focus, setFocus] = useState<ImageFocus>(defaultFocus);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [previewUrl, sourceUrl]);

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

  async function upload(file: File) {
    setBusy(true); setError("");
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    try {
      const reserved = await fetch("/api/media/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerType: "CUSTOMER_AVATAR", customerId, fileName: file.name, contentType: file.type, sizeBytes: file.size }) });
      const payload = await reserved.json();
      if (!reserved.ok) throw new Error(payload.error || "Upload could not start");
      const sent = await fetch(payload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!sent.ok) throw new Error("Photo upload failed");
      const confirmed = await fetch(`/api/media/uploads/${payload.assetId}/complete`, { method: "POST" });
      if (!confirmed.ok) throw new Error("Photo could not be confirmed");
      await waitUntilReady(payload.assetId);
      setCurrentAssetId(payload.assetId);
      setPreviewUrl(undefined);
      URL.revokeObjectURL(localPreview);
      clearCrop();
      dialog.current?.close();
      router.refresh();
    } catch (cause) {
      setPreviewUrl(undefined);
      URL.revokeObjectURL(localPreview);
      setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  function choose(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Choose an image file."); return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setSourceUrl(url);
    setSourceSize({ width: 0, height: 0 });
    setFocus(defaultFocus);
    setError("");
    dialog.current?.showModal();
  }

  function clearCrop() {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceFile(undefined);
    setSourceUrl(undefined);
    setSourceSize({ width: 0, height: 0 });
    setFocus(defaultFocus);
  }

  async function applyCrop() {
    if (!sourceFile || !sourceUrl || !sourceSize.width || !sourceSize.height) return;
    try {
      const image = new window.Image();
      image.src = sourceUrl;
      await image.decode();
      const size = 1024;
      const geometry = imageCropGeometry(sourceSize.width, sourceSize.height, size, size, focus);
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Photo crop is not supported on this device.");
      context.fillStyle = "#0b1017"; context.fillRect(0, 0, size, size);
      context.drawImage(image, -geometry.left, -geometry.top, geometry.width, geometry.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Photo crop could not be created.")), "image/webp", .94));
      await upload(new File([blob], `${sourceFile.name.replace(/\.[^.]+$/, "") || "profile"}-cropped.webp`, { type: "image/webp" }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Photo crop could not be created.");
    }
  }

  function startDrag(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function moveDrag(event: React.PointerEvent<HTMLDivElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !cropStage.current) return;
    const rect = cropStage.current.getBoundingClientRect();
    setFocus((value) => moveImageFocus(value, event.clientX - active.x, event.clientY - active.y, rect.width, rect.height));
    drag.current = { ...active, x: event.clientX, y: event.clientY };
  }

  const smallPhoto = previewUrl || (currentAssetId ? `/api/media/${currentAssetId}/avatar_small` : undefined);
  const largePhoto = previewUrl || (currentAssetId ? `/api/media/${currentAssetId}/avatar_large` : undefined);
  const position = `${50 - focus.x / 2}% ${50 - focus.y / 2}%`;

  return <div className="mb-5">
    <button aria-label={`Open ${name}'s profile picture`} className="group relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/25 bg-blue-500/10 text-blue-200 shadow-lg" onClick={() => dialog.current?.showModal()} type="button">{smallPhoto ? <img alt={`${name} profile`} className="size-full object-cover" src={smallPhoto}/> : <Camera size={24}/>}<span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/45 group-hover:opacity-100"><Expand size={17}/></span></button>
    {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
    <dialog aria-label={`${name} profile picture`} className="m-auto w-[min(94vw,36rem)] overflow-hidden rounded-3xl border border-white/12 bg-[#0a111d] p-0 text-white shadow-2xl backdrop:bg-black/80" onClick={(event) => { if (event.target === dialog.current && !busy) { clearCrop(); dialog.current?.close(); } }} ref={dialog}>
      <div className="flex items-center justify-between border-b border-white/8 p-3"><p className="min-w-0 truncate px-2 text-sm font-semibold" dir="auto">{sourceUrl ? "Position profile photo" : name}</p><button aria-label="Close" className="icon-button size-9" disabled={busy} onClick={() => { clearCrop(); dialog.current?.close(); }} title="Close" type="button"><X size={17}/></button></div>
      {sourceUrl ? <div className="p-4 sm:p-6">
        <div className="relative mx-auto aspect-square w-[min(72vw,22rem)] select-none overflow-hidden rounded-full bg-black shadow-[0_0_0_999px_rgba(0,0,0,.22),0_0_0_3px_rgba(147,197,253,.65)] touch-none" onPointerCancel={() => { drag.current = null; }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} ref={cropStage}>
          <img alt="Profile crop preview" className="pointer-events-none size-full object-cover" draggable={false} onLoad={(event) => setSourceSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })} src={sourceUrl} style={{ objectPosition: position, transform: `scale(${focus.zoom})`, transformOrigin: position }}/>
          <span className="pointer-events-none absolute inset-1 rounded-full ring-1 ring-white/75"/>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">Drag the image behind the circle, then adjust zoom.</p>
        <div className="mx-auto mt-4 flex max-w-sm items-center gap-3"><button aria-label="Reset crop" className="icon-button size-9" onClick={() => setFocus(defaultFocus)} title="Reset" type="button"><RotateCcw size={15}/></button><input aria-label="Profile photo zoom" className="min-w-0 flex-1 accent-blue-400" max="3" min="1" onChange={(event) => setFocus((value) => clampImageFocus({ ...value, zoom: Number(event.target.value) }))} step=".05" type="range" value={focus.zoom}/><button aria-label="Apply profile photo crop" className="flex size-10 items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-40" disabled={busy || !sourceSize.width} onClick={applyCrop} title="Apply crop" type="button">{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Check size={17}/>}</button></div>
      </div> : <>
        <div className="relative flex min-h-64 items-center justify-center bg-black/35 p-4">{largePhoto ? <img alt={`${name} profile`} className="max-h-[65vh] max-w-full rounded-2xl object-contain" src={largePhoto}/> : <span className="flex size-28 items-center justify-center rounded-full bg-blue-500/10 text-blue-200"><Camera size={32}/></span>}</div>
        <div className="flex items-center justify-end border-t border-white/8 p-3"><button aria-label={currentAssetId ? "Replace profile picture" : "Add profile picture"} className="icon-button" disabled={busy} onClick={() => input.current?.click()} title={currentAssetId ? "Replace profile picture" : "Add profile picture"} type="button"><Camera size={17}/></button></div>
      </>}
    </dialog>
    <input accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} ref={input} type="file"/>
  </div>;
}
