"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePreparedPhotos } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { trashEntityTypes, type TrashEntityType } from "@/lib/trash-lifecycle";
import { requireBusinessPermission } from "@/lib/auth";
import { removeObject } from "@/lib/object-storage";

type MediaFiles = { id: string; imagePath: string | null; thumbnailPath: string | null; objectKey: string | null; featuredAt: Date | null; businessId: string; variants: Array<{ objectKey: string; sizeBytes: number }> };

async function removeMediaFiles(files: MediaFiles[]) {
  await removePreparedPhotos(files);
  const privateKeys = new Set(files.flatMap((file) => [file.objectKey, ...file.variants.map((variant) => variant.objectKey)]).filter((key): key is string => Boolean(key)));
  const publicKeys = files.filter((file) => file.featuredAt).map((file) => `${file.businessId}/featured/${file.id}.webp`);
  await Promise.allSettled([...privateKeys].map((key) => removeObject(key)));
  await Promise.allSettled(publicKeys.map((key) => removeObject(key, true)));
}

function validType(value: string): asserts value is TrashEntityType {
  if (!trashEntityTypes.includes(value as TrashEntityType)) throw new Error("Unsupported trash item.");
}

function selectedTrashItems(formData: FormData) {
  const raw = JSON.parse(String(formData.get("ids") || "[]"));
  if (!Array.isArray(raw) || !raw.length || raw.length > 10_000) throw new Error("Invalid selection.");
  return raw.map((token) => { const [type, id] = String(token).split(":", 2); validType(type); if (!id) throw new Error("Invalid selection."); return { type, id }; });
}

function refreshTrashViews() {
  revalidatePath("/");
  revalidatePath("/report");
  revalidatePath("/calendar");
  revalidatePath("/appointments");
  revalidatePath("/customers");
  revalidatePath("/services");
  revalidatePath("/gallery");
  revalidatePath("/settings");
  revalidatePath("/settings/trash");
  revalidatePath("/settings/financial");
}

function destination(type: TrashEntityType) {
  return type === "customer" ? "/customers" : type === "appointment" ? "/appointments" : type === "photo" ? "/gallery" : type === "service" ? "/services" : type === "paymentMethod" ? "/settings/financial" : "/settings/categories";
}

async function assertTenantEntities(businessId: string, items: Array<{ type: TrashEntityType; id: string }>) {
  const groups = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  const [customers, appointments, photos, services, categories, methods] = await Promise.all([
    prisma.customer.count({ where: { businessId, id: { in: groups("customer") } } }),
    prisma.appointment.count({ where: { businessId, id: { in: groups("appointment") } } }),
    prisma.mediaAsset.count({ where: { businessId, id: { in: groups("photo") } } }),
    prisma.service.count({ where: { businessId, id: { in: groups("service") } } }),
    prisma.studioCategory.count({ where: { businessId, id: { in: groups("category") } } }),
    prisma.paymentMethod.count({ where: { businessId, id: { in: groups("paymentMethod") } } }),
  ]);
  if (customers + appointments + photos + services + categories + methods !== items.length) throw new Error("One or more selected items are outside this workspace.");
}

export async function moveToTrash(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertTenantEntities(user.businessId, [{ type: typeValue, id }]);
  const deletedAt = new Date();

  if (typeValue === "customer") {
    await prisma.$transaction([
      prisma.customer.update({ where: { id, deletedAt: null }, data: { deletedAt } }),
      prisma.appointment.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt } }),
      prisma.mediaAsset.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt } }),
    ]);
  } else if (typeValue === "appointment") {
    await prisma.appointment.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "photo") {
    await prisma.mediaAsset.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "service") {
    await prisma.service.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "category") {
    const remainingServices = await prisma.service.count({ where: { categoryId: id, deletedAt: null } });
    if (remainingServices) throw new Error("Move every service in this category to Trash before deleting the category.");
    await prisma.studioCategory.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else {
    await prisma.paymentMethod.update({ where: { id, deletedAt: null }, data: { deletedAt, active: false } });
  }

  refreshTrashViews();
  redirect(destination(typeValue));
}

