import { ShieldCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { PasswordChangeForm } from "@/components/password-change-form";

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  return <><PageHeading backHref="/settings" title="Profile & security"/><div className="grid gap-5 xl:grid-cols-2"><section className="panel max-w-2xl p-5 sm:p-7"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><ShieldCheck size={20}/></span><dl className="mt-6 grid gap-5 sm:grid-cols-2"><div><dt className="text-xs text-slate-600">Name</dt><dd className="mt-1.5 text-sm text-slate-200">{user.name}</dd></div><div><dt className="text-xs text-slate-600">Role</dt><dd className="mt-1.5 text-sm capitalize text-slate-200">{user.membership.role.toLowerCase()}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-slate-600">Email</dt><dd className="mt-1.5 text-sm text-slate-200">{user.email}</dd></div></dl></section><PasswordChangeForm/></div></>;
}
