import Link from "next/link";

export function GoogleAuthButton({ configured }: { configured: boolean }) {
  if (!configured) return <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-center text-xs leading-5 text-slate-500">Google sign-in becomes available after its OAuth credentials and redirect URI are configured.</div>;
  return <Link className="button-secondary mt-5 w-full justify-center" href="/api/auth/google/connect"><span aria-hidden="true" className="flex size-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#4285f4]">G</span>Continue with Google</Link>;
}
