"use client";

import { useActionState } from "react";
import { AlertTriangle, CheckCircle2, Upload } from "lucide-react";
import { PhotoUploadField } from "@/components/photo-upload-field";

type Result = { error?: string; success?: string; resetKey?: string } | null;

export function AppointmentPhotoUploadForm({ action }: { action: (previous: Result, formData: FormData) => Promise<Result> }) {
  const [state, formAction, pending] = useActionState(action, null);
  return <form action={formAction} className="space-y-3">
    <PhotoUploadField disabled={pending} key={state?.resetKey || "photo-picker"}/>
    {state?.error && <p className="flex items-start gap-2 text-sm text-rose-200" role="alert"><AlertTriangle className="mt-0.5 shrink-0" size={15}/>{state.error}</p>}
    {state?.success && <p className="flex items-center gap-2 text-sm text-emerald-200" role="status"><CheckCircle2 size={15}/>{state.success}</p>}
    <button className="button w-full" disabled={pending}><Upload size={16}/>{pending ? "Optimizing and uploading…" : "Add to visit gallery"}</button>
  </form>;
}
