import { PageHeading } from "@/components/page-heading";
import { ServiceForm } from "@/components/service-form";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { createService } from "@/server/actions/services";
export default async function NewServicePage() { const user = await requireBusinessPermission("services.manage"); const categories = await prisma.studioCategory.findMany({ where: { businessId: user.businessId, active: true, deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] }); return <><PageHeading title="New service" description="Set defaults that can still be adjusted for each appointment."/><ServiceForm action={createService} categories={categories}/></>; }
