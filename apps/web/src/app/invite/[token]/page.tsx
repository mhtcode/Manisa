import { createHash } from "node:crypto";
import { InvitationForm } from "@/components/invitation-form";
import { prisma } from "@/lib/prisma";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await prisma.invitation.findUnique({ where: { tokenHash: createHash("sha256").update(token).digest("hex") }, include: { business: { select: { name: true } } } });
  const valid = invitation && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date();
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d131d] p-6 sm:p-8">{valid ? <><p className="text-sm text-blue-300">Invitation</p><h1 className="mt-2 text-3xl font-semibold">Join {invitation.business?.name || "Manisa Platform"}</h1><InvitationForm email={invitation.email} token={token}/></> : <><h1 className="text-2xl font-semibold">Invitation unavailable</h1><p className="mt-3 text-slate-400">This link expired, was revoked, or has already been used.</p></>}</section></main>;
}
