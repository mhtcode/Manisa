"use client";

import { useActionState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { reviewBookingRequest, type BookingRequestReviewState } from "@/server/actions/booking-requests";

export function BookingRequestActions({ id }: { id: string }) {
  const [state, action, pending] = useActionState<BookingRequestReviewState, FormData>(reviewBookingRequest.bind(null, id), null);
  return <form action={action} className="mt-3">
    <div className="flex flex-wrap gap-2">
      <button className="button min-h-9 px-3 py-2 text-xs" disabled={pending} name="decision" value="APPROVE">{pending ? <LoaderCircle className="animate-spin" size={14}/> : <Check size={14}/>}Approve</button>
      <button className="button-secondary min-h-9 px-3 py-2 text-xs" disabled={pending} name="decision" value="DECLINE"><X size={14}/>Decline</button>
    </div>
    {state?.error && <p className="mt-2 text-xs text-rose-300" role="alert">{state.error}</p>}
    {state?.success && <p className="mt-2 text-xs text-emerald-300" role="status">{state.success}</p>}
  </form>;
}
