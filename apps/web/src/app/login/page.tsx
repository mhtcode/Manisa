import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { getCurrentUser } from "@/lib/auth";
import { googleAuthConfigured } from "@/lib/env";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const googleErrors: Record<string, string> = { "not-configured": "Google sign-in is not configured yet.", cancelled: "Google sign-in was cancelled.", "invalid-state": "That Google sign-in request expired. Please try again.", "token-exchange": "Google could not complete sign-in.", profile: "Your Google profile could not be read.", "unverified-email": "Use a verified Google email address.", inactive: "This account is inactive.", "email-linked": "That email is linked to another Google account.", "signup-disabled": "Google sign-up is disabled. Ask the administrator to enable it or link your existing email.", failed: "Google sign-in failed. Please try again." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ google?: string; error?: string; invitation?: string }> }) {
  const currentUser = await getCurrentUser();
  if (currentUser?.businessId) redirect("/report");
  if (currentUser?.platformAccess?.active) redirect("/platform");
  const params = await searchParams;
  const google = params.google;
  const accessError = params.error === "no-access" ? "Your account or workspace access is disabled. Contact the owner." : undefined;
  const invitationAccepted = params.invitation === "accepted";
  return <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
    <section className="hidden border-e border-white/8 bg-[radial-gradient(circle_at_25%_25%,rgba(45,212,191,0.12),transparent_32rem)] p-12 lg:flex lg:flex-col lg:justify-between"><BrandLink/><div className="max-w-xl"><p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">Business management platform</p><h1 className="text-6xl font-semibold leading-[1.04] tracking-[-0.055em]">Everything your business needs, in one clear place.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">Customers, appointments, payments, and insights—organized around the work you do every day.</p></div><p className="text-sm text-slate-600">Private · Secure · Bilingual</p></section>
    <section className="flex items-center justify-center px-5 py-14 sm:px-10"><div className="w-full max-w-md"><div className="mb-10 lg:hidden"><BrandLink/></div><p className="text-sm font-medium text-teal-300">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Sign in to Manisa</h2><p className="mt-3 text-sm leading-6 text-slate-500">Use your administrator account to continue.</p>{invitationAccepted && <p className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">Invitation accepted. Sign in with your new account.</p>}{(accessError || (google && googleErrors[google])) && <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">{accessError || googleErrors[google!]}</p>}<LoginForm/><div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[.15em] text-slate-600"><span className="h-px flex-1 bg-white/8"/>or<span className="h-px flex-1 bg-white/8"/></div><GoogleAuthButton configured={googleAuthConfigured()}/></div></section>
  </main>;
}

function BrandLink() { return <Link className="inline-flex items-center gap-3" href="/" aria-label="Manisa home"><span className="flex size-10 items-center justify-center rounded-xl border border-blue-300/20 bg-gradient-to-br from-[#19345f] to-[#0c1930] text-blue-200"><Sparkles size={19}/></span><span className="text-lg font-semibold">Manisa</span></Link>; }
