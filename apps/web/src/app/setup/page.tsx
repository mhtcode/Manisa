import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { SetupForm } from "@/components/setup-form";
import { prisma } from "@/lib/prisma";

export default async function SetupPage() {
  if (await prisma.user.count()) redirect("/login");
  return <main className="flex min-h-screen items-center justify-center p-5"><section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0d131d] p-6 shadow-2xl sm:p-8"><BrandLogo className="mb-6" priority size={66}/><p className="text-sm font-semibold text-blue-300">First deployment</p><h1 className="mt-2 text-3xl font-semibold">Set up Manisa</h1><p className="mt-3 text-sm leading-6 text-slate-400">Create the sole studio owner account and configure your studio.</p><SetupForm/></section></main>;
}
