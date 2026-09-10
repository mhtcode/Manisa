"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, Download, ImageIcon, LoaderCircle, Move, SlidersHorizontal, Type, WandSparkles } from "lucide-react";

type ComposerPhoto = { id: string; comparisonTag: string; url: string };

const cropPositions = [
  ["northwest", "Top left"], ["north", "Top"], ["northeast", "Top right"],
  ["west", "Left"], ["centre", "Center"], ["east", "Right"],
  ["southwest", "Bottom left"], ["south", "Bottom"], ["southeast", "Bottom right"],
] as const;

export function SocialImageComposer({ photos }: { photos: ComposerPhoto[] }) {
  const taggedBefore = photos.find((photo) => photo.comparisonTag === "BEFORE");
  const taggedAfter = photos.find((photo) => photo.comparisonTag === "AFTER");
  const [beforeId, setBeforeId] = useState(taggedBefore?.id || photos[0]?.id || "");
  const [afterId, setAfterId] = useState(taggedAfter?.id || photos.find((photo) => photo.id !== (taggedBefore?.id || photos[0]?.id))?.id || "");
  const [format, setFormat] = useState("post");
  const [layout, setLayout] = useState("side");
  const [beforeShare, setBeforeShare] = useState(50);
  const [beforePosition, setBeforePosition] = useState("centre");
  const [afterPosition, setAfterPosition] = useState("centre");
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
  const [previewLoading, setPreviewLoading] = useState(true);

  const params = useMemo(() => new URLSearchParams({
    beforeId, afterId, format, layout, beforeShare: String(beforeShare), beforePosition, afterPosition,
    dividerWidth: String(dividerWidth), dividerColor, logoSize: String(logoSize), logoPosition,
    showLabels: showLabels ? "1" : "0", beforeLabel, afterLabel,
    showDate: showDate ? "1" : "0", showTime: showTime ? "1" : "0", caption,
  }).toString(), [afterId, afterLabel, afterPosition, beforeId, beforeLabel, beforePosition, beforeShare, caption, dividerColor, dividerWidth, format, layout, logoPosition, logoSize, showDate, showLabels, showTime]);
  const canCompose = photos.length >= 2 && Boolean(beforeId && afterId && beforeId !== afterId);
  const previewUrl = canCompose ? `/api/media/comparison?${params}&preview=1` : "";

  function refreshPreview() { setPreviewLoading(true); }
  function swapPhotos() { setBeforeId(afterId); setAfterId(beforeId); refreshPreview(); }

  return <details className="panel mb-5 overflow-hidden" open>
    <summary className="panel-header cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="flex items-center gap-3"><WandSparkles className="text-fuchsia-300" size={19}/><div><h2 className="font-semibold">Social image studio</h2><p className="mt-1 text-xs text-slate-500">Edit the finished image live, then download it.</p></div></div>
      <span className="text-xs text-blue-300">Open</span>
    </summary>
    <div className="grid min-w-0 gap-5 border-t border-white/7 p-3 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.82fr)]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-2xl bg-black/15 p-3">
          <div className="mb-3 flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-sm font-semibold"><ImageIcon size={16}/>Photos</h3><button aria-label="Swap before and after photos" className="icon-button size-9" disabled={!canCompose} onClick={swapPhotos} title="Swap photos" type="button"><ArrowLeftRight size={16}/></button></div>
          <div className="grid grid-cols-2 gap-3"><PhotoPicker id="beforeId" label="Before" photos={photos} otherId={afterId} value={beforeId} onChange={(value) => { setBeforeId(value); refreshPreview(); }}/><PhotoPicker id="afterId" label="After" photos={photos} otherId={beforeId} value={afterId} onChange={(value) => { setAfterId(value); refreshPreview(); }}/></div>
        </section>

        <section className="grid gap-3 rounded-2xl bg-black/15 p-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="comparison-format">Canvas</label><select className="field" id="comparison-format" onChange={(event) => { setFormat(event.target.value); refreshPreview(); }} value={format}><option value="post">Instagram post · 1080×1080</option><option value="portrait">Portrait post · 1080×1350</option><option value="story">Story · 1080×1920</option></select></div>
          <div><label className="label" htmlFor="comparison-layout">Layout</label><select className="field" id="comparison-layout" onChange={(event) => { setLayout(event.target.value); refreshPreview(); }} value={layout}><option value="side">Side by side</option><option value="stack">Top and bottom</option></select></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="before-share">Divider position · {beforeShare}%</label><input className="w-full accent-fuchsia-300" id="before-share" max="75" min="25" onChange={(event) => { setBeforeShare(Number(event.target.value)); refreshPreview(); }} type="range" value={beforeShare}/></div>
        </section>

        <details className="rounded-2xl bg-black/15 p-3" open><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><Move size={16}/>Photo placement</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><CropSelect id="before-position" label="Before position" value={beforePosition} onChange={(value) => { setBeforePosition(value); refreshPreview(); }}/><CropSelect id="after-position" label="After position" value={afterPosition} onChange={(value) => { setAfterPosition(value); refreshPreview(); }}/></div></details>

        <details className="rounded-2xl bg-black/15 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><SlidersHorizontal size={16}/>Divider & logo</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="divider-width">Divider width · {dividerWidth}px</label><input className="w-full accent-fuchsia-300" id="divider-width" max="32" min="0" onChange={(event) => { setDividerWidth(Number(event.target.value)); refreshPreview(); }} type="range" value={dividerWidth}/></div><div><label className="label" htmlFor="divider-color">Divider color</label><input className="field h-11 cursor-pointer p-1" id="divider-color" onChange={(event) => { setDividerColor(event.target.value); refreshPreview(); }} type="color" value={dividerColor}/></div><div><label className="label" htmlFor="logo-position">Logo position</label><select className="field" id="logo-position" onChange={(event) => { setLogoPosition(event.target.value); refreshPreview(); }} value={logoPosition}><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option><option value="center">Center</option><option value="none">Hide logo</option></select></div><div><label className="label" htmlFor="logo-size">Logo size · {logoSize}%</label><input className="w-full accent-fuchsia-300" id="logo-size" max="28" min="6" onChange={(event) => { setLogoSize(Number(event.target.value)); refreshPreview(); }} type="range" value={logoSize}/></div></div></details>

        <details className="rounded-2xl bg-black/15 p-3"><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden"><Type size={16}/>Labels & details</summary><div className="mt-3 space-y-3"><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showLabels} className="accent-blue-400" onChange={(event) => { setShowLabels(event.target.checked); refreshPreview(); }} type="checkbox"/>Show before and after labels</label>{showLabels && <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="before-label">Before label</label><input className="field" id="before-label" maxLength={18} onChange={(event) => { setBeforeLabel(event.target.value); refreshPreview(); }} value={beforeLabel}/></div><div><label className="label" htmlFor="after-label">After label</label><input className="field" id="after-label" maxLength={18} onChange={(event) => { setAfterLabel(event.target.value); refreshPreview(); }} value={afterLabel}/></div></div>}<div className="flex flex-wrap gap-4"><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showDate} className="accent-blue-400" onChange={(event) => { setShowDate(event.target.checked); refreshPreview(); }} type="checkbox"/><CalendarDays size={14}/>Date</label><label className="flex cursor-pointer items-center gap-2 text-sm"><input checked={showTime} className="accent-blue-400" onChange={(event) => { setShowTime(event.target.checked); refreshPreview(); }} type="checkbox"/>Time</label></div><div><label className="label" htmlFor="comparison-caption">Optional text</label><input className="field" dir="auto" id="comparison-caption" maxLength={80} onChange={(event) => { setCaption(event.target.value); refreshPreview(); }} placeholder="Add a short caption" value={caption}/><p className="mt-1 text-end text-[10px] text-slate-600">{caption.length}/80</p></div></div></details>
      </div>

      <aside className="order-first min-w-0 lg:order-last lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl bg-black/30 p-2 sm:p-3"><div className={`relative mx-auto overflow-hidden rounded-xl bg-[#070b12] shadow-2xl ${format === "story" ? "aspect-[9/16] max-h-[70vh]" : format === "portrait" ? "aspect-[4/5]" : "aspect-square"}`}>{canCompose ? <><img alt="Live before and after preview" className={`size-full object-contain transition-opacity duration-200 ${previewLoading ? "opacity-35" : "opacity-100"}`} onLoad={() => setPreviewLoading(false)} src={previewUrl}/>{previewLoading && <LoaderCircle aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-blue-200" size={26}/>}</> : <div className="flex size-full items-center justify-center p-8 text-center text-sm text-slate-500">Choose two different photos.</div>}</div></div>
        <p className="mt-2 text-center text-xs text-slate-500">Live preview · generated only when requested</p>
        <a aria-disabled={!canCompose} className={`button mt-3 w-full justify-center ${!canCompose ? "pointer-events-none opacity-45" : ""}`} download href={canCompose ? `/api/media/comparison?${params}` : undefined}><Download size={16}/>Download image</a>
      </aside>
    </div>
  </details>;
}

function PhotoPicker({ id, label, photos, otherId, value, onChange }: { id: string; label: string; photos: ComposerPhoto[]; otherId: string; value: string; onChange: (value: string) => void }) {
  const photo = photos.find((item) => item.id === value);
  return <div className="min-w-0"><label className="label" htmlFor={id}>{label}</label><select className="field" id={id} onChange={(event) => onChange(event.target.value)} value={value}>{photos.map((item, index) => <option disabled={item.id === otherId} key={item.id} value={item.id}>{item.comparisonTag === "UNTAGGED" ? `Photo ${index + 1}` : `${item.comparisonTag === "BEFORE" ? "Before" : "After"} · ${index + 1}`}</option>)}</select>{photo && <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-slate-900"><img alt={`${label} source`} className="size-full object-cover" src={photo.url}/></div>}</div>;
}

function CropSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (value: string) => void }) {
  return <div><label className="label" htmlFor={id}>{label}</label><select className="field" id={id} onChange={(event) => onChange(event.target.value)} value={value}>{cropPositions.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></div>;
}
