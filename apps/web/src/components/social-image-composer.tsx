"use client";

import { useMemo, useState } from "react";
import { Download, ImageIcon, WandSparkles } from "lucide-react";

type ComposerPhoto = { id: string; comparisonTag: string; url: string };

export function SocialImageComposer({ photos }: { photos: ComposerPhoto[] }) {
  const taggedBefore = photos.find((photo) => photo.comparisonTag === "BEFORE");
  const taggedAfter = photos.find((photo) => photo.comparisonTag === "AFTER");
  const [beforeId, setBeforeId] = useState(taggedBefore?.id || photos[0]?.id || "");
  const [afterId, setAfterId] = useState(taggedAfter?.id || photos.find((photo) => photo.id !== (taggedBefore?.id || photos[0]?.id))?.id || "");
  const [format, setFormat] = useState("post");
  const [layout, setLayout] = useState("side");
  const [beforeShare, setBeforeShare] = useState(50);
  const selected = useMemo(() => [photos.find((photo) => photo.id === beforeId), photos.find((photo) => photo.id === afterId)], [afterId, beforeId, photos]);

  return <details className="panel mb-5 overflow-hidden">
    <summary className="panel-header cursor-pointer list-none [&::-webkit-details-marker]:hidden"><div className="flex items-center gap-3"><WandSparkles className="text-fuchsia-300" size={19}/><div><h2 className="font-semibold">Before & after creator</h2><p className="mt-1 text-xs text-slate-500">Instagram-ready layout with the studio logo</p></div></div><span className="text-xs text-blue-300">Open</span></summary>
    <form action="/api/media/comparison" className="grid gap-5 border-t border-white/7 p-4 sm:p-5" method="get">
      <div className="grid grid-cols-2 gap-3">{selected.map((photo, index) => <div className="min-w-0" key={index}><label className="label" htmlFor={index ? "afterId" : "beforeId"}>{index ? "After photo" : "Before photo"}</label><select className="field" id={index ? "afterId" : "beforeId"} name={index ? "afterId" : "beforeId"} onChange={(event) => index ? setAfterId(event.target.value) : setBeforeId(event.target.value)} value={index ? afterId : beforeId}>{photos.map((item, photoIndex) => <option disabled={item.id === (index ? beforeId : afterId)} key={item.id} value={item.id}>{item.comparisonTag === "UNTAGGED" ? `Photo ${photoIndex + 1}` : `${item.comparisonTag === "BEFORE" ? "Before" : "After"} · ${photoIndex + 1}`}</option>)}</select>{photo && <div className="mt-2 aspect-square overflow-hidden rounded-xl bg-slate-900"><img alt={index ? "Selected after" : "Selected before"} className="size-full object-cover" src={photo.url}/></div>}</div>)}</div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="comparison-format">Canvas</label><select className="field" id="comparison-format" name="format" onChange={(event) => setFormat(event.target.value)} value={format}><option value="post">Instagram post · 1080×1080</option><option value="story">Story · 1080×1920</option></select></div><div><label className="label" htmlFor="comparison-layout">Layout</label><select className="field" id="comparison-layout" name="layout" onChange={(event) => setLayout(event.target.value)} value={layout}><option value="side">Side by side</option><option value="stack">Top and bottom</option></select></div></div>
      <div><label className="label" htmlFor="before-share">Before photo size · {beforeShare}%</label><input className="w-full accent-fuchsia-300" id="before-share" max="75" min="25" name="beforeShare" onChange={(event) => setBeforeShare(Number(event.target.value))} type="range" value={beforeShare}/></div>
      <div className="grid gap-3 sm:grid-cols-3"><div><label className="label" htmlFor="before-position">Before alignment</label><select className="field" id="before-position" name="beforePosition" defaultValue="center"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div><div><label className="label" htmlFor="after-position">After alignment</label><select className="field" id="after-position" name="afterPosition" defaultValue="center"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div><div><label className="label" htmlFor="logo-size">Logo size</label><select className="field" id="logo-size" name="logoSize" defaultValue="13"><option value="9">Small</option><option value="13">Medium</option><option value="18">Large</option></select></div></div>
      {photos.length < 2 && <p className="text-sm text-amber-200">Add at least two photos to create a comparison.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs text-slate-500"><ImageIcon size={14}/>{format === "post" ? "Square post is selected by default." : "Full-screen story layout."}</p><button className="button" disabled={photos.length < 2 || !beforeId || !afterId || beforeId === afterId}><Download size={16}/>Generate & download</button></div>
    </form>
  </details>;
}
