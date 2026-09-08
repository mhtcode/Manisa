import { ShieldCheck, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import { MemberInvitationForm } from "@/components/member-invitation-form";
import { MemberAccessEditor } from "@/components/member-access-editor";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStudioMember, setMembershipActive } from "@/server/actions/platform";
import { businessPermissionKeys, canManageStudioMember, hasBusinessPermission } from "@/lib/permissions";

export default async function MembersPage() {
  const user = await requireBusinessPermission("members.manage");
  const users = await prisma.user.findMany({ where: { deletedAt: null }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] });
  const currentIsOwner = user.role === "OWNER";
  return <><PageHeading backHref="/settings" title="Members"/><section className="panel mb-5 p-4 sm:p-5"><MemberInvitationForm canInviteAdministrators={currentIsOwner}/></section><section className="panel overflow-hidden"><div className="divide-y divide-white/8">{users.map((account) => { const isCurrentUser = account.id === user.id; const permissions = Object.fromEntries(businessPermissionKeys.map((key) => [key, hasBusinessPermission(account.role, account.permissionOverrides, key)])) as Record<(typeof businessPermissionKeys)[number], boolean>; const canManageAccount = !isCurrentUser && canManageStudioMember(user.role, account.role); return <article className="flex items-center gap-3 p-4" key={account.id}><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-300"><ShieldCheck size={17}/></span><div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{account.name}</h2><p className="truncate text-xs text-slate-500">{account.email}</p><p className="mt-1 text-[11px] capitalize text-slate-600">{account.role.toLowerCase()}{isCurrentUser ? " · You" : ""}{!account.active ? " · Disabled" : ""}</p></div>{account.role === "OWNER" ? <span className="badge">Owner</span> : isCurrentUser ? <span className="badge">Active</span> : canManageAccount ? <div className="flex gap-2"><MemberAccessEditor canTransfer={currentIsOwner} id={account.id} name={account.name} permissions={permissions} role={account.role}/><form action={setMembershipActive.bind(null, account.id, !account.active)}><button aria-label={account.active ? "Disable member" : "Enable member"} className="icon-button" title={account.active ? "Disable member" : "Enable member"}>{account.active ? <UserRoundX size={17}/> : <UserRoundCheck size={17}/>}</button></form><ConfirmActionForm action={deleteStudioMember.bind(null, account.id)} className="icon-button text-rose-300" message={`Delete ${account.name}'s studio access? They will be signed out and can only return through a new invitation.`} title={`Delete ${account.name}`}><Trash2 size={17}/></ConfirmActionForm></div> : <span className="badge">{account.active ? "Active" : "Disabled"}</span>}</article>; })}</div></section></>;
}
