import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
    <section className="hidden border-e border-white/8 bg-[radial-gradient(circle_at_25%_25%,rgba(45,212,191,0.12),transparent_32rem)] p-12 lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-teal-300 font-bold text-slate-950">M</span><span className="text-lg font-semibold">Manisa</span></div><div className="max-w-xl"><p className="mb-6 text-sm font-semibold uppercase tracking-[0.2em] text-teal-300">Business management platform</p><h1 className="text-6xl font-semibold leading-[1.04] tracking-[-0.055em]">Everything your business needs, in one clear place.</h1><p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">Customers, appointments, payments, and insights—organized around the work you do every day.</p></div><p className="text-sm text-slate-600">Private · Secure · Bilingual</p></section>
    <section className="flex items-center justify-center px-5 py-14 sm:px-10"><div className="w-full max-w-md"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="flex size-10 items-center justify-center rounded-xl bg-teal-300 font-bold text-slate-950">M</span><span className="text-lg font-semibold">Manisa</span></div><p className="text-sm font-medium text-teal-300">Welcome back</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Sign in to Manisa</h2><p className="mt-3 text-sm leading-6 text-slate-500">Use your administrator account to continue.</p><LoginForm /></div></section>
  </main>;
}
