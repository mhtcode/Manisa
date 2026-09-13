"use client";
/* eslint-disable @next/next/no-img-element -- authorized media endpoints and live canvas layers */

import { useMemo, useRef, useState } from "react";
import { ArrowLeftRight, CalendarDays, Download, ImageIcon, Move, RotateCcw, SlidersHorizontal, Type } from "lucide-react";
import { clampImageFocus, dividerShareFromPointer, moveImageFocus, type ImageFocus } from "@/lib/social-composer";

type ComposerPhoto = { id: string; comparisonTag: string; url: string };
type PanTarget = "before" | "after";

const defaultFocus: ImageFocus = { x: 0, y: 0, zoom: 1 };

export function SocialImageComposer({ photos }: { photos: ComposerPhoto[] }) {
  const taggedBefore = photos.find((photo) => photo.comparisonTag === "BEFORE");
  const taggedAfter = photos.find((photo) => photo.comparisonTag === "AFTER");
  const [beforeId, setBeforeId] = useState(taggedBefore?.id || photos[0]?.id || "");
  const [afterId, setAfterId] = useState(taggedAfter?.id || photos.find((photo) => photo.id !== (taggedBefore?.id || photos[0]?.id))?.id || "");
  const [format, setFormat] = useState("post");
  const [layout, setLayout] = useState("side");
  const [beforeShare, setBeforeShare] = useState(50);
  const [beforeFocus, setBeforeFocus] = useState<ImageFocus>(defaultFocus);
  const [afterFocus, setAfterFocus] = useState<ImageFocus>(defaultFocus);
  const [dividerWidth, setDividerWidth] = useState(6);
  const [dividerColor, setDividerColor] = useState("#ffffff");
  const [logoSize, setLogoSize] = useState(13);
  const [logoPosition, setLogoPosition] = useState("bottom-right");
  const [showLabels, setShowLabels] = useState(true);
  const [beforeLabel, setBeforeLabel] = useState("BEFORE");
  const [afterLabel, setAfterLabel] = useState("AFTER");
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [caption, setCaption] = useState("");
  const [draggingDivider, setDraggingDivider] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{ target: PanTarget; pointerId: number; x: number; y: number } | null>(null);
  const beforePhoto = photos.find((photo) => photo.id === beforeId);
  const afterPhoto = photos.find((photo) => photo.id === afterId);

  const params = useMemo(() => new URLSearchParams({
    beforeId, afterId, format, layout, beforeShare: String(beforeShare),
    beforeX: String(beforeFocus.x), beforeY: String(beforeFocus.y), beforeZoom: String(beforeFocus.zoom),
    afterX: String(afterFocus.x), afterY: String(afterFocus.y), afterZoom: String(afterFocus.zoom),
    dividerWidth: String(dividerWidth), dividerColor, logoSize: String(logoSize), logoPosition,
    showLabels: showLabels ? "1" : "0", beforeLabel, afterLabel,
    showDate: showDate ? "1" : "0", showTime: showTime ? "1" : "0", caption,
  }).toString(), [afterFocus, afterId, afterLabel, beforeFocus, beforeId, beforeLabel, beforeShare, caption, dividerColor, dividerWidth, format, layout, logoPosition, logoSize, showDate, showLabels, showTime]);
  const canCompose = photos.length >= 2 && Boolean(beforeId && afterId && beforeId !== afterId);

  function swapPhotos() {
    setBeforeId(afterId); setAfterId(beforeId);
    setBeforeFocus(afterFocus); setAfterFocus(beforeFocus);
  }

  function moveDivider(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingDivider || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    setBeforeShare(dividerShareFromPointer(layout === "side" ? event.clientX : event.clientY, layout === "side" ? rect.left : rect.top, layout === "side" ? rect.width : rect.height));
  }

  function startPan(target: PanTarget, event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pan.current = { target, pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function updatePan(target: PanTarget, event: React.PointerEvent<HTMLDivElement>) {
    const active = pan.current;
    if (!active || active.target !== target || active.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const update = target === "before" ? setBeforeFocus : setAfterFocus;
    update((focus) => moveImageFocus(focus, event.clientX - active.x, event.clientY - active.y, rect.width, rect.height));
    pan.current = { ...active, x: event.clientX, y: event.clientY };
  }

  const beforeRegion = layout === "side" ? { insetInlineStart: 0, top: 0, width: `${beforeShare}%`, height: "100%" } : { insetInlineStart: 0, top: 0, width: "100%", height: `${beforeShare}%` };
  const afterRegion = layout === "side" ? { insetInlineStart: `${beforeShare}%`, top: 0, width: `${100 - beforeShare}%`, height: "100%" } : { insetInlineStart: 0, top: `${beforeShare}%`, width: "100%", height: `${100 - beforeShare}%` };
  const detail = [caption, showDate ? "Sep 12, 2026" : "", showTime ? "10:00 AM" : ""].filter(Boolean).join("  ·  ");

  return <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(18rem,.62fr)_minmax(24rem,1.38fr)]">
    <aside className="order-last min-w-0 space-y-3 xl:order-first">
      <EditorSection icon={ImageIcon} title="Photos" open>
        <div className="mb-3 flex justify-end"><button aria-label="Swap before and after photos" className="icon-button size-9" disabled={!canCompose} onClick={swapPhotos} title="Swap photos" type="button"><ArrowLeftRight size={16}/></button></div>
        <div className="grid grid-cols-2 gap-3"><PhotoPicker id="beforeId" label="Before" photos={photos} otherId={afterId} value={beforeId} onChange={(value) => { setBeforeId(value); setBeforeFocus(defaultFocus); }}/><PhotoPicker id="afterId" label="After" photos={photos} otherId={beforeId} value={afterId} onChange={(value) => { setAfterId(value); setAfterFocus(defaultFocus); }}/></div>
      </EditorSection>

      <EditorSection icon={SlidersHorizontal} title="Canvas" open>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div><label className="label" htmlFor="comparison-format">Format</label><select className="field" id="comparison-format" onChange={(event) => setFormat(event.target.value)} value={format}><option value="post">Square · 1080×1080</option><option value="portrait">Portrait · 1080×1350</option><option value="story">Story · 1080×1920</option></select></div><div><label className="label" htmlFor="comparison-layout">Layout</label><select className="field" id="comparison-layout" onChange={(event) => setLayout(event.target.value)} value={layout}><option value="side">Side by side</option><option value="stack">Top and bottom</option></select></div></div>
      </EditorSection>

      <EditorSection icon={Move} title="Photo placement" open>
        <p className="mb-3 text-xs leading-5 text-slate-500">Drag each photo directly on the canvas. Use zoom only when you need a tighter crop.</p>
        <FocusControl focus={beforeFocus} label="Before" onChange={setBeforeFocus}/><FocusControl focus={afterFocus} label="After" onChange={setAfterFocus}/>
      </EditorSection>

      <EditorSection icon={SlidersHorizontal} title="Divider & logo">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div><label className="label" htmlFor="divider-width">Divider · {dividerWidth}px</label><input className="w-full accent-fuchsia-300" id="divider-width" max="32" min="0" onChange={(event) => setDividerWidth(Number(event.target.value))} type="range" value={dividerWidth}/></div><div><label className="label" htmlFor="divider-color">Color</label><input className="field h-10 cursor-pointer p-1" id="divider-color" onChange={(event) => setDividerColor(event.target.value)} type="color" value={dividerColor}/></div><div><label className="label" htmlFor="logo-position">Logo</label><select className="field" id="logo-position" onChange={(event) => setLogoPosition(event.target.value)} value={logoPosition}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option><option value="center">Center</option><option value="none">Hidden</option></select></div><div><label className="label" htmlFor="logo-size">Size · {logoSize}%</label><input className="w-full accent-fuchsia-300" id="logo-size" max="28" min="6" onChange={(event) => setLogoSize(Number(event.target.value))} type="range" value={logoSize}/></div></div>
      </EditorSection>

      <EditorSection icon={Type} title="Labels & export">
        <label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showLabels} className="accent-blue-400" onChange={(event) => setShowLabels(event.target.checked)} type="checkbox"/>Show equal-size before and after labels</label>
        {showLabels && <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><div><label className="label" htmlFor="before-label">Before label</label><input className="field" id="before-label" maxLength={18} onChange={(event) => setBeforeLabel(event.target.value)} value={beforeLabel}/></div><div><label className="label" htmlFor="after-label">After label</label><input className="field" id="after-label" maxLength={18} onChange={(event) => setAfterLabel(event.target.value)} value={afterLabel}/></div></div>}
        <div className="mt-3 flex flex-wrap gap-4"><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showDate} className="accent-blue-400" onChange={(event) => setShowDate(event.target.checked)} type="checkbox"/><CalendarDays size={14}/>Date</label><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showTime} className="accent-blue-400" onChange={(event) => setShowTime(event.target.checked)} type="checkbox"/>Time</label></div>
        <div className="mt-3"><label className="label" htmlFor="comparison-caption">Optional text</label><input className="field" dir="auto" id="comparison-caption" maxLength={80} onChange={(event) => setCaption(event.target.value)} placeholder="Add a short caption" value={caption}/></div>
      </EditorSection>
    </aside>

    <section className="min-w-0 xl:sticky xl:top-20 xl:self-start">
      <div className="rounded-3xl bg-black/30 p-2 shadow-2xl sm:p-3">
        <div className={`relative mx-auto touch-none overflow-hidden rounded-2xl bg-[#070b12] ${format === "story" ? "aspect-[9/16] max-h-[76svh]" : format === "portrait" ? "aspect-[4/5] max-h-[76svh]" : "aspect-square max-h-[76svh]"}`} onPointerCancel={() => { setDraggingDivider(false); pan.current = null; }} onPointerMove={moveDivider} onPointerUp={() => { setDraggingDivider(false); pan.current = null; }} ref={previewRef}>
          {canCompose && beforePhoto && afterPhoto ? <>
            <CanvasPhoto focus={beforeFocus} label="before" onPointerDown={(event) => startPan("before", event)} onPointerMove={(event) => updatePan("before", event)} src={beforePhoto.url} style={beforeRegion}/>
            <CanvasPhoto focus={afterFocus} label="after" onPointerDown={(event) => startPan("after", event)} onPointerMove={(event) => updatePan("after", event)} src={afterPhoto.url} style={afterRegion}/>
            <button aria-label="Drag divider" className={`absolute z-30 flex items-center justify-center bg-transparent ${layout === "side" ? "inset-y-0 w-8 -translate-x-1/2 cursor-ew-resize" : "inset-x-0 h-8 -translate-y-1/2 cursor-ns-resize"}`} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setDraggingDivider(true); }} style={layout === "side" ? { left: `${beforeShare}%` } : { top: `${beforeShare}%` }} type="button"><span className={`${layout === "side" ? "h-full w-1" : "h-1 w-full"}`} style={{ backgroundColor: dividerColor }}/><span className="absolute flex size-8 items-center justify-center rounded-full bg-fuchsia-500 text-white shadow-xl"><Move size={14}/></span></button>
            {showLabels && <><CanvasLabel layout={layout} share={beforeShare} text={beforeLabel} target="before"/><CanvasLabel layout={layout} share={beforeShare} text={afterLabel} target="after"/></>}
            {logoPosition !== "none" && <img alt="Manisa" className={`pointer-events-none absolute z-20 ${logoClass(logoPosition)}`} src="/brand/manisa-logo.png" style={{ width: `${logoSize}%` }}/>}
            {detail && <div className="absolute inset-x-0 bottom-0 z-20 bg-black/65 px-3 py-3 text-center text-xs text-white backdrop-blur-sm" dir="auto">{detail}</div>}
          </> : <div className="flex size-full items-center justify-center p-8 text-center text-sm text-slate-500">Choose two different photos.</div>}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3"><p className="min-w-0 flex-1 text-xs text-slate-500">Drag photos to reposition · drag the divider to resize.</p><a aria-disabled={!canCompose} className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition hover:bg-blue-400 ${!canCompose ? "pointer-events-none opacity-45" : ""}`} download href={canCompose ? `/api/media/comparison?${params}` : undefined} title="Download image"><Download size={18}/><span className="sr-only">Download image</span></a></div>
    </section>
  </div>;
}

