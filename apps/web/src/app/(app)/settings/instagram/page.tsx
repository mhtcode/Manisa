import Link from "next/link";
import { ArrowLeft, Instagram } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

export default function InstagramSettingsPage() {
  return <><PageHeading title="Instagram" description="Connect the studio’s Professional account to show its latest work publicly." actions={<Link className="button-secondary" href="/settings"><ArrowLeft size={16}/>Settings</Link>}/><section className="panel max-w-2xl p-6"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Instagram size={20}/></span><h2 className="mt-5 font-semibold text-white">Setup required</h2><p className="mt-2 text-sm leading-6 text-slate-400">Add the Meta application credentials and a public HTTPS callback URL to enable connection. Until then, no Instagram section is shown on the public site.</p></section></>;
}
