import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Images, Scissors, Star, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { BulkSelection, SelectableItem } from "@/components/bulk-selection";
import { PageHeading } from "@/components/page-heading";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { setAppointmentPhotoFeatured } from "@/server/actions/appointments";
import { bulkMoveToTrash } from "@/server/actions/trash";

const PAGE_SIZE = 30;
function decodeCursor(value?: string) { if (!value) return null; try { const [createdAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8")); const date = new Date(createdAt); return typeof id === "string" && !Number.isNaN(date.getTime()) ? { createdAt: date, id } : null; } catch { return null; } }
function encodeCursor(photo: { createdAt: Date; id: string }) { return Buffer.from(JSON.stringify([photo.createdAt.toISOString(), photo.id])).toString("base64url"); }

export default async function GalleryAlbumPage({ params, searchParams }: { params: Promise<{ appointmentId: string }>; searchParams: Promise<{ cursor?: string }> }) {
  const [{ appointmentId }, query, user] = await Promise.all([params, searchParams, requireBusinessPermission("gallery.view")]);
  const cursor = decodeCursor(query.cursor);
  const [appointment, allPhotoIds] = await Promise.all([prisma.appointment.findFirst({ where: { id: appointmentId, businessId: user.businessId, deletedAt: null, status: "COMPLETED" }, include: { customer: true, actualServiceLines: { orderBy: { position: "asc" } }, photos: { where: { deletedAt: null, ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}) }, take: PAGE_SIZE + 1, orderBy: [{ createdAt: "desc" }, { id: "desc" }] } } }), prisma.mediaAsset.findMany({ where: { appointmentId, businessId: user.businessId, deletedAt: null }, select: { id: true } })]);
  if (!appointment) notFound();
  const photos = appointment.photos.slice(0, PAGE_SIZE);
  const hasMore = appointment.photos.length > PAGE_SIZE;
  const last = photos.at(-1);
  const services = appointment.actualServiceLines.length ? appointment.actualServiceLines.map((line) => line.serviceNameSnapshot) : [appointment.serviceNameSnapshot];
  const locale = user.settings?.locale || "en";
  const timezone = user.settings?.timezone || "America/Toronto";
  return <>
    <PageHeading title={customerName(appointment.customer)} description="Photos from one finalized visit." actions={<Link className="button-secondary" href="/gallery"><ArrowLeft size={16}/>Gallery</Link>}/>
    <section className="mb-4 flex min-w-0 flex-wrap gap-x-4 gap-y-2 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3 text-xs text-slate-400"><span className="flex min-w-0 items-center gap-1.5"><UserRound className="shrink-0 text-blue-300" size={14}/><span className="truncate" dir="auto">{customerName(appointment.customer)}</span></span><span className="flex min-w-0 max-w-full items-center gap-1.5"><Scissors className="shrink-0 text-blue-300" size={14}/><span className="truncate" dir="auto">{services.join(" · ")}</span></span><span className="flex items-center gap-1.5"><CalendarDays className="shrink-0 text-blue-300" size={14}/>{formatBusinessDate(appointment.startAt, locale, timezone)}</span></section>
    {photos.length ? <BulkSelection action={bulkMoveToTrash.bind(null, "photo")} allIds={allPhotoIds.map((photo) => photo.id)} locale={locale}><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-swipe-lock>{photos.map((photo) => <SelectableItem id={photo.id} key={photo.id}><article className="group min-w-0 overflow-hidden rounded-2xl border border-white/9 bg-[#0d141e]"><div className="relative aspect-[4/3] overflow-hidden bg-slate-900"><Image alt="" className="object-cover transition duration-500 group-hover:scale-[1.025]" fill sizes="(max-width:640px) 50vw, (max-width:1280px) 33vw, 25vw" src={`/media/${photo.thumbnailPath}`} unoptimized/>{photo.featuredAt && <span aria-label="Featured on website" className="absolute start-2 top-2 flex size-7 items-center justify-center rounded-full bg-[#102347]/90 text-blue-200" title="Featured on website"><Star fill="currentColor" size={13}/></span>}</div><div className="flex items-center justify-between gap-2 p-2.5"><span className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-600"><Images className="shrink-0" size={12}/><span className="truncate">{photo.width}×{photo.height}</span></span><form action={setAppointmentPhotoFeatured.bind(null, photo.id, !photo.featuredAt)}><button aria-label={photo.featuredAt ? "Remove from website" : "Feature on website"} className="icon-button size-8" title={photo.featuredAt ? "Remove from website" : "Feature on website"}><Star fill={photo.featuredAt ? "currentColor" : "none"} size={14}/></button></form></div></article></SelectableItem>)}</div></BulkSelection> : <section className="empty">This album has no active photos.</section>}
    {hasMore && last && <div className="mt-7 flex justify-center"><Link className="button-secondary" href={`/gallery/${appointmentId}?cursor=${encodeCursor(last)}`}>Load older photos</Link></div>}
  </>;
}
