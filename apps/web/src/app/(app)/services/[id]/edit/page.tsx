import { notFound } from "next/navigation";
import { PageHeading } from "@/components/page-heading";
import { ServiceForm } from "@/components/service-form";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { updateService } from "@/server/actions/services";
export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const user = await requireBusinessPermission("services.manage"); const [service, categories] = await Promise.all([prisma.service.findUnique({ where: { id, businessId: user.businessId, deletedAt: null } }), prisma.studioCategory.findMany({ where: { businessId: user.businessId, deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] })]); if (!service) notFound(); return <><PageHeading title="Edit service" description="Changes affect future defaults; appointment history keeps its original values."/><ServiceForm action={updateService.bind(null,id)} categories={categories} service={service}/></>; }
