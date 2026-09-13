import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { SocialImageComposer } from "@/components/social-image-composer";
import { requireBusinessPermission } from "@/lib/auth";
import { customerName } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function SocialImageStudioPage({ params }: { params: Promise<{ appointmentId: string }> }) {
  const [{ appointmentId }] = await Promise.all([params, requireBusinessPermission("gallery.manage")]);
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, deletedAt: null, status: "COMPLETED" },
    select: {
      customer: { select: { firstName: true, lastName: true, displayName: true } },
      photos: { where: { deletedAt: null, status: "READY", mediaType: "IMAGE" }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 60, select: { id: true, comparisonTag: true } },
    },
  });
  if (!appointment || appointment.photos.length < 2) notFound();
  return <>
    <PageHeading backHref={`/gallery/${appointmentId}`} backLabel="Back to album" title={`Social image studio · ${customerName(appointment.customer)}`}/>
    <SocialImageComposer photos={appointment.photos.map((photo) => ({ id: photo.id, comparisonTag: photo.comparisonTag, url: `/api/media/${photo.id}/medium` }))}/>
  </>;
}
