"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { login, type LoginState } from "@/server/actions/auth";
const initialState: LoginState = {};
export function LoginForm() {
  const [state, action, pending] = useActionState(login, initialState);
  const [visible, setVisible] = useState(false);
  return <form action={action} className="mt-8 space-y-5">
    <div><label className="label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" autoComplete="email" required /></div>
    <div><label className="label" htmlFor="password">Password</label><div className="relative"><input className="field pe-11" id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" minLength={8} required /><button className="absolute inset-y-0 end-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-300" type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? "Hide password" : "Show password"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
    {state.error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">{state.error}</p>}
    <button className="button w-full" disabled={pending}>{pending && <LoaderCircle className="animate-spin" size={18} />}{pending ? "Signing in…" : "Sign in"}</button>
  </form>;
}
