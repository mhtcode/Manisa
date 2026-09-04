import { Building2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { switchWorkspace } from "@/server/actions/platform";
import { redirect } from "next/navigation";

export default async function WorkspacesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.memberships.length === 0) redirect(user.platformAccess?.active ? "/platform" : "/login");
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-lg"><h1 className="text-3xl font-semibold">Choose a workspace</h1><div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0d131d]">{user.memberships.map((membership) => <form action={switchWorkspace} className="border-b border-white/8 last:border-0" key={membership.id}><input name="businessId" type="hidden" value={membership.businessId}/><button className="flex w-full items-center gap-3 p-4 text-start hover:bg-blue-500/10"><Building2 className="text-blue-300" size={20}/><span className="flex-1"><strong className="block">{membership.business.name}</strong><span className="text-xs text-slate-500">{membership.role.toLowerCase()}</span></span></button></form>)}</div></section></main>;
}
