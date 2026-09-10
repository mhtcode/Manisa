"use client";

import { useActionState } from "react";
import { Check, Instagram, KeyRound, LoaderCircle } from "lucide-react";
import { saveInstagramCredentials, type InstagramCredentialResult } from "@/server/actions/instagram";

const initialState: InstagramCredentialResult = {};

export function InstagramCredentialsForm({ appId, redirectUri, source, encryptionReady }: { appId: string; redirectUri: string; source: "database" | "environment" | "none"; encryptionReady: boolean }) {
  const [state, action, pending] = useActionState(saveInstagramCredentials, initialState);
  return <details className="panel max-w-3xl overflow-hidden" open={source === "none"}>
    <summary className="panel-header cursor-pointer list-none [&::-webkit-details-marker]:hidden"><div className="flex items-center gap-3"><Instagram className="text-fuchsia-300" size={18}/><div><h2 className="font-semibold">Instagram OAuth credentials</h2><p className="mt-1 text-xs text-slate-500">{source === "database" ? "Encrypted credentials managed in Manisa" : source === "environment" ? "Currently provided by server environment" : "Not configured"}</p></div></div><span className="text-xs text-blue-300">Configure</span></summary>
    <form action={action} className="grid gap-4 border-t border-white/6 p-5 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="label" htmlFor="instagram-app-id">Instagram app ID</label><input className="field" defaultValue={appId} dir="ltr" id="instagram-app-id" name="appId" required/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="instagram-app-secret">App secret</label><input autoComplete="new-password" className="field" dir="ltr" id="instagram-app-secret" name="appSecret" placeholder={source === "database" ? "Leave blank to keep the encrypted secret" : "Enter the Meta app secret"} required={source !== "database"} type="password"/></div>
      <div className="sm:col-span-2"><label className="label" htmlFor="instagram-redirect-uri">Authorized redirect URI</label><input className="field" defaultValue={redirectUri} dir="ltr" id="instagram-redirect-uri" name="redirectUri" placeholder="https://your-domain/api/integrations/instagram/callback" required type="url"/></div>
      {!encryptionReady && <p className="sm:col-span-2 text-sm text-amber-200">The server owner must set INTEGRATION_ENCRYPTION_KEY before this secret can be saved.</p>}
      {state.error && <p className="sm:col-span-2 text-sm text-rose-300" role="alert">{state.error}</p>}
      {state.success && <p className="sm:col-span-2 flex items-center gap-2 text-sm text-emerald-300" role="status"><Check size={15}/>{state.success}</p>}
      <div className="sm:col-span-2 flex justify-end"><button className="button" disabled={pending || !encryptionReady}>{pending ? <LoaderCircle className="animate-spin" size={16}/> : <KeyRound size={16}/>}Save encrypted credentials</button></div>
    </form>
  </details>;
}
