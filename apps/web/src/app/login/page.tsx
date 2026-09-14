import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { GoogleAuthButton } from "@/components/google-auth-button";
import { getCurrentUser } from "@/lib/auth";
import { googleAuthConfigured } from "@/lib/env";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

const googleErrors: Record<string, string> = { "not-configured": "Google sign-in is not configured yet.", cancelled: "Google sign-in was cancelled.", "invalid-state": "That Google sign-in request expired. Please try again.", "token-exchange": "Google could not complete sign-in.", profile: "Your Google profile could not be read.", "unverified-email": "Use a verified Google email address.", inactive: "This account is inactive.", "email-linked": "That email is linked to another Google account.", "signup-disabled": "Google sign-up is disabled. Ask the administrator to enable it or link your existing email.", failed: "Google sign-in failed. Please try again." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ google?: string; error?: string; invitation?: string }> }) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/report");
  const params = await searchParams;
  const google = params.google;
  const accessError = params.error === "no-access" ? "Your account access is disabled. Contact the owner." : undefined;
  const invitationAccepted = params.invitation === "accepted";
  return <main className="public-login-page public-site grid min-h-screen bg-[var(--public-bg)] text-[var(--public-ink)] lg:grid-cols-[1.05fr_.95fr]" data-public-theme="dark">
    <section className="relative hidden overflow-hidden border-e border-[var(--public-line)] p-12 lg:flex lg:flex-col lg:justify-between"><div className="public-orb -start-24 top-24 size-80 bg-[#c96f73]/35"/><div className="public-orb -end-20 bottom-10 size-96 bg-[#d69a64]/25"/><BrandLink/><div className="relative max-w-xl"><p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--public-accent)]">Studio management</p><h1 className="font-serif text-6xl leading-[.98] tracking-[-0.055em]">Everything your studio needs, in one clear place.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-[var(--public-muted)]">Customers, appointments, payments, and insights—organized around the work you do every day.</p></div><p className="relative text-sm text-[var(--public-muted)]">Private · Secure · Bilingual</p></section>
    <section className="flex items-center justify-center px-5 py-14 sm:px-10"><div className="w-full max-w-md rounded-[2rem] bg-[var(--public-card)] p-6 shadow-2xl ring-1 ring-[var(--public-line)] sm:p-9"><div className="mb-10 lg:hidden"><BrandLink/></div><p className="text-sm font-medium text-[var(--public-accent)]">Welcome back</p><h2 className="mt-2 font-serif text-4xl tracking-[-0.04em]">Sign in to Manisa</h2><p className="mt-3 text-sm leading-6 text-[var(--public-muted)]">Use your administrator account to continue.</p>{invitationAccepted && <p className="mt-5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">Invitation accepted. Sign in with your new account.</p>}{(accessError || (google && googleErrors[google])) && <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">{accessError || googleErrors[google!]}</p>}<LoginForm/><div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[.15em] text-[var(--public-muted)]"><span className="h-px flex-1 bg-[var(--public-line)]"/>or<span className="h-px flex-1 bg-[var(--public-line)]"/></div><GoogleAuthButton configured={googleAuthConfigured()}/></div></section>
  </main>;
}

function BrandLink() { return <Link className="inline-flex items-center gap-3" href="/" aria-label="Manisa home"><BrandLogo priority size={50}/><span className="text-lg font-semibold">Manisa</span></Link>; }
