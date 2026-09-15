import { PageHeading } from "@/components/page-heading";
import { PasswordChangeForm } from "@/components/password-change-form";
import { requireUser } from "@/lib/auth";

export default async function SecuritySettingsPage() {
  const user = await requireUser();
  return <><PageHeading backHref="/settings/business" title="Profile & security" description="Review your account and update its password."/><div className="grid gap-4 xl:grid-cols-2"><section className="panel p-5 sm:p-6"><dl className="grid gap-5 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Name</dt><dd className="mt-1.5 text-base text-slate-200">{user.name}</dd></div><div><dt className="text-sm text-slate-500">Role</dt><dd className="mt-1.5 text-base capitalize text-slate-200">{user.role.toLowerCase()}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-slate-500">Email</dt><dd className="mt-1.5 text-base text-slate-200">{user.email}</dd></div></dl></section><PasswordChangeForm/></div></>;
}
