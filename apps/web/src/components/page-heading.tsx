import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeading({ title, actions, backHref, backLabel = "Back to Settings" }: { title: string; description?: string; actions?: React.ReactNode; backHref?: string; backLabel?: string }) { return <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2">{backHref && <Link aria-label={backLabel} className="icon-button shrink-0 rtl:order-last" href={backHref} title={backLabel}><ArrowLeft size={18}/></Link>}<h1 className="page-title truncate">{title}</h1></div>{actions && <div className="flex min-w-0 flex-wrap gap-2">{actions}</div>}</div>; }
