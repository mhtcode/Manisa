import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ImageIcon, Layers3, Scissors, Trash2, UserRound, WalletCards, type LucideIcon } from "lucide-react";
import { BulkSelection, SelectableItem } from "@/components/bulk-selection";
import { PageHeading } from "@/components/page-heading";
import { customerName } from "@/lib/format";
import { requireBusinessPermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { type TrashEntityType } from "@/lib/trash-lifecycle";
import { TrashCountdown } from "@/components/trash-countdown";
import { formatBusinessDate } from "@/lib/time";
import { bulkDeletePermanently, bulkRestoreFromTrash } from "@/server/actions/trash";

const filters = ["all", "customer", "appointment", "photo", "service", "category", "paymentMethod"] as const;
const filterLabels = { all: "All items", customer: "Customers", appointment: "Appointments", photo: "Photos", service: "Services", category: "Categories", paymentMethod: "Payment methods" } as const;
type TrashFilter = (typeof filters)[number];

function TrashRow({ children, deletedAt, icon: Icon, title, type, id, permanentBlocked, restoreBlocked }: {
  children: React.ReactNode;
  deletedAt: Date;
  icon: LucideIcon;
  title: string;
  type: TrashEntityType;
  id: string;
  permanentBlocked?: string;
  restoreBlocked?: string;
}) {
  return <SelectableItem id={`${type}:${id}`}><article className="grid gap-3 border-t border-white/8 px-4 py-4 first:border-t-0 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-5">
    <span className="flex size-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035] text-slate-400"><Icon size={18}/></span>
    <div className="min-w-0"><h3 className="truncate text-sm font-semibold text-white" dir="auto">{title}</h3><div className="mt-1 text-xs leading-5 text-slate-500">{children}</div><TrashCountdown deletedAt={deletedAt.toISOString()}/>{restoreBlocked && <p className="mt-1 text-[11px] text-amber-200/75">{restoreBlocked}</p>}{permanentBlocked && <p className="mt-1 text-[11px] text-rose-300/75">{permanentBlocked}</p>}</div>
  </article></SelectableItem>;
}

export default async function TrashPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const [query, user] = await Promise.all([searchParams, requireBusinessPermission("trash.manage")]);
  const selected: TrashFilter = filters.includes(query.type as TrashFilter) ? query.type as TrashFilter : "all";
  const [customers, appointments, photos, services, categories, paymentMethods] = await Promise.all([
    selected === "all" || selected === "customer" ? prisma.customer.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }) : [],
    selected === "all" || selected === "appointment" ? prisma.appointment.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, include: { customer: true, _count: { select: { photos: true } } }, orderBy: { deletedAt: "desc" } }) : [],
    selected === "all" || selected === "photo" ? prisma.mediaAsset.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, include: { appointment: { include: { customer: true } } }, orderBy: { deletedAt: "desc" } }) : [],
    selected === "all" || selected === "service" ? prisma.service.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, include: { category: true }, orderBy: { deletedAt: "desc" } }) : [],
    selected === "all" || selected === "category" ? prisma.studioCategory.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, include: { _count: { select: { services: true } } }, orderBy: { deletedAt: "desc" } }) : [],
    selected === "all" || selected === "paymentMethod" ? prisma.paymentMethod.findMany({ where: { businessId: user.businessId, deletedAt: { not: null } }, orderBy: { deletedAt: "desc" } }) : [],
  ]);
  const total = customers.length + appointments.length + photos.length + services.length + categories.length + paymentMethods.length;
  const allIds = [...customers.map((item) => `customer:${item.id}`), ...appointments.map((item) => `appointment:${item.id}`), ...photos.map((item) => `photo:${item.id}`), ...services.map((item) => `service:${item.id}`), ...categories.map((item) => `category:${item.id}`), ...paymentMethods.map((item) => `paymentMethod:${item.id}`)];

  return <>
    <PageHeading backHref="/settings" title="Trash" description="Restore items for seven days, or permanently delete them now. Expired photos are removed from disk."/>
    <nav aria-label="Trash filters" className="mb-4 flex gap-2 overflow-x-auto pb-1" data-horizontal-scroll>{filters.map((filter) => <Link className={`filter-chip shrink-0 ${selected === filter ? "active" : ""}`} href={filter === "all" ? "/settings/trash" : `/settings/trash?type=${filter}`} key={filter}>{filterLabels[filter]}</Link>)}</nav>
    <div className="mb-4 rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-4 py-3 text-sm text-amber-100">Items are permanently deleted 7 days after being moved to Trash.</div>
    <BulkSelection action={bulkRestoreFromTrash} allIds={allIds} locale={user.settings?.locale || "en"} primary="restore" secondaryAction={bulkDeletePermanently}><section className="panel overflow-hidden">
      <div className="panel-header"><h2 className="font-semibold text-white">Deleted items</h2><span className="badge border-amber-300/15 bg-amber-300/[0.06] text-amber-200">{total} {total === 1 ? "item" : "items"}</span></div>
      {!total && <div className="empty"><Trash2 className="mx-auto mb-3 text-slate-700" size={28}/>Trash is empty.</div>}
      {customers.map((customer) => <TrashRow deletedAt={customer.deletedAt!} icon={UserRound} id={customer.id} key={`customer-${customer.id}`} title={customerName(customer)} type="customer">Customer</TrashRow>)}
      {appointments.map((appointment) => <TrashRow deletedAt={appointment.deletedAt!} icon={CalendarClock} id={appointment.id} key={`appointment-${appointment.id}`} restoreBlocked={appointment.customer.deletedAt ? "Restore the customer first." : undefined} title={appointment.serviceNameSnapshot} type="appointment">{customerName(appointment.customer)} · {formatBusinessDate(appointment.startAt, "en")} · {appointment._count.photos} photos</TrashRow>)}
      {photos.map((photo) => <TrashRow deletedAt={photo.deletedAt!} icon={ImageIcon} id={photo.id} key={`photo-${photo.id}`} restoreBlocked={photo.appointment?.customer.deletedAt ? "Restore the customer and appointment first." : photo.appointment?.deletedAt ? "Restore the appointment first." : undefined} title={photo.originalName} type="photo"><span className="flex items-center gap-3">{photo.thumbnailPath ? <span className="relative block size-12 shrink-0 overflow-hidden rounded-lg bg-slate-900"><Image alt="" fill sizes="48px" src={`/media/${photo.thumbnailPath}`} unoptimized/></span> : null}<span>{photo.appointment ? `${customerName(photo.appointment.customer)} · ${formatBusinessDate(photo.appointment.startAt, "en")}` : "Customer avatar"} · {(photo.sizeBytes / 1024 / 1024).toFixed(1)} MB</span></span></TrashRow>)}
      {services.map((service) => <TrashRow deletedAt={service.deletedAt!} icon={Scissors} id={service.id} key={`service-${service.id}`} restoreBlocked={service.category.deletedAt ? "Restore the category first." : undefined} title={service.name} type="service">Service · {service.category.name}</TrashRow>)}
      {categories.map((category) => <TrashRow deletedAt={category.deletedAt!} icon={Layers3} id={category.id} key={`category-${category.id}`} permanentBlocked={category._count.services ? `Delete ${category._count.services} related ${category._count.services === 1 ? "service" : "services"} first.` : undefined} title={category.name} type="category">Service category · {category._count.services} related services</TrashRow>)}
      {paymentMethods.map((method) => <TrashRow deletedAt={method.deletedAt!} icon={WalletCards} id={method.id} key={`payment-${method.id}`} title={method.name} type="paymentMethod">Payment method</TrashRow>)}
    </section></BulkSelection>
  </>;
}