export async function bulkMoveToTrash(typeValue: string, formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  const raw = JSON.parse(String(formData.get("ids") || "[]"));
  if (!Array.isArray(raw) || !raw.length || raw.length > 10_000 || raw.some((id) => typeof id !== "string")) throw new Error("Invalid selection.");
  const ids = [...new Set(raw as string[])];
  await assertTenantEntities(user.businessId, ids.map((id) => ({ type: typeValue, id })));
  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    if (typeValue === "category") {
      const blocked = await tx.service.count({ where: { categoryId: { in: ids }, deletedAt: null } });
      if (blocked) throw new Error("Every selected category must be empty before it can be moved to Trash.");
      const result = await tx.studioCategory.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    } else if (typeValue === "customer") {
      const found = await tx.customer.count({ where: { id: { in: ids }, deletedAt: null } });
      if (found !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
      await tx.appointment.updateMany({ where: { customerId: { in: ids }, deletedAt: null }, data: { deletedAt } });
      await tx.mediaAsset.updateMany({ where: { customerId: { in: ids }, deletedAt: null }, data: { deletedAt } });
      await tx.customer.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
    } else if (typeValue === "paymentMethod") {
      const result = await tx.paymentMethod.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt, active: false } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    } else {
      const model = typeValue === "appointment" ? tx.appointment : typeValue === "photo" ? tx.mediaAsset : tx.service;
      const result = await (model as typeof tx.service).updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    }
  });
  refreshTrashViews();
}

export async function bulkMoveGalleryAlbumsToTrash(formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  const raw = JSON.parse(String(formData.get("ids") || "[]"));
  if (!Array.isArray(raw) || !raw.length || raw.length > 10_000 || raw.some((id) => typeof id !== "string")) throw new Error("Invalid selection.");
  const appointmentIds = [...new Set(raw as string[])];
  const deletedAt = new Date();
  const featured = await prisma.mediaAsset.findMany({ where: { businessId: user.businessId, appointmentId: { in: appointmentIds }, deletedAt: null, featuredAt: { not: null } }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    const albums = await tx.appointment.findMany({ where: { businessId: user.businessId, id: { in: appointmentIds }, deletedAt: null, photos: { some: { deletedAt: null } } }, select: { id: true } });
    if (albums.length !== appointmentIds.length) throw new Error("The album selection changed. Nothing was deleted.");
    await tx.mediaAsset.updateMany({ where: { businessId: user.businessId, appointmentId: { in: appointmentIds }, deletedAt: null }, data: { deletedAt, featuredAt: null } });
  });
  await Promise.allSettled(featured.map((photo) => removeObject(`${user.businessId}/featured/${photo.id}.webp`, true)));
  refreshTrashViews();
}

export async function restoreFromTrash(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertTenantEntities(user.businessId, [{ type: typeValue, id }]);

  if (typeValue === "customer") {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!customer?.deletedAt) throw new Error("This customer is no longer in Trash.");
    await prisma.$transaction([
      prisma.customer.update({ where: { id }, data: { deletedAt: null } }),
      prisma.appointment.updateMany({ where: { customerId: id, deletedAt: customer.deletedAt }, data: { deletedAt: null } }),
    ]);
  } else if (typeValue === "appointment") {
    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { customer: { select: { deletedAt: true } } } });
    if (!appointment || appointment.customer.deletedAt) throw new Error("Restore the customer before restoring this appointment.");
    await prisma.appointment.update({ where: { id }, data: { deletedAt: null } });
  } else if (typeValue === "photo") {
    const photo = await prisma.mediaAsset.findUnique({ where: { id }, select: { appointment: { select: { deletedAt: true, customer: { select: { deletedAt: true } } } } } });
    if (!photo?.appointment || photo.appointment.deletedAt || photo.appointment.customer.deletedAt) throw new Error("Restore the appointment and customer before restoring this photo.");
    await prisma.mediaAsset.update({ where: { id }, data: { deletedAt: null } });
  } else if (typeValue === "service") {
    const service = await prisma.service.findUnique({ where: { id }, select: { category: { select: { deletedAt: true } } } });
    if (!service || service.category.deletedAt) throw new Error("Restore the service category first.");
    await prisma.service.update({ where: { id }, data: { deletedAt: null } });
  } else if (typeValue === "category") {
    await prisma.studioCategory.update({ where: { id }, data: { deletedAt: null } });
  } else {
    await prisma.paymentMethod.update({ where: { id }, data: { deletedAt: null } });
  }

  refreshTrashViews();
  redirect("/settings/trash");
}

