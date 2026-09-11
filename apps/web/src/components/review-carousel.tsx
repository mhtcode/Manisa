"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { PublicLocale } from "@/lib/public-site";

type Review = { id: string; reviewerName: string; rating: number; opinion: string; language: "en" | "fa" };

export function ReviewCarousel({ reviews, locale }: { reviews: Review[]; locale: PublicLocale }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reviews.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % reviews.length), 5500);
    return () => window.clearInterval(timer);
  }, [reviews.length]);

  if (!reviews.length) return <div className="mt-9 rounded-[1.5rem] bg-[var(--public-card)] p-6 text-sm leading-7 text-[var(--public-muted)]">{locale === "fa" ? "اولین نفری باشید که تجربه خود را با استودیو به اشتراک می‌گذارد." : "Be the first to share your experience with the studio."}</div>;

  const move = (offset: number) => setActive((index) => (index + offset + reviews.length) % reviews.length);
  return <div aria-label={locale === "fa" ? "نظرهای مشتریان" : "Client reviews"} aria-roledescription="carousel" className="mt-9 min-w-0 overflow-hidden">
    <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(${(locale === "fa" ? 1 : -1) * active * 100}%)` }}>
      {reviews.map((review, index) => <article aria-hidden={index !== active} className="w-full shrink-0 px-0.5" key={review.id} lang={review.language}><div className="min-h-64 rounded-[1.5rem] bg-[var(--public-card)] p-6 shadow-[0_16px_45px_rgba(77,49,39,.07)] sm:p-8"><div className="flex gap-1 text-[var(--public-accent)]">{Array.from({ length: 5 }, (_, star) => <Star className={star < review.rating ? "fill-current" : "opacity-25"} key={star} size={17}/>)}</div><blockquote className="mt-6 text-base leading-8 text-[var(--public-muted)] sm:text-lg" dir="auto">“{review.opinion}”</blockquote><p className="mt-5 text-sm font-semibold" dir="auto">{review.reviewerName}</p></div></article>)}
    </div>
    {reviews.length > 1 && <div className="mt-4 flex items-center justify-between gap-4"><div className="flex gap-1.5">{reviews.map((review, index) => <button aria-label={`${locale === "fa" ? "نمایش نظر" : "Show review"} ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-[var(--public-accent)]" : "w-2 bg-[var(--public-line)]"}`} key={review.id} onClick={() => setActive(index)} type="button"/>)}</div><div className="flex gap-2"><button aria-label={locale === "fa" ? "نظر قبلی" : "Previous review"} className="public-control size-9 min-h-9 p-0" onClick={() => move(-1)} type="button"><ChevronLeft className={locale === "fa" ? "rotate-180" : ""} size={17}/></button><button aria-label={locale === "fa" ? "نظر بعدی" : "Next review"} className="public-control size-9 min-h-9 p-0" onClick={() => move(1)} type="button"><ChevronRight className={locale === "fa" ? "rotate-180" : ""} size={17}/></button></div></div>}
  </div>;
}
