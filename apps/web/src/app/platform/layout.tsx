import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { requirePlatformPermission } from "@/lib/auth";
import { logout } from "@/server/actions/auth";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePlatformPermission("businesses.manage");
  return <div className="min-h-screen bg-[#080b10]"><header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#080b10]/90 px-4 backdrop-blur-xl sm:px-8"><Link href="/platform" className="flex items-center gap-2 font-semibold"><ShieldCheck className="text-blue-300" size={20}/>Manisa Platform</Link><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-400 sm:inline">{user.name}</span><form action={logout}><button aria-label="Sign out" className="icon-button"><LogOut size={17}/></button></form></div></header><main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main></div>;
}
