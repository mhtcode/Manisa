import Link from "next/link";
import { Archive, Download, FileArchive, RefreshCcw, Trash2, Upload } from "lucide-react";
import { ManualJsonImportForm } from "@/components/manual-json-import-form";
import { PageHeading } from "@/components/page-heading";
import { requireUser } from "@/lib/auth";
import { formatBusinessDate } from "@/lib/time";
import { hasBusinessPermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteBusinessExport, requestBusinessExport, retryBusinessExport } from "@/server/actions/data-transfer";

export default async function DataTransferPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const [user, query] = await Promise.all([requireUser(), searchParams]);
  const canImport = hasBusinessPermission(user.role, user.permissionOverrides, "data.import");
  const canExport = hasBusinessPermission(user.role, user.permissionOverrides, "data.export");
  if (!canImport && !canExport) throw new Error("You do not have access to data transfer.");
  const tab = query.tab === "export" && canExport ? "export" : canImport ? "import" : "export";
  const jobs = canExport ? await prisma.exportJob.findMany({ where: { }, orderBy: { createdAt: "desc" }, take: 20 }) : [];
  const today = new Date(); const from = new Date(today.getTime() - 30 * 86_400_000);
  return <><PageHeading backHref="/settings" title="Data transfer"/><nav className="mb-5 flex gap-2">{canImport && <Link className={`filter-chip ${tab === "import" ? "active" : ""}`} href="/settings/data-transfer?tab=import"><Upload size={15}/>Import</Link>}{canExport && <Link className={`filter-chip ${tab === "export" ? "active" : ""}`} href="/settings/data-transfer?tab=export"><Archive size={15}/>Export</Link>}</nav>
    {tab === "import" ? <div className="space-y-5"><ManualJsonImportForm/></div> : <div className="space-y-5"><section className="panel p-5 sm:p-6"><form action={requestBusinessExport} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label><span className="label">From</span><input className="field" defaultValue={from.toISOString().slice(0, 10)} name="fromDate" required type="date"/></label><label><span className="label">To</span><input className="field" defaultValue={today.toISOString().slice(0, 10)} name="toDate" required type="date"/></label><button className="button"><FileArchive size={16}/>Create export</button></form></section><section className="panel overflow-hidden"><div className="panel-header"><h2 className="font-semibold">Export history</h2></div><div className="divide-y divide-white/8">{jobs.map((job) => <article className="flex min-w-0 items-center gap-3 p-4" key={job.id}><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><FileArchive size={17}/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{formatBusinessDate(job.fromDate, "en", user.settings?.timezone)} — {formatBusinessDate(job.toDate, "en", user.settings?.timezone)}</p><p className="mt-1 text-xs text-slate-500">{job.status} · {job.fileCount || 0} files{job.sizeBytes ? ` · ${(job.sizeBytes / 1024 / 1024).toFixed(1)} MB` : ""}</p>{job.errorMessage && <p className="mt-1 truncate text-xs text-rose-300">{job.errorMessage}</p>}</div><div className="flex gap-1">{job.status === "READY" && <a aria-label="Download export" className="icon-button" href={`/api/exports/${job.id}`} title="Download"><Download size={16}/></a>}{(job.status === "FAILED" || job.status === "EXPIRED") && <form action={retryBusinessExport.bind(null, job.id)}><button aria-label="Retry export" className="icon-button" title="Retry"><RefreshCcw size={16}/></button></form>}<form action={deleteBusinessExport.bind(null, job.id)}><button aria-label="Delete export" className="icon-button text-rose-300" disabled={job.status === "PROCESSING"} title="Delete"><Trash2 size={16}/></button></form></div></article>)}{!jobs.length && <p className="p-8 text-center text-sm text-slate-500">No exports yet.</p>}</div></section></div>}
  </>;
}
