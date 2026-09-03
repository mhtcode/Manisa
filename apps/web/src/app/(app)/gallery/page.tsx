import type { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Camera, Filter, Images, Star, Trash2 } from "lucide-react";
import { ConfirmActionForm } from "@/components/confirm-action-form";
import { PageHeading } from "@/components/page-heading";
import { ViewModeToggle } from "@/components/view-mode-toggle";
import { requireUser } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { collectionView } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";
import { setAppointmentPhotoFeatured } from "@/server/actions/appointments";
import { moveToTrash } from "@/server/actions/trash";

const PAGE_SIZE = 24;

function decodeCursor(value?: string) {
  if (!value) return null;
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const date = new Date(createdAt);
    return typeof id === "string" && !Number.isNaN(date.getTime()) ? { createdAt: date, id } : null;
  } catch { return null; }
}

function encodeCursor(photo: { createdAt: Date; id: string }) {
  return Buffer.from(JSON.stringify([photo.createdAt.toISOString(), photo.id])).toString("base64url");
}

export default async function GalleryPage({ searchParams }: { searchParams: Promise<{ customerId?: string; serviceId?: string; cursor?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireUser()]);
  const view = collectionView(user.settings?.collectionViews, "gallery", "grid");
  const customerId = query.customerId || "";
  const serviceId = query.serviceId || "";
  const cursor = decodeCursor(query.cursor);
  const where: Prisma.AppointmentPhotoWhereInput = {
    deletedAt: null,
    appointment: {
      deletedAt: null,
      status: "COMPLETED",
      ...(customerId ? { customerId } : {}),
      ...(serviceId ? { OR: [{ actualServiceLines: { some: { serviceId } } }, { serviceLines: { some: { serviceId } } }, { serviceId }] } : {}),
    },
    ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}),
  };

  const [results, customers, services] = await Promise.all([
    prisma.appointmentPhoto.findMany({
      where,
      take: PAGE_SIZE + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: { appointment: { include: { customer: true, actualServiceLines: { orderBy: { position: "asc" } } } } },
    }),
    prisma.customer.findMany({ where: { deletedAt: null, appointments: { some: { deletedAt: null, photos: { some: { deletedAt: null } } } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.service.findMany({ where: { deletedAt: null, OR: [{ actualAppointmentServices: { some: { appointment: { deletedAt: null, photos: { some: { deletedAt: null } } } } } }, { appointmentServices: { some: { appointment: { deletedAt: null, photos: { some: { deletedAt: null } } } } } }, { appointments: { some: { deletedAt: null, photos: { some: { deletedAt: null } } } } }] }, orderBy: [{ category: { position: "asc" } }, { name: "asc" }] }),
  ]);
  const hasMore = results.length > PAGE_SIZE;
  const photos = results.slice(0, PAGE_SIZE);
  const nextPhoto = photos.at(-1);
  const nextParams = new URLSearchParams();
  if (customerId) nextParams.set("customerId", customerId);
  if (serviceId) nextParams.set("serviceId", serviceId);
  if (hasMore && nextPhoto) nextParams.set("cursor", encodeCursor(nextPhoto));

  return <>
    <PageHeading title="Gallery" description="Finalized work, organized automatically by customer and service." actions={<ViewModeToggle initialMode={view} page="gallery"/>}/>

    <form className="panel mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
      <div><label className="label" htmlFor="gallery-customer">Customer</label><select className="field" defaultValue={customerId} id="gallery-customer" name="customerId"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerName(customer)}</option>)}</select></div>
      <div><label className="label" htmlFor="gallery-service">Service</label><select className="field" defaultValue={serviceId} id="gallery-service" name="serviceId"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
      <div className="flex gap-2"><button className="button flex-1 sm:flex-none"><Filter size={16}/>Apply filters</button>{(customerId || serviceId) && <Link className="button-secondary" href="/gallery">Clear</Link>}</div>
    </form>

    {photos.length ? <div className={`gallery-surface ${view === "grid" ? "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" : "space-y-3"}`} data-swipe-lock>
      {photos.map((photo) => {
        const appointment = photo.appointment;
        const services = appointment.actualServiceLines.length ? appointment.actualServiceLines.map((line) => line.serviceNameSnapshot).join(" · ") : appointment.serviceNameSnapshot;
        return <article className={`group min-w-0 overflow-hidden rounded-2xl border border-white/9 bg-[#0d141e] shadow-[0_12px_35px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:border-blue-400/25 ${view === "list" ? "grid grid-cols-[7.5rem_minmax(0,1fr)] sm:grid-cols-[10rem_minmax(0,1fr)]" : ""}`} key={photo.id}>
          <Link aria-hidden="true" className={`relative block overflow-hidden bg-slate-900 ${view === "grid" ? "aspect-[4/3]" : "min-h-28"}`} href={`/appointments/${appointment.id}`} tabIndex={-1}><Image alt="" className="object-cover transition duration-500 group-hover:scale-[1.035]" fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" src={`/media/${photo.thumbnailPath}`} unoptimized/><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent"/>{photo.featuredAt && <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-blue-300/20 bg-[#101d35]/90 px-2 py-1 text-[10px] font-semibold text-blue-100"><Star fill="currentColor" size={10}/>Featured</span>}</Link>
          <div className="p-3 sm:p-4"><Link href={`/appointments/${appointment.id}`}><p className="truncate text-sm font-semibold text-white" dir="auto">{customerName(appointment.customer)}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400" dir="auto">{services}</p><p className="mt-2 text-[11px] text-slate-600">{formatBusinessDate(appointment.startAt, "en")}</p></Link><div className="mt-3 grid gap-2"><form action={setAppointmentPhotoFeatured.bind(null, photo.id, !photo.featuredAt)}><button className="button-secondary min-h-8 w-full px-2.5 py-1.5 text-xs" type="submit"><Star fill={photo.featuredAt ? "currentColor" : "none"} size={13}/>{photo.featuredAt ? "Remove from website" : "Feature on website"}</button></form><ConfirmActionForm action={moveToTrash.bind(null, "photo", photo.id)} className="button-danger min-h-8 w-full px-2.5 py-1.5 text-xs" message={`Move ${photo.originalName} to Trash? It will be permanently deleted from disk after seven days unless restored.`}><Trash2 size={13}/>Move to Trash</ConfirmActionForm></div></div>
        </article>;
      })}
    </div> : <section className="panel flex min-h-72 flex-col items-center justify-center px-5 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-300"><Images size={25}/></span><h2 className="mt-4 font-semibold text-white">No visit photos yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Photos uploaded while finalizing appointments—or added later from a finalized visit—will appear here.</p><Link className="button mt-5" href="/appointments"><Camera size={16}/>Open appointments</Link></section>}

    {hasMore && <div className="mt-7 flex justify-center"><Link className="button-secondary" href={`/gallery?${nextParams.toString()}`}>Load older photos</Link></div>}
  </>;
}
