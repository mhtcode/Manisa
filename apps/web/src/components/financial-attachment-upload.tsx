"use client";

import { useRef, useState } from "react";
import { LoaderCircle, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";

export function FinancialAttachmentUpload({ ownerId, ownerType }: { ownerId: string; ownerType: "bill" | "transaction" }) {
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  return <><input accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; setLoading(true); const data = new FormData(); data.set("file", file); data.set("ownerType", ownerType); data.set("ownerId", ownerId); const response = await fetch("/api/financial/attachments", { method: "POST", body: data }); setLoading(false); event.target.value = ""; if (!response.ok) { const result = await response.json().catch(() => ({})); window.alert(result.error || "Upload failed."); return; } router.refresh(); }} ref={input} type="file"/><button aria-label="Attach receipt or bill" className="icon-button" disabled={loading} onClick={() => input.current?.click()} title="Attach receipt or bill" type="button">{loading ? <LoaderCircle className="animate-spin" size={16}/> : <Paperclip size={16}/>}</button></>;
}
