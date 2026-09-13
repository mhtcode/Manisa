"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Send, Star } from "lucide-react";
import type { PublicLocale } from "@/lib/public-site";
import { REVIEW_MAX_WORDS, reviewWordCount } from "@/lib/reviews";
import { submitStudioReview, type PublicReviewResult } from "@/server/actions/reviews";

const copy = {
  en: { title: "Share your experience", rating: "Rating", choose: "Choose at least one star.", name: "Your name", opinion: "Your opinion", words: "words", send: "Send review", sending: "Sending…", success: "Thank you. Your review was sent for approval.", visit: "Visit the studio", location: "Toronto, Ontario · Visits are by appointment.", directions: "Open directions" },
  fa: { title: "تجربه خود را به اشتراک بگذارید", rating: "امتیاز", choose: "حداقل یک ستاره انتخاب کنید.", name: "نام شما", opinion: "نظر شما", words: "واژه", send: "ارسال نظر", sending: "در حال ارسال…", success: "سپاسگزاریم. نظر شما برای تأیید ارسال شد.", visit: "آدرس استودیو", location: "تورنتو، انتاریو · مراجعه فقط با تعیین وقت", directions: "مسیریابی" },
} as const;

export function PublicReviewForm({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [opinion, setOpinion] = useState("");
  const [result, setResult] = useState<PublicReviewResult>({});
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const next = await submitStudioReview(formData);
      setResult(next);
      if (next.success) { formRef.current?.reset(); setRating(0); setOpinion(""); }
    });
  }

  return <form action={submit} className="public-booking-card public-review-form p-5 sm:p-7" ref={formRef}>
    <h3 className="font-serif text-3xl">{t.title}</h3>
    <div className="mt-5"><div aria-label={t.rating} className="flex gap-1" role="radiogroup">{[1,2,3,4,5].map((value) => <label className="flex size-12 cursor-pointer items-center justify-center transition hover:scale-110" key={value}><input checked={rating === value} className="sr-only" name="rating" onChange={() => setRating(value)} required type="radio" value={value}/><Star aria-hidden="true" className={value <= rating ? "fill-[var(--public-accent)] text-[var(--public-accent)]" : "fill-transparent text-[var(--public-muted)] opacity-55"} size={25}/><span className="sr-only">{value}</span></label>)}</div><p className="mt-1 text-xs text-[var(--public-muted)]">{t.choose}</p></div>
    <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">{t.name}</span><input className="public-field" dir="auto" maxLength={80} name="reviewerName" required/></label>
    <label className="mt-4 block"><span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold"><span>{t.opinion}</span><span className={reviewWordCount(opinion) > REVIEW_MAX_WORDS ? "text-red-500" : "font-normal text-[var(--public-muted)]"}>{reviewWordCount(opinion)}/{REVIEW_MAX_WORDS} {t.words}</span></span><textarea className="public-field min-h-32 resize-y" dir="auto" maxLength={1600} minLength={10} name="opinion" onChange={(event) => setOpinion(event.target.value)} required value={opinion}/></label>
    <input aria-label="Leave this field empty" autoComplete="off" className="hidden" name="website" tabIndex={-1}/><input name="language" type="hidden" value={locale}/>
    {result.error && <p className="mt-4 text-sm text-red-500" role="alert">{locale === "fa" ? "نظر ارسال نشد. ورودی‌ها را بررسی و دوباره تلاش کنید." : result.error}</p>}{result.success && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600" role="status"><CheckCircle2 size={17}/>{locale === "fa" ? t.success : result.success}</p>}
    <button className="public-primary mt-5" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17}/> : <Send className={locale === "fa" ? "rotate-180" : ""} size={17}/>} {pending ? t.sending : t.send}</button>
  </form>;
}

export function PublicLocationCard({ address, locale }: { address: string; locale: PublicLocale }) {
  const t = copy[locale];
  const mapQuery = encodeURIComponent(address);
  return <section className="public-location-card" data-public-section="location" id="location"><div className="public-location-copy"><MapPin size={24}/><p>{t.visit}</p><h3 dir="auto">{address}</h3><span>{t.location}</span><a href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} rel="noreferrer" target="_blank">{t.directions} ↗</a></div><iframe allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} title={`${t.visit}: ${address}`}/></section>;
}
