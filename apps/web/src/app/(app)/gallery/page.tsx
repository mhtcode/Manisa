import type { Prisma } from "@prisma/client";
/* eslint-disable @next/next/no-img-element -- protected media uses intrinsic proportions */
import Link from "next/link";
import { CalendarDays, Camera, ChevronDown, Filter, Images, Scissors, UserRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { BulkSelection, SelectableLink } from "@/components/bulk-selection";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { bulkMoveGalleryAlbumsToTrash } from "@/server/actions/trash";

const PAGE_SIZE = 24;

function decodeCursor(value?: string) {
  if (!value) return null;
  try { const [startAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); const date = new Date(startAt); return typeof id === "string" && !Number.isNaN(date.getTime()) ? { startAt: date, id } : null; }
  catch { return null; }
}

function encodeCursor(album: { startAt: Date; id: string }) { return Buffer.from(JSON.stringify([album.startAt.toISOString(), album.id])).toString("base64url"); }

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ customerId?: string; serviceId?: string; cursor?: string; from?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireBusinessPermission("gallery.view")]);
  const view = collectionView(user.settings?.collectionViews, "gallery", "grid");
  const locale = user.settings?.locale || "en";
  const timezone = user.settings?.timezone || "America/Toronto";
  const customerId = query.customerId || "";
  const serviceId = query.serviceId || "";
  const cursor = decodeCursor(query.cursor);
  const albumWhere: Prisma.AppointmentWhereInput = { deletedAt: null, status: "COMPLETED", photos: { some: { deletedAt: null } }, ...(customerId ? { customerId } : {}), ...(serviceId ? { OR: [{ actualServiceLines: { some: { serviceId } } }, { serviceLines: { some: { serviceId } } }, { serviceId }] } : {}) };
  const where: Prisma.AppointmentWhereInput = { ...albumWhere, ...(cursor ? { AND: [{ OR: [{ startAt: { lt: cursor.startAt } }, { startAt: cursor.startAt, id: { lt: cursor.id } }] }] } : {}) };

  const [results, allAlbumIds, customers, services] = await Promise.all([
    prisma.appointment.findMany({ where, take: PAGE_SIZE + 1, orderBy: [{ startAt: "desc" }, { id: "desc" }], include: { customer: true, actualServiceLines: { orderBy: { position: "asc" } }, photos: { where: { deletedAt: null }, take: 4, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }, _count: { select: { photos: { where: { deletedAt: null } } } } } }),
    prisma.appointment.findMany({ where: albumWhere, select: { id: true }, take: 10_000 }),
    prisma.customer.findMany({ where: { deletedAt: null, appointments: { some: { deletedAt: null, photos: { some: { deletedAt: null } } } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.service.findMany({ where: { deletedAt: null, OR: [{ actualAppointmentServices: { some: { appointment: { deletedAt: null, photos: { some: { deletedAt: null } } } } } }, { appointmentServices: { some: { appointment: { deletedAt: null, photos: { some: { deletedAt: null } } } } } }, { appointments: { some: { deletedAt: null, photos: { some: { deletedAt: null } } } } }] }, orderBy: [{ category: { position: "asc" } }, { name: "asc" }] }),
  ]);
  const hasMore = results.length > PAGE_SIZE;
  const albums = results.slice(0, PAGE_SIZE);
  const last = albums.at(-1);
  const nextParams = new URLSearchParams();
  if (customerId) nextParams.set("customerId", customerId);
  if (serviceId) nextParams.set("serviceId", serviceId);
  if (query.from === "settings") nextParams.set("from", "settings");
  if (hasMore && last) nextParams.set("cursor", encodeCursor(last));

  return <>
    <PageHeading backHref={query.from === "settings" ? "/settings" : undefined} title="Gallery" description="Each finalized visit is one album. Open an album to manage its photos." actions={<ViewModeToggle initialMode={view} page="gallery"/>}/>
    <details className="group panel mb-5 overflow-hidden">
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 [&::-webkit-details-marker]:hidden">
        <span className="icon-button pointer-events-none size-9"><Filter size={15}/></span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">Gallery filters</strong><span className="block truncate text-xs text-slate-400">{customerId || serviceId ? "Filters are active" : "All customers and services"}</span></span>
        <ChevronDown className="text-slate-400 transition group-open:rotate-180" size={18}/>
      </summary>
      <form className="grid gap-3 border-t border-white/10 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
        {query.from === "settings" && <input name="from" type="hidden" value="settings"/>}
        <div><label className="label" htmlFor="gallery-customer">Customer</label><select className="field" defaultValue={customerId} id="gallery-customer" name="customerId"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerName(customer)}</option>)}</select></div>
        <div><label className="label" htmlFor="gallery-service">Service</label><select className="field" defaultValue={serviceId} id="gallery-service" name="serviceId"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
        <div className="flex gap-2"><button aria-label="Apply gallery filters" className="icon-button" title="Apply filters"><Filter size={16}/></button>{(customerId || serviceId) && <Link aria-label="Clear gallery filters" className="icon-button" href={query.from === "settings" ? "/gallery?from=settings" : "/gallery"} title="Clear filters">×</Link>}</div>
      </form>
    </details>

    {albums.length ? <BulkSelection action={bulkMoveGalleryAlbumsToTrash} allIds={allAlbumIds.map((album) => album.id)} locale={locale}><div className={`gallery-surface ${view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" : "space-y-3"}`} data-swipe-lock>
      {albums.map((album) => { const serviceNames = album.actualServiceLines.length ? album.actualServiceLines.map((line) => line.serviceNameSnapshot) : [album.serviceNameSnapshot]; return <SelectableLink className={`group min-w-0 overflow-hidden rounded-2xl border border-white/9 bg-[#0d141e] p-0 shadow-[0_12px_35px_rgba(0,0,0,.18)] transition active:scale-[.985] hover:border-blue-400/25 ${view === "list" ? "grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)]" : "block"}`} href={`/gallery/${album.id}`} id={album.id} key={album.id} reserveSelectionSpace={false}>
        <div className={`relative flex overflow-hidden bg-slate-950 ${view === "grid" ? "aspect-[4/3]" : "min-h-28"}`}>
          {album.photos.map((photo, index) => <span className="flex min-w-0 flex-1 items-center justify-center overflow-hidden border-e border-black/30 last:border-0" key={photo.id}><img alt={`${customerName(album.customer)} visit photo ${index + 1}`} className="max-h-full max-w-full object-contain transition duration-500 group-hover:scale-[1.015]" src={`/api/media/${photo.id}/medium`}/></span>)}
          {album._count.photos > 4 && <span className="absolute bottom-2 end-2 rounded-full bg-black/75 px-2 py-1 text-[10px] font-semibold text-white">+{album._count.photos - 4}</span>}
        </div>
        <div className="min-w-0 p-3 sm:p-4"><p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-white"><UserRound className="shrink-0 text-blue-300" size={14}/><span className="truncate" dir="auto">{customerName(album.customer)}</span></p><p className="mt-2 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400" title={serviceNames.join(" · ")}><Scissors className="shrink-0 text-slate-500" size={13}/><span className="truncate" dir="auto">{serviceNames[0]}</span>{serviceNames.length > 1 && <span className="shrink-0 rounded-full bg-white/7 px-1.5 py-0.5">+{serviceNames.length - 1}</span>}</p><p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-600"><CalendarDays className="shrink-0" size={12}/><span className="truncate">{formatBusinessDate(album.startAt, locale, timezone)}</span></p></div>
      </SelectableLink>; })}
    </div></BulkSelection> : <section className="panel flex min-h-72 flex-col items-center justify-center px-5 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300"><Images size={25}/></span><h2 className="mt-4 font-semibold text-white">No visit albums yet</h2><Link className="button mt-5" href="/appointments"><Camera size={16}/>Appointments</Link></section>}
    {hasMore && <div className="mt-7 flex justify-center"><Link className="button-secondary" href={`/gallery?${nextParams.toString()}`}>Load older albums</Link></div>}
  </>;
}
