import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  return <><PageHeading title="Profile & security" description="Administrator identity and protected management access." actions={<Link className="button-secondary" href="/settings"><ArrowLeft size={16}/>Settings</Link>}/><section className="panel max-w-2xl p-5 sm:p-7"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ShieldCheck size={20}/></span><dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Name</dt><dd className="mt-1.5 text-sm text-slate-200">{user.name}</dd></div><div><dt className="text-xs text-slate-600">Role</dt><dd className="mt-1.5 text-sm text-slate-200">Administrator</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-600">Email</dt><dd className="mt-1.5 text-sm text-slate-200">{user.email}</dd></div></dl><p className="mt-6 border-t border-white/8 pt-5 text-xs leading-5 text-slate-500">Sessions use secure, HTTP-only cookies. Credentials and connected account tokens are never exposed to the browser.</p></section></>;
}
