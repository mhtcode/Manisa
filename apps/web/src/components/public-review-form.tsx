"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Send, Star } from "lucide-react";
import type { PublicLocale } from "@/lib/public-site";
import { REVIEW_MAX_WORDS, reviewWordCount } from "@/lib/reviews";
import { submitStudioReview, type PublicReviewResult } from "@/server/actions/reviews";

const copy = {
  en: { title: "Share your experience", intro: "Your review will appear after the studio approves it.", rating: "Rating", choose: "Choose at least one star.", name: "Your name", opinion: "Your opinion", words: "words", send: "Send review", sending: "Sending…", success: "Thank you. Your review was sent for approval.", visit: "Visit the studio", location: "Toronto, Ontario · Visits are by appointment.", directions: "Open directions" },
  fa: { title: "تجربه خود را به اشتراک بگذارید", intro: "نظر شما پس از تأیید استودیو نمایش داده می‌شود.", rating: "امتیاز", choose: "حداقل یک ستاره انتخاب کنید.", name: "نام شما", opinion: "نظر شما", words: "واژه", send: "ارسال نظر", sending: "در حال ارسال…", success: "سپاسگزاریم. نظر شما برای تأیید ارسال شد.", visit: "آدرس استودیو", location: "تورنتو، انتاریو · مراجعه فقط با تعیین وقت", directions: "مسیریابی" },
} as const;

export function PublicReviewForm({ address, locale }: { address: string; locale: PublicLocale }) {
  const t = copy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(0);
  const [opinion, setOpinion] = useState("");
  const [result, setResult] = useState<PublicReviewResult>({});
  const [pending, startTransition] = useTransition();
  const mapQuery = encodeURIComponent(address);

  function submit(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const next = await submitStudioReview(formData);
      setResult(next);
      if (next.success) { formRef.current?.reset(); setRating(0); setOpinion(""); }
    });
  }

  return <div className="min-w-0"><form action={submit} className="public-booking-card p-5 sm:p-7" ref={formRef}>
    <h3 className="font-serif text-3xl">{t.title}</h3><p className="mt-2 text-sm leading-6 text-[var(--public-muted)]">{t.intro}</p>
    <div className="mt-5"><div aria-label={t.rating} className="flex gap-1" role="radiogroup">{[1,2,3,4,5].map((value) => <label className="cursor-pointer p-1 transition hover:scale-110" key={value}><input checked={rating === value} className="sr-only" name="rating" onChange={() => setRating(value)} required type="radio" value={value}/><Star aria-hidden="true" className={value <= rating ? "fill-[var(--public-accent)] text-[var(--public-accent)]" : "fill-transparent text-[var(--public-muted)] opacity-55"} size={25}/><span className="sr-only">{value}</span></label>)}</div><p className="mt-1 text-xs text-[var(--public-muted)]">{t.choose}</p></div>
    <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">{t.name}</span><input className="public-field" dir="auto" maxLength={80} name="reviewerName" required/></label>
    <label className="mt-4 block"><span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold"><span>{t.opinion}</span><span className={reviewWordCount(opinion) > REVIEW_MAX_WORDS ? "text-red-500" : "font-normal text-[var(--public-muted)]"}>{reviewWordCount(opinion)}/{REVIEW_MAX_WORDS} {t.words}</span></span><textarea className="public-field min-h-32 resize-y" dir="auto" maxLength={1600} minLength={10} name="opinion" onChange={(event) => setOpinion(event.target.value)} required value={opinion}/></label>
    <input autoComplete="off" className="hidden" name="website" tabIndex={-1}/><input name="language" type="hidden" value={locale}/>
    {result.error && <p className="mt-4 text-sm text-red-500" role="alert">{locale === "fa" ? "نظر ارسال نشد. ورودی‌ها را بررسی و دوباره تلاش کنید." : result.error}</p>}{result.success && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-600" role="status"><CheckCircle2 size={17}/>{locale === "fa" ? t.success : result.success}</p>}
    <button className="public-primary mt-5" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17}/> : <Send className={locale === "fa" ? "rotate-180" : ""} size={17}/>} {pending ? t.sending : t.send}</button>
  </form><section className="mt-4 min-w-0 overflow-hidden rounded-[2rem] bg-[var(--public-ink)] text-[var(--public-bg)] shadow-[0_28px_70px_rgba(77,49,39,.16)]" id="location"><div className="grid min-w-0"><div className="min-w-0 p-6 sm:p-8"><MapPin className="text-[var(--public-accent-2)]" size={24}/><p className="mt-5 text-xs font-semibold uppercase tracking-[.24em] text-[var(--public-accent-2)]">{t.visit}</p><h3 className="mt-3 break-words font-serif text-2xl sm:text-3xl" dir="auto">{address}</h3><p className="mt-3 text-sm leading-6 opacity-60">{t.location}</p><a className="mt-6 inline-flex text-sm font-semibold text-[var(--public-accent-2)]" href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} rel="noreferrer" target="_blank">{t.directions} ↗</a></div><iframe allowFullScreen className="min-h-64 w-full max-w-full border-0 grayscale-[.15]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${mapQuery}&output=embed`} title={`${t.visit}: ${address}`}/></div></section></div>;
}
