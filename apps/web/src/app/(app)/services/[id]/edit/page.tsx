import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { ServiceForm } from "@/components/service-form";
import { prisma } from "@/lib/prisma";
import { updateService } from "@/server/actions/services";
export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const [service, categories] = await Promise.all([prisma.service.findUnique({ where: { id, deletedAt: null } }), prisma.studioCategory.findMany({ where: { deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] })]); if (!service) notFound(); return <><PageHeading title="Edit service" description="Changes affect future defaults; appointment history keeps its original values."/><ServiceForm action={updateService.bind(null,id)} categories={categories} service={service}/></>; }
