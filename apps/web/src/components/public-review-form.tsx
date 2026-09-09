"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, LoaderCircle, Send, Star } from "lucide-react";
import { submitStudioReview, type PublicReviewResult } from "@/server/actions/reviews";

export function PublicReviewForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [rating, setRating] = useState(5);
  const [result, setResult] = useState<PublicReviewResult>({});
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setResult({});
    startTransition(async () => {
      const next = await submitStudioReview(formData);
      setResult(next);
      if (next.success) { formRef.current?.reset(); setRating(5); }
    });
  }

  return <form action={submit} className="rounded-[2rem] bg-white/75 p-5 shadow-[0_24px_70px_rgba(77,49,39,.12)] backdrop-blur sm:p-7" ref={formRef}>
    <h3 className="font-serif text-3xl">Share your experience</h3>
    <p className="mt-2 text-sm leading-6 text-[#755f54]">Your review will appear after the studio approves it.</p>
    <div className="mt-5 flex gap-1" role="radiogroup" aria-label="Rating">{[1,2,3,4,5].map((value) => <label className="cursor-pointer p-1" key={value}><input checked={rating === value} className="sr-only" name="rating" onChange={() => setRating(value)} type="radio" value={value}/><Star aria-hidden="true" className={value <= rating ? "fill-[#bd6f54] text-[#bd6f54]" : "text-[#bda99e]"} size={24}/><span className="sr-only">{value} stars</span></label>)}</div>
    <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">Your name</span><input className="w-full rounded-2xl bg-[#f8f2ec] px-4 py-3 outline-none ring-1 ring-[#5f4539]/15 transition focus:ring-2 focus:ring-[#bd6f54]/55" dir="auto" maxLength={80} name="reviewerName" required/></label>
    <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold">Your opinion</span><textarea className="min-h-32 w-full resize-y rounded-2xl bg-[#f8f2ec] px-4 py-3 outline-none ring-1 ring-[#5f4539]/15 transition focus:ring-2 focus:ring-[#bd6f54]/55" dir="auto" maxLength={1200} minLength={10} name="opinion" required/></label>
    <input autoComplete="off" className="hidden" name="website" tabIndex={-1}/>
    {result.error && <p className="mt-4 text-sm text-[#9f342e]" role="alert">{result.error}</p>}
    {result.success && <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#396348]" role="status"><CheckCircle2 size={17}/>{result.success}</p>}
    <button className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#30251f] px-6 font-semibold text-white disabled:opacity-60" disabled={pending}>{pending ? <LoaderCircle className="animate-spin" size={17}/> : <Send size={17}/>}Send review</button>
  </form>;
}
