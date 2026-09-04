import { Building2, Database, ExternalLink, ShieldCheck, Users } from "lucide-react";
import { requirePlatformPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBusiness, enterBusiness } from "@/server/actions/platform";

function bytes(value: bigint) { return `${(Number(value) / 1024 / 1024 / 1024).toFixed(2)} GiB`; }

export default async function PlatformPage() {
  await requirePlatformPermission("businesses.manage");
  const [businesses, users, audits] = await Promise.all([
    prisma.business.findMany({ where: { deletedAt: null }, include: { _count: { select: { memberships: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { active: true } }),
    prisma.auditLog.findMany({ take: 12, orderBy: { createdAt: "desc" }, include: { business: { select: { name: true } } } }),
  ]);
  return <>
    <div className="mb-6"><h1 className="text-3xl font-semibold">Platform</h1></div>
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3"><article className="panel p-4"><Building2 className="text-blue-300" size={19}/><strong className="mt-4 block text-2xl">{businesses.length}</strong><span className="text-sm text-slate-400">Businesses</span></article><article className="panel p-4"><Users className="text-blue-300" size={19}/><strong className="mt-4 block text-2xl">{users}</strong><span className="text-sm text-slate-400">Users</span></article><article className="panel col-span-2 p-4 sm:col-span-1"><Database className="text-blue-300" size={19}/><strong className="mt-4 block text-2xl">{bytes(businesses.reduce((sum, item) => sum + item.storageUsedBytes, BigInt(0)))}</strong><span className="text-sm text-slate-400">Stored media</span></article></section>
    <section className="panel mb-6 overflow-hidden"><div className="panel-header"><h2 className="font-semibold">Businesses</h2></div><div className="divide-y divide-white/8">{businesses.map((business) => <article className="flex items-center gap-3 p-4" key={business.id}><span className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Building2 size={18}/></span><div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{business.name}</h3><p className="text-xs text-slate-500">{business.slug} · {business._count.memberships} members · {bytes(business.storageUsedBytes)} / {bytes(business.storageQuotaBytes)}</p></div><form action={enterBusiness}><input name="businessId" type="hidden" value={business.id}/><button aria-label={`Enter ${business.name}`} className="icon-button"><ExternalLink size={17}/></button></form></article>)}</div></section>
    <section className="panel mb-6 p-5"><h2 className="font-semibold">Create business</h2><form action={createBusiness} className="mt-4 grid gap-3 sm:grid-cols-2"><input className="input" name="name" placeholder="Business name" required/><input className="input" name="slug" placeholder="public-address"/><select className="input" name="template"><option value="BLANK">Blank template</option><option value="NAIL_HAIR">Nail & Hair starter</option></select><button className="button">Create business</button></form></section>
    <section className="panel overflow-hidden"><div className="panel-header flex items-center gap-2"><ShieldCheck size={18}/><h2 className="font-semibold">Recent audit activity</h2></div><div className="divide-y divide-white/8">{audits.map((audit) => <div className="p-4 text-sm" key={audit.id}><strong>{audit.action}</strong><span className="text-slate-500"> · {audit.business?.name || "Platform"} · {audit.actorSnapshot}</span></div>)}</div></section>
  </>;
}
