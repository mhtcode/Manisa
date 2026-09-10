import { PageHeading } from "@/components/page-heading";
import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { createService } from "@/server/actions/services";
export default async function NewServicePage() { const user = await requireBusinessPermission("services.manage"); const categories = await prisma.studioCategory.findMany({ where: { active: true, deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] }); if (!categories.length) redirect("/services?section=categories"); return <><PageHeading title="New service" description="Choose its category, defaults, and appointment options."/><ServiceForm action={createService} categories={categories}/></>; }
