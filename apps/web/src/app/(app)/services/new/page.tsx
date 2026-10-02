import { PageHeading } from "@/components/page-heading";
import { redirect } from "next/navigation";
import { ServiceForm } from "@/components/service-form";
import { prisma } from "@/lib/prisma";
import { requireBusinessPermission } from "@/lib/auth";
import { createService } from "@/server/actions/services";
export default async function NewServicePage({ searchParams }: { searchParams: Promise<{ categoryId?: string }> }) { const [, query] = await Promise.all([requireBusinessPermission("services.manage"), searchParams]); const categories = await prisma.studioCategory.findMany({ where: { active: true, deletedAt: null }, orderBy: [{ position: "asc" }, { name: "asc" }] }); if (!categories.length) redirect("/services"); const initialCategoryId = categories.some((category) => category.id === query.categoryId) ? query.categoryId : undefined; return <><PageHeading backHref={initialCategoryId ? `/services?category=${initialCategoryId}` : "/services"} title="New service"/><ServiceForm action={createService} categories={categories} initialCategoryId={initialCategoryId}/></>; }