export async function deletePermanently(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertTenantEntities(user.businessId, [{ type: typeValue, id }]);
  const files: MediaFiles[] = [];

  if (typeValue === "photo") {
    const photo = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, deletedAt: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, businessId: true, variants: { select: { objectKey: true, sizeBytes: true } } } });
    if (!photo?.deletedAt) throw new Error("Only photos in Trash can be permanently deleted.");
    await prisma.mediaAsset.delete({ where: { id } });
    files.push(photo);
  } else if (typeValue === "appointment") {
    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { deletedAt: true, photos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, businessId: true, variants: { select: { objectKey: true, sizeBytes: true } } } } } });
    if (!appointment?.deletedAt) throw new Error("Only appointments in Trash can be permanently deleted.");
    await prisma.appointment.delete({ where: { id } });
    files.push(...appointment.photos);
  } else if (typeValue === "customer") {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { deletedAt: true, profilePhotos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, businessId: true, variants: { select: { objectKey: true, sizeBytes: true } } } }, appointments: { select: { photos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, businessId: true, variants: { select: { objectKey: true, sizeBytes: true } } } } } } } });
    if (!customer?.deletedAt) throw new Error("Only customers in Trash can be permanently deleted.");
    await prisma.$transaction([prisma.appointment.deleteMany({ where: { customerId: id } }), prisma.customer.delete({ where: { id } })]);
    files.push(...customer.profilePhotos, ...customer.appointments.flatMap((appointment) => appointment.photos));
  } else if (typeValue === "service") {
    const service = await prisma.service.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!service?.deletedAt) throw new Error("Only services in Trash can be permanently deleted.");
    await prisma.service.delete({ where: { id } });
  } else if (typeValue === "category") {
    const category = await prisma.studioCategory.findUnique({ where: { id }, select: { deletedAt: true, _count: { select: { services: true } } } });
    if (!category?.deletedAt) throw new Error("Only categories in Trash can be permanently deleted.");
    if (category._count.services) throw new Error("Permanently delete the category’s services first.");
    await prisma.studioCategory.delete({ where: { id } });
  } else {
    const method = await prisma.paymentMethod.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!method?.deletedAt) throw new Error("Only payment methods in Trash can be permanently deleted.");
    await prisma.paymentMethod.delete({ where: { id } });
  }

  const released = files.reduce((sum, file) => sum + file.variants.reduce((variantSum, variant) => variantSum + variant.sizeBytes, 0), 0);
  if (released) await prisma.business.update({ where: { id: user.businessId }, data: { storageUsedBytes: { decrement: BigInt(released) } } });
  await removeMediaFiles(files);
  refreshTrashViews();
  redirect("/settings/trash");
}

