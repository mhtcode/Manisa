"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus, X } from "lucide-react";
import { clampPublicGalleryZoom, publicGalleryFullSource, resolvePublicGalleryIndex, type PublicLocale } from "@/lib/public-site";

type GalleryItem = { id: string; src: string; alt: string; unoptimized?: boolean };

export function PublicGallery({ items, locale }: { items: GalleryItem[]; locale: PublicLocale }) {
  const [active, setActive] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [zoom, setZoom] = useState(1);
  const touchStart = useRef<number | null>(null);
  const closeLabel = locale === "fa" ? "بستن نمایشگر" : "Close gallery";

  useEffect(() => {
    if (active === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowLeft") setActive((index) => resolvePublicGalleryIndex(index ?? 0, locale === "fa" ? 1 : -1, items.length));
      if (event.key === "ArrowRight") setActive((index) => resolvePublicGalleryIndex(index ?? 0, locale === "fa" ? -1 : 1, items.length));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [active, items.length, locale]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => setSlide((index) => resolvePublicGalleryIndex(index, 1, items.length)), 5500);
    return () => window.clearInterval(timer);
  }, [items.length]);

  const move = (offset: number) => { setActive((index) => resolvePublicGalleryIndex(index ?? 0, offset, items.length)); setZoom(1); };
  const open = (index: number) => { setActive(index); setZoom(1); };

  return <>
    <div className="public-work-slideshow">
      <button aria-label={`${locale === "fa" ? "باز کردن تصویر" : "Open studio image"} ${slide + 1}`} className="public-work-slide" onClick={() => open(slide)} type="button"><Image alt={items[slide]?.alt || ""} className="object-contain" fill sizes="(max-width:768px) 100vw, 80vw" src={publicGalleryFullSource(items[slide]?.src || "")} unoptimized={items[slide]?.unoptimized}/><span><Maximize2 size={18}/></span></button>
      {items.length > 1 && <div className="public-work-slide-controls"><button aria-label={locale === "fa" ? "تصویر قبلی" : "Previous image"} onClick={() => setSlide((index) => resolvePublicGalleryIndex(index, -1, items.length))} type="button"><ChevronLeft size={20}/></button><div>{items.map((item, index) => <button aria-label={`${locale === "fa" ? "نمایش تصویر" : "Show image"} ${index + 1}`} data-active={index === slide ? "true" : undefined} key={item.id} onClick={() => setSlide(index)} type="button"/>)}</div><button aria-label={locale === "fa" ? "تصویر بعدی" : "Next image"} onClick={() => setSlide((index) => resolvePublicGalleryIndex(index, 1, items.length))} type="button"><ChevronRight size={20}/></button></div>}
    </div>
    {active !== null && items[active] ? <div aria-label={locale === "fa" ? "نمایشگر نمونه‌کارها" : "Studio gallery viewer"} aria-modal="true" className="public-lightbox" onClick={(event) => { if (event.target === event.currentTarget) setActive(null); }} role="dialog">
      <div className="public-lightbox-toolbar"><p dir="ltr">{active + 1} / {items.length}</p><div><button aria-label={locale === "fa" ? "کوچک‌نمایی" : "Zoom out"} disabled={zoom <= 1} onClick={() => setZoom((value) => clampPublicGalleryZoom(value - .25))} type="button"><Minus size={19}/></button><button aria-label={locale === "fa" ? "بزرگ‌نمایی" : "Zoom in"} disabled={zoom >= 3} onClick={() => setZoom((value) => clampPublicGalleryZoom(value + .25))} type="button"><Plus size={19}/></button><button aria-label={closeLabel} onClick={() => setActive(null)} type="button"><X size={20}/></button></div></div>
      <div className="public-lightbox-stage" onTouchEnd={(event) => { const start = touchStart.current; if (start === null) return; const distance = event.changedTouches[0].clientX - start; if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1); touchStart.current = null; }} onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX; }}><Image alt={items[active].alt} className="object-contain transition-transform duration-300" fill sizes="100vw" src={publicGalleryFullSource(items[active].src)} style={{ transform: `scale(${zoom})` }} unoptimized={items[active].unoptimized}/></div>
      {items.length > 1 && <><button aria-label={locale === "fa" ? "تصویر قبلی" : "Previous image"} className="public-lightbox-previous" onClick={() => move(-1)} type="button"><ChevronLeft size={26}/></button><button aria-label={locale === "fa" ? "تصویر بعدی" : "Next image"} className="public-lightbox-next" onClick={() => move(1)} type="button"><ChevronRight size={26}/></button></>}
    </div> : null}
  </>;
}