function EditorSection({ icon: Icon, title, open = false, children }: { icon: typeof ImageIcon; title: string; open?: boolean; children: React.ReactNode }) {
  return <details className="panel overflow-hidden" open={open || undefined}><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden"><Icon className="text-fuchsia-300" size={16}/><strong className="flex-1 text-sm">{title}</strong><span className="text-slate-600">⌄</span></summary><div className="border-t border-white/7 p-4">{children}</div></details>;
}

function PhotoPicker({ id, label, photos, otherId, value, onChange }: { id: string; label: string; photos: ComposerPhoto[]; otherId: string; value: string; onChange: (value: string) => void }) {
  const photo = photos.find((item) => item.id === value);
  return <div className="min-w-0"><label className="label" htmlFor={id}>{label}</label><select className="field" id={id} onChange={(event) => onChange(event.target.value)} value={value}>{photos.map((item, index) => <option disabled={item.id === otherId} key={item.id} value={item.id}>{item.comparisonTag === "UNTAGGED" ? `Photo ${index + 1}` : `${item.comparisonTag === "BEFORE" ? "Before" : "After"} · ${index + 1}`}</option>)}</select>{photo && <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-[#070b12]"><img alt={`${label} source`} className="size-full object-contain" src={photo.url}/></div>}</div>;
}

function FocusControl({ focus, label, onChange }: { focus: ImageFocus; label: string; onChange: (focus: ImageFocus) => void }) {
  return <div className="mb-3 rounded-xl bg-black/15 p-3 last:mb-0"><div className="flex items-center justify-between"><strong className="text-xs">{label}</strong><button aria-label={`Reset ${label} placement`} className="icon-button size-8" onClick={() => onChange(defaultFocus)} title="Reset placement" type="button"><RotateCcw size={14}/></button></div><label className="mt-2 block"><span className="label">Zoom · {focus.zoom.toFixed(2)}×</span><input className="w-full accent-fuchsia-300" max="3" min="1" onChange={(event) => onChange(clampImageFocus({ ...focus, zoom: Number(event.target.value) }))} step="0.05" type="range" value={focus.zoom}/></label></div>;
}

function CanvasPhoto({ src, focus, label, style, onPointerDown, onPointerMove }: { src: string; focus: ImageFocus; label: string; style: React.CSSProperties; onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void; onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void }) {
  const position = `${50 - focus.x / 2}% ${50 - focus.y / 2}%`;
  return <div aria-label={`Reposition ${label} photo`} className="absolute z-0 cursor-grab overflow-hidden active:cursor-grabbing" onPointerDown={onPointerDown} onPointerMove={onPointerMove} role="application" style={style} tabIndex={0}><img alt="" className="pointer-events-none size-full select-none object-cover" draggable={false} src={src} style={{ objectPosition: position, transform: `scale(${focus.zoom})`, transformOrigin: position }}/></div>;
}

function CanvasLabel({ layout, share, target, text }: { layout: string; share: number; target: PanTarget; text: string }) {
  const style = layout === "side"
    ? target === "before" ? { left: "3%", top: "3%" } : { left: `${share + 3}%`, top: "3%" }
    : target === "before" ? { left: "3%", top: "3%" } : { left: "3%", top: `${share + 3}%` };
  return <span className="absolute z-20 rounded-full bg-black/70 px-3 py-1.5 text-[clamp(9px,1.4vw,14px)] font-bold tracking-wide text-white" style={style}>{text}</span>;
}

function logoClass(position: string) {
  if (position === "top-left") return "left-[3%] top-[3%]";
  if (position === "top-right") return "right-[3%] top-[3%]";
  if (position === "bottom-left") return "bottom-[3%] left-[3%]";
  if (position === "center") return "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2";
  return "bottom-[3%] right-[3%]";
}
