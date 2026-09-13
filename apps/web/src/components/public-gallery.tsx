"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info, Maximize2, Minus, Plus, RotateCcw, X } from "lucide-react";
import { clampPublicGalleryZoom, publicGalleryFullSource, resolvePublicGalleryIndex, type PublicLocale } from "@/lib/public-site";

type GalleryItem = {
  id: string;
  src: string;
  alt: string;
  title?: string;
  detail?: string;
  unoptimized?: boolean;
};

export function PublicGallery({ items, locale }: { items: GalleryItem[]; locale: PublicLocale }) {
  const [active, setActive] = useState<number | null>(null);
  const [flipped, setFlipped] = useState<string | null>(null);
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

  const move = (offset: number) => { setActive((index) => resolvePublicGalleryIndex(index ?? 0, offset, items.length)); setZoom(1); };
  const open = (index: number) => { setActive(index); setZoom(1); };

  return <>
    <div className="public-work-puzzle">
      {items.map((item, index) => {
        const isFlipped = flipped === item.id;
        const fullSource = publicGalleryFullSource(item.src);
        return <article className={`public-work-card public-work-card-${index % 6}`} data-flipped={isFlipped ? "true" : undefined} key={item.id}>
          <div className="public-work-card-inner">
            <button aria-label={locale === "fa" ? "نمایش اطلاعات تصویر" : "Show image details"} aria-pressed={isFlipped} className="public-work-card-face public-work-card-front" onClick={() => setFlipped(item.id)} type="button">
              <span aria-hidden className="public-work-card-blur" style={{ backgroundImage: `url("${fullSource}")` }}/>
              <Image alt={item.alt} className="public-work-card-image object-contain" fill sizes="(max-width:768px) 50vw, 32vw" src={fullSource} unoptimized={item.unoptimized}/>
              <span className="public-work-card-hint"><Info size={16}/></span>
            </button>
            <div aria-hidden={!isFlipped} className="public-work-card-face public-work-card-back">
              <div><p>{locale === "fa" ? "نمونه‌کار مانیسا" : "Manisa studio work"}</p><h3 dir="auto">{item.title || (locale === "fa" ? "زیبایی در جزئیات" : "Beauty in every detail")}</h3><span dir="auto">{item.detail || (locale === "fa" ? "برای دیدن تصویر کامل آن را باز کنید." : "Open the full image and explore every detail.")}</span></div>
              <div className="public-work-card-actions"><button aria-label={locale === "fa" ? "بازگشت به تصویر" : "Flip back to image"} onClick={() => setFlipped(null)} title={locale === "fa" ? "بازگشت" : "Flip back"} type="button"><RotateCcw size={17}/></button><button aria-label={locale === "fa" ? "باز کردن تصویر کامل" : "Open full image"} onClick={() => open(index)} title={locale === "fa" ? "تصویر کامل" : "Full image"} type="button"><Maximize2 size={17}/></button></div>
            </div>
          </div>
        </article>;
      })}
    </div>
    {active !== null && items[active] ? <div aria-label={locale === "fa" ? "نمایشگر نمونه‌کارها" : "Studio gallery viewer"} aria-modal="true" className="public-lightbox" onClick={(event) => { if (event.target === event.currentTarget) setActive(null); }} role="dialog">
      <div className="public-lightbox-toolbar"><p dir="ltr">{active + 1} / {items.length}</p><div><button aria-label={locale === "fa" ? "کوچک‌نمایی" : "Zoom out"} disabled={zoom <= 1} onClick={() => setZoom((value) => clampPublicGalleryZoom(value - .25))} type="button"><Minus size={19}/></button><button aria-label={locale === "fa" ? "بزرگ‌نمایی" : "Zoom in"} disabled={zoom >= 3} onClick={() => setZoom((value) => clampPublicGalleryZoom(value + .25))} type="button"><Plus size={19}/></button><button aria-label={closeLabel} onClick={() => setActive(null)} type="button"><X size={20}/></button></div></div>
      <div className="public-lightbox-stage" onTouchEnd={(event) => { const start = touchStart.current; if (start === null) return; const distance = event.changedTouches[0].clientX - start; if (Math.abs(distance) > 45) move(distance > 0 ? -1 : 1); touchStart.current = null; }} onTouchStart={(event) => { touchStart.current = event.changedTouches[0].clientX; }}><Image alt={items[active].alt} className="object-contain transition-transform duration-300" fill sizes="100vw" src={publicGalleryFullSource(items[active].src)} style={{ transform: `scale(${zoom})` }} unoptimized={items[active].unoptimized}/></div>
      {items.length > 1 && <><button aria-label={locale === "fa" ? "تصویر قبلی" : "Previous image"} className="public-lightbox-previous" onClick={() => move(-1)} type="button"><ChevronLeft size={26}/></button><button aria-label={locale === "fa" ? "تصویر بعدی" : "Next image"} className="public-lightbox-next" onClick={() => move(1)} type="button"><ChevronRight size={26}/></button></>}
    </div> : null}
  </>;
}
