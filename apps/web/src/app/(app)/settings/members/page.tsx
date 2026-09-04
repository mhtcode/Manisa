import { ShieldCheck, UserRoundCheck, UserRoundX } from "lucide-react";
import { MemberInvitationForm } from "@/components/member-invitation-form";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setMembershipActive } from "@/server/actions/platform";

export default async function MembersPage() {
  const user = await requireBusinessPermission("members.manage");
  const memberships = await prisma.businessMembership.findMany({ where: { businessId: user.businessId, deletedAt: null }, include: { user: true }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  return <><PageHeading backHref="/settings" title="Members"/><section className="panel mb-5 p-4 sm:p-5"><MemberInvitationForm/></section><section className="panel overflow-hidden"><div className="divide-y divide-white/8">{memberships.map((membership) => { const isCurrentUser = membership.userId === user.id; return <article className="flex items-center gap-3 p-4" key={membership.id}><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><ShieldCheck size={17}/></span><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{membership.user.name}</h2><p className="truncate text-xs text-slate-500">{membership.user.email}</p><p className="mt-1 text-[11px] capitalize text-slate-600">{membership.role.toLowerCase()}{isCurrentUser ? " · You" : ""}</p></div>{membership.role === "OWNER" ? <span className="badge">Owner</span> : isCurrentUser ? <span className="badge">Active</span> : <form action={setMembershipActive.bind(null, membership.id, !membership.active)}><button aria-label={membership.active ? "Disable member" : "Enable member"} className="icon-button" title={membership.active ? "Disable member" : "Enable member"}>{membership.active ? <UserRoundX size={17}/> : <UserRoundCheck size={17}/>}</button></form>}</article>; })}</div></section></>;
}
