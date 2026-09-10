"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";

type Review = { id: string; reviewerName: string; rating: number; opinion: string; language: "en" | "fa" };

export function ReviewCarousel({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reviews.length < 2) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % reviews.length), 5500);
    return () => window.clearInterval(timer);
  }, [reviews.length]);

  if (!reviews.length) return <div className="mt-9 rounded-[1.5rem] bg-white/50 p-6 text-sm leading-7 text-[#755f54]">Be the first to share your experience with the studio.</div>;

  const move = (offset: number) => setActive((index) => (index + offset + reviews.length) % reviews.length);
  return <div aria-label="Client reviews" aria-roledescription="carousel" className="mt-9 min-w-0 overflow-hidden">
    <div className="flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
      {reviews.map((review, index) => <article aria-hidden={index !== active} className="w-full shrink-0 px-0.5" key={review.id} lang={review.language}><div className="min-h-64 rounded-[1.5rem] bg-white/70 p-6 shadow-[0_16px_45px_rgba(77,49,39,.07)] sm:p-8"><div className="flex gap-1 text-[#bd6f54]">{Array.from({ length: 5 }, (_, star) => <Star className={star < review.rating ? "fill-current" : "opacity-25"} key={star} size={17}/>)}</div><blockquote className="mt-6 text-base leading-8 text-[#5f4a40] sm:text-lg" dir="auto">“{review.opinion}”</blockquote><p className="mt-5 text-sm font-semibold" dir="auto">{review.reviewerName}</p></div></article>)}
    </div>
    {reviews.length > 1 && <div className="mt-4 flex items-center justify-between gap-4"><div className="flex gap-1.5">{reviews.map((review, index) => <button aria-label={`Show review ${index + 1}`} className={`h-1.5 rounded-full transition-all ${index === active ? "w-7 bg-[#9a5d48]" : "w-2 bg-[#9a5d48]/25"}`} key={review.id} onClick={() => setActive(index)} type="button"/>)}</div><div className="flex gap-2"><button aria-label="Previous review" className="flex size-9 items-center justify-center rounded-full bg-white/55 text-[#684c40]" onClick={() => move(-1)} type="button"><ChevronLeft size={17}/></button><button aria-label="Next review" className="flex size-9 items-center justify-center rounded-full bg-white/55 text-[#684c40]" onClick={() => move(1)} type="button"><ChevronRight size={17}/></button></div></div>}
  </div>;
}