export async function bulkRestoreFromTrash(formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  const items = selectedTrashItems(formData);
  await assertTenantEntities(user.businessId, items);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  await prisma.$transaction(async (tx) => {
    const categoryIds = ids("category"); const customerIds = ids("customer");
    if (categoryIds.length) { const result = await tx.studioCategory.updateMany({ where: { id: { in: categoryIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== categoryIds.length) throw new Error("The selection changed. Nothing was restored."); }
    const methodIds = ids("paymentMethod"); if (methodIds.length) { const result = await tx.paymentMethod.updateMany({ where: { id: { in: methodIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== methodIds.length) throw new Error("The selection changed. Nothing was restored."); }
    const serviceIds = ids("service");
    if (serviceIds.length) { const blocked = await tx.service.count({ where: { id: { in: serviceIds }, category: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected categories before their services."); const result = await tx.service.updateMany({ where: { id: { in: serviceIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== serviceIds.length) throw new Error("The selection changed. Nothing was restored."); }
    if (customerIds.length) {
      const customers = await tx.customer.findMany({ where: { id: { in: customerIds }, deletedAt: { not: null } }, select: { id: true, deletedAt: true } });
      if (customers.length !== customerIds.length) throw new Error("The selection changed. Nothing was restored.");
      for (const customer of customers) {
        await tx.customer.update({ where: { id: customer.id }, data: { deletedAt: null } });
        await tx.appointment.updateMany({ where: { customerId: customer.id, deletedAt: customer.deletedAt }, data: { deletedAt: null } });
      }
    }
    const appointmentIds = ids("appointment");
    if (appointmentIds.length) { const blocked = await tx.appointment.count({ where: { id: { in: appointmentIds }, customer: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected customers before their appointments."); const result = await tx.appointment.updateMany({ where: { id: { in: appointmentIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== appointmentIds.length) throw new Error("The selection changed. Nothing was restored."); }
    const photoIds = ids("photo");
    if (photoIds.length) { const blocked = await tx.mediaAsset.count({ where: { id: { in: photoIds }, OR: [{ appointment: { deletedAt: { not: null } } }, { appointment: { customer: { deletedAt: { not: null } } } }] } }); if (blocked) throw new Error("Restore selected customers and appointments before their photos."); const result = await tx.mediaAsset.updateMany({ where: { id: { in: photoIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== photoIds.length) throw new Error("The selection changed. Nothing was restored."); }
  });
  refreshTrashViews();
}

export async function bulkDeletePermanently(formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  const items = selectedTrashItems(formData);
  await assertTenantEntities(user.businessId, items);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  const customerIds = ids("customer"); const appointmentIds = ids("appointment"); const photoIds = ids("photo");
  const fileOwners = await prisma.mediaAsset.findMany({ where: { businessId: user.businessId, OR: [{ id: { in: photoIds } }, { appointmentId: { in: appointmentIds } }, { customerId: { in: customerIds } }, { appointment: { customerId: { in: customerIds } } }] }, select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, businessId: true, variants: { select: { objectKey: true, sizeBytes: true } } } });
  await prisma.$transaction(async (tx) => {
    const all = await Promise.all(items.map((item) => item.type === "customer" ? tx.customer.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "appointment" ? tx.appointment.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "photo" ? tx.mediaAsset.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "service" ? tx.service.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "category" ? tx.studioCategory.count({ where: { id: item.id, deletedAt: { not: null } } }) : tx.paymentMethod.count({ where: { id: item.id, deletedAt: { not: null } } })));
    if (all.some((count) => count !== 1)) throw new Error("The selection changed. Nothing was deleted.");
    const categoryIds = ids("category"); const serviceIds = ids("service");
    if (categoryIds.length) { const blocked = await tx.service.count({ where: { categoryId: { in: categoryIds }, id: { notIn: serviceIds } } }); if (blocked) throw new Error("Select every related service before deleting its category."); }
    if (photoIds.length) await tx.mediaAsset.deleteMany({ where: { id: { in: photoIds } } });
    if (appointmentIds.length) await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    if (customerIds.length) { await tx.appointment.deleteMany({ where: { customerId: { in: customerIds } } }); await tx.customer.deleteMany({ where: { id: { in: customerIds } } }); }
    if (serviceIds.length) await tx.service.deleteMany({ where: { id: { in: serviceIds } } });
    if (categoryIds.length) await tx.studioCategory.deleteMany({ where: { id: { in: categoryIds } } });
    const methodIds = ids("paymentMethod"); if (methodIds.length) await tx.paymentMethod.deleteMany({ where: { id: { in: methodIds } } });
    const released = fileOwners.reduce((sum, file) => sum + file.variants.reduce((variantSum, variant) => variantSum + variant.sizeBytes, 0), 0);
    if (released) await tx.business.update({ where: { id: user.businessId }, data: { storageUsedBytes: { decrement: BigInt(released) } } });
  }, { timeout: 60_000 });
  await removeMediaFiles(fileOwners);
  refreshTrashViews();
}
