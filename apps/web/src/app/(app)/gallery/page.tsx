import type { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { Camera, Filter, Images } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { formatBusinessDate } from "@/lib/time";

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
  const query = await searchParams;
  const customerId = query.customerId || "";
  const serviceId = query.serviceId || "";
  const cursor = decodeCursor(query.cursor);
  const where: Prisma.AppointmentPhotoWhereInput = {
    appointment: {
      status: "COMPLETED",
      ...(customerId ? { customerId } : {}),
      ...(serviceId ? { actualServiceLines: { some: { serviceId } } } : {}),
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
    prisma.customer.findMany({ where: { appointments: { some: { photos: { some: {} } } } }, orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    prisma.service.findMany({ where: { actualAppointmentServices: { some: { appointment: { photos: { some: {} } } } } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
  ]);
  const hasMore = results.length > PAGE_SIZE;
  const photos = results.slice(0, PAGE_SIZE);
  const nextPhoto = photos.at(-1);
  const nextParams = new URLSearchParams();
  if (customerId) nextParams.set("customerId", customerId);
  if (serviceId) nextParams.set("serviceId", serviceId);
  if (hasMore && nextPhoto) nextParams.set("cursor", encodeCursor(nextPhoto));

  return <>
    <PageHeading title="Gallery" description="Finalized work, organized automatically by customer and service."/>

    <form className="panel mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" method="get">
      <div><label className="label" htmlFor="gallery-customer">Customer</label><select className="field" defaultValue={customerId} id="gallery-customer" name="customerId"><option value="">All customers</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customerName(customer)}</option>)}</select></div>
      <div><label className="label" htmlFor="gallery-service">Service</label><select className="field" defaultValue={serviceId} id="gallery-service" name="serviceId"><option value="">All services</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></div>
      <div className="flex gap-2"><button className="button flex-1 sm:flex-none"><Filter size={16}/>Apply filters</button>{(customerId || serviceId) && <Link className="button-secondary" href="/gallery">Clear</Link>}</div>
    </form>

    {photos.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo) => {
        const appointment = photo.appointment;
        const services = appointment.actualServiceLines.map((line) => line.serviceNameSnapshot).join(" · ");
        return <Link className="group min-w-0 overflow-hidden rounded-2xl border border-white/9 bg-[#0d141e] shadow-[0_12px_35px_rgba(0,0,0,.18)] transition hover:-translate-y-0.5 hover:border-teal-300/25" href={`/appointments/${appointment.id}`} key={photo.id}>
          <div className="relative aspect-[4/3] overflow-hidden bg-slate-900"><Image alt={`${customerName(appointment.customer)} — ${services}`} className="object-cover transition duration-500 group-hover:scale-[1.035]" fill sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" src={`/media/${photo.thumbnailPath}`} unoptimized/><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent"/></div>
          <div className="p-3 sm:p-4"><p className="truncate text-sm font-semibold text-white" dir="auto">{customerName(appointment.customer)}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400" dir="auto">{services}</p><p className="mt-2 text-[11px] text-slate-600">{formatBusinessDate(appointment.startAt, "en")}</p></div>
        </Link>;
      })}
    </div> : <section className="panel flex min-h-72 flex-col items-center justify-center px-5 text-center"><span className="flex size-14 items-center justify-center rounded-2xl bg-teal-300/10 text-teal-300"><Images size={25}/></span><h2 className="mt-4 font-semibold text-white">No visit photos yet</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Photos uploaded while finalizing appointments—or added later from a finalized visit—will appear here.</p><Link className="button mt-5" href="/appointments"><Camera size={16}/>Open appointments</Link></section>}

    {hasMore && <div className="mt-7 flex justify-center"><Link className="button-secondary" href={`/gallery?${nextParams.toString()}`}>Load older photos</Link></div>}
  </>;
}
