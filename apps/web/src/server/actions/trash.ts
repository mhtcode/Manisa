"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePreparedPhotos } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { deletedInSameTrashOperation, trashEntityTypes, type TrashEntityType } from "@/lib/trash-lifecycle";
import { requireBusinessPermission } from "@/lib/auth";
import { removeObject } from "@/lib/object-storage";
import { enqueueGoogleCalendarSync } from "@/server/google-calendar";

type MediaFiles = { id: string; imagePath: string | null; thumbnailPath: string | null; objectKey: string | null; featuredAt: Date | null; variants: Array<{ objectKey: string; sizeBytes: number }> };

async function removeMediaFiles(files: MediaFiles[]) {
  await removePreparedPhotos(files);
  const privateKeys = new Set(files.flatMap((file) => [file.objectKey, ...file.variants.map((variant) => variant.objectKey)]).filter((key): key is string => Boolean(key)));
  const publicKeys = files.filter((file) => file.featuredAt).map((file) => `studio/featured/${file.id}.webp`);
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
  return type === "customer" ? "/customers" : type === "appointment" ? "/appointments" : type === "photo" ? "/gallery" : type === "service" || type === "category" ? "/services" : type === "paymentMethod" ? "/settings/financial" : "/settings";
}

async function assertEntities(items: Array<{ type: TrashEntityType; id: string }>) {
  const groups = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  const [customers, appointments, photos, services, categories, methods] = await Promise.all([
    prisma.customer.count({ where: { id: { in: groups("customer") } } }),
    prisma.appointment.count({ where: { id: { in: groups("appointment") } } }),
    prisma.mediaAsset.count({ where: { id: { in: groups("photo") } } }),
    prisma.service.count({ where: { id: { in: groups("service") } } }),
    prisma.studioCategory.count({ where: { id: { in: groups("category") } } }),
    prisma.paymentMethod.count({ where: { id: { in: groups("paymentMethod") } } }),
  ]);
  if (customers + appointments + photos + services + categories + methods !== items.length) throw new Error("One or more selected items are unavailable in this studio.");
}

export async function moveToTrash(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertEntities([{ type: typeValue, id }]);
  const deletedAt = new Date();

  if (typeValue === "customer") {
    await prisma.$transaction(async (tx) => {
      const appointments = await tx.appointment.findMany({ where: { customerId: id, deletedAt: null }, select: { id: true } });
      await tx.customer.update({ where: { id, deletedAt: null }, data: { deletedAt } });
      await tx.appointment.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt } });
      await tx.mediaAsset.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt } });
      await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "DELETE");
    });
  } else if (typeValue === "appointment") {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id, deletedAt: null }, data: { deletedAt } });
      await enqueueGoogleCalendarSync(tx, [id], "DELETE");
    });
  } else if (typeValue === "photo") {
    await prisma.mediaAsset.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "service") {
    await prisma.service.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "category") {
    await prisma.$transaction(async (tx) => {
      await tx.studioCategory.update({ where: { id, deletedAt: null }, data: { deletedAt } });
      await tx.service.updateMany({ where: { categoryId: id, deletedAt: null }, data: { deletedAt } });
    });
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
  await assertEntities(ids.map((id) => ({ type: typeValue, id })));
  const deletedAt = new Date();
  await prisma.$transaction(async (tx) => {
    if (typeValue === "category") {
      const result = await tx.studioCategory.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
      await tx.service.updateMany({ where: { categoryId: { in: ids }, deletedAt: null }, data: { deletedAt } });
    } else if (typeValue === "customer") {
      const found = await tx.customer.count({ where: { id: { in: ids }, deletedAt: null } });
      if (found !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
      const appointments = await tx.appointment.findMany({ where: { customerId: { in: ids }, deletedAt: null }, select: { id: true } });
      await tx.appointment.updateMany({ where: { customerId: { in: ids }, deletedAt: null }, data: { deletedAt } });
      await tx.mediaAsset.updateMany({ where: { customerId: { in: ids }, deletedAt: null }, data: { deletedAt } });
      await tx.customer.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "DELETE");
    } else if (typeValue === "paymentMethod") {
      const result = await tx.paymentMethod.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt, active: false } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    } else {
      const model = typeValue === "appointment" ? tx.appointment : typeValue === "photo" ? tx.mediaAsset : tx.service;
      const result = await (model as typeof tx.service).updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
      if (typeValue === "appointment") await enqueueGoogleCalendarSync(tx, ids, "DELETE");
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
  const featured = await prisma.mediaAsset.findMany({ where: { appointmentId: { in: appointmentIds }, deletedAt: null, featuredAt: { not: null } }, select: { id: true } });
  await prisma.$transaction(async (tx) => {
    const albums = await tx.appointment.findMany({ where: { id: { in: appointmentIds }, deletedAt: null, photos: { some: { deletedAt: null } } }, select: { id: true } });
    if (albums.length !== appointmentIds.length) throw new Error("The album selection changed. Nothing was deleted.");
    await tx.mediaAsset.updateMany({ where: { appointmentId: { in: appointmentIds }, deletedAt: null }, data: { deletedAt, featuredAt: null } });
  });
  await Promise.allSettled(featured.map((photo) => removeObject(`studio/featured/${photo.id}.webp`, true)));
  refreshTrashViews();
}

export async function restoreFromTrash(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertEntities([{ type: typeValue, id }]);

  if (typeValue === "customer") {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!customer?.deletedAt) throw new Error("This customer is no longer in Trash.");
    await prisma.$transaction(async (tx) => {
      const appointments = await tx.appointment.findMany({ where: { customerId: id, deletedAt: customer.deletedAt }, select: { id: true } });
      await tx.customer.update({ where: { id }, data: { deletedAt: null } });
      await tx.appointment.updateMany({ where: { customerId: id, deletedAt: customer.deletedAt }, data: { deletedAt: null } });
      await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "UPSERT");
    });
  } else if (typeValue === "appointment") {
    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { customer: { select: { deletedAt: true } } } });
    if (!appointment || appointment.customer.deletedAt) throw new Error("Restore the customer before restoring this appointment.");
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { id }, data: { deletedAt: null } });
      await enqueueGoogleCalendarSync(tx, [id], "UPSERT");
    });
  } else if (typeValue === "photo") {
    const photo = await prisma.mediaAsset.findUnique({ where: { id }, select: { appointment: { select: { deletedAt: true, customer: { select: { deletedAt: true } } } } } });
    if (!photo?.appointment || photo.appointment.deletedAt || photo.appointment.customer.deletedAt) throw new Error("Restore the appointment and customer before restoring this photo.");
    await prisma.mediaAsset.update({ where: { id }, data: { deletedAt: null } });
  } else if (typeValue === "service") {
    const service = await prisma.service.findUnique({ where: { id }, select: { category: { select: { deletedAt: true } } } });
    if (!service || service.category.deletedAt) throw new Error("Restore the service category first.");
    await prisma.service.update({ where: { id }, data: { deletedAt: null } });
  } else if (typeValue === "category") {
    const category = await prisma.studioCategory.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!category?.deletedAt) throw new Error("This category is no longer in Trash.");
    await prisma.$transaction(async (tx) => {
      const dependants = await tx.service.findMany({ where: { categoryId: id, deletedAt: { not: null } }, select: { id: true, deletedAt: true } });
      const dependantIds = dependants.filter((service) => deletedInSameTrashOperation(category.deletedAt!, service.deletedAt)).map((service) => service.id);
      await tx.studioCategory.update({ where: { id }, data: { deletedAt: null } });
      if (dependantIds.length) await tx.service.updateMany({ where: { id: { in: dependantIds } }, data: { deletedAt: null } });
    });
  } else {
    await prisma.paymentMethod.update({ where: { id }, data: { deletedAt: null } });
  }

  refreshTrashViews();
  redirect("/settings/trash");
}

export async function deletePermanently(typeValue: string, id: string) {
  const user = await requireBusinessPermission("trash.manage");
  validType(typeValue);
  await assertEntities([{ type: typeValue, id }]);
  const files: MediaFiles[] = [];

  if (typeValue === "photo") {
    const photo = await prisma.mediaAsset.findUnique({ where: { id }, select: { id: true, deletedAt: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, variants: { select: { objectKey: true, sizeBytes: true } } } });
    if (!photo?.deletedAt) throw new Error("Only photos in Trash can be permanently deleted.");
    await prisma.mediaAsset.delete({ where: { id } });
    files.push(photo);
  } else if (typeValue === "appointment") {
    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { deletedAt: true, photos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, variants: { select: { objectKey: true, sizeBytes: true } } } } } });
    if (!appointment?.deletedAt) throw new Error("Only appointments in Trash can be permanently deleted.");
    await prisma.appointment.delete({ where: { id } });
    files.push(...appointment.photos);
  } else if (typeValue === "customer") {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { deletedAt: true, profilePhotos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, variants: { select: { objectKey: true, sizeBytes: true } } } }, appointments: { select: { photos: { select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, variants: { select: { objectKey: true, sizeBytes: true } } } } } } } });
    if (!customer?.deletedAt) throw new Error("Only customers in Trash can be permanently deleted.");
    await prisma.$transaction([prisma.appointment.deleteMany({ where: { customerId: id } }), prisma.customer.delete({ where: { id } })]);
    files.push(...customer.profilePhotos, ...customer.appointments.flatMap((appointment) => appointment.photos));
  } else if (typeValue === "service") {
    const service = await prisma.service.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!service?.deletedAt) throw new Error("Only services in Trash can be permanently deleted.");
    await prisma.service.delete({ where: { id } });
  } else if (typeValue === "category") {
    const category = await prisma.studioCategory.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!category?.deletedAt) throw new Error("Only categories in Trash can be permanently deleted.");
    await prisma.$transaction(async (tx) => {
      await tx.service.deleteMany({ where: { categoryId: id } });
      await tx.studioCategory.delete({ where: { id } });
    });
  } else {
    const method = await prisma.paymentMethod.findUnique({ where: { id }, select: { deletedAt: true } });
    if (!method?.deletedAt) throw new Error("Only payment methods in Trash can be permanently deleted.");
    await prisma.paymentMethod.delete({ where: { id } });
  }

  const released = files.reduce((sum, file) => sum + file.variants.reduce((variantSum, variant) => variantSum + variant.sizeBytes, 0), 0);
  if (released) await prisma.studioSettings.update({ where: { id: "studio" }, data: { storageUsedBytes: { decrement: BigInt(released) } } });
  await removeMediaFiles(files);
  refreshTrashViews();
  redirect("/settings/trash");
}

export async function bulkRestoreFromTrash(formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  const items = selectedTrashItems(formData);
  await assertEntities(items);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  await prisma.$transaction(async (tx) => {
    const categoryIds = ids("category"); const customerIds = ids("customer");
    if (categoryIds.length) {
      const categories = await tx.studioCategory.findMany({ where: { id: { in: categoryIds }, deletedAt: { not: null } }, select: { id: true, deletedAt: true } });
      if (categories.length !== categoryIds.length) throw new Error("The selection changed. Nothing was restored.");
      for (const category of categories) {
        const dependants = await tx.service.findMany({ where: { categoryId: category.id, deletedAt: { not: null } }, select: { id: true, deletedAt: true } });
        const dependantIds = dependants.filter((service) => deletedInSameTrashOperation(category.deletedAt!, service.deletedAt)).map((service) => service.id);
        await tx.studioCategory.update({ where: { id: category.id }, data: { deletedAt: null } });
        if (dependantIds.length) await tx.service.updateMany({ where: { id: { in: dependantIds } }, data: { deletedAt: null } });
      }
    }
    const methodIds = ids("paymentMethod"); if (methodIds.length) { const result = await tx.paymentMethod.updateMany({ where: { id: { in: methodIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== methodIds.length) throw new Error("The selection changed. Nothing was restored."); }
    const serviceIds = ids("service");
    if (serviceIds.length) { const blocked = await tx.service.count({ where: { id: { in: serviceIds }, category: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected categories before their services."); await tx.service.updateMany({ where: { id: { in: serviceIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); const restored = await tx.service.count({ where: { id: { in: serviceIds }, deletedAt: null } }); if (restored !== serviceIds.length) throw new Error("The selection changed. Nothing was restored."); }
    if (customerIds.length) {
      const customers = await tx.customer.findMany({ where: { id: { in: customerIds }, deletedAt: { not: null } }, select: { id: true, deletedAt: true } });
      if (customers.length !== customerIds.length) throw new Error("The selection changed. Nothing was restored.");
      for (const customer of customers) {
        const appointments = await tx.appointment.findMany({ where: { customerId: customer.id, deletedAt: customer.deletedAt }, select: { id: true } });
        await tx.customer.update({ where: { id: customer.id }, data: { deletedAt: null } });
        await tx.appointment.updateMany({ where: { customerId: customer.id, deletedAt: customer.deletedAt }, data: { deletedAt: null } });
        await enqueueGoogleCalendarSync(tx, appointments.map((item) => item.id), "UPSERT");
      }
    }
    const appointmentIds = ids("appointment");
    if (appointmentIds.length) { const blocked = await tx.appointment.count({ where: { id: { in: appointmentIds }, customer: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected customers before their appointments."); const result = await tx.appointment.updateMany({ where: { id: { in: appointmentIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== appointmentIds.length) throw new Error("The selection changed. Nothing was restored."); await enqueueGoogleCalendarSync(tx, appointmentIds, "UPSERT"); }
    const photoIds = ids("photo");
    if (photoIds.length) { const blocked = await tx.mediaAsset.count({ where: { id: { in: photoIds }, OR: [{ appointment: { deletedAt: { not: null } } }, { appointment: { customer: { deletedAt: { not: null } } } }] } }); if (blocked) throw new Error("Restore selected customers and appointments before their photos."); const result = await tx.mediaAsset.updateMany({ where: { id: { in: photoIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); if (result.count !== photoIds.length) throw new Error("The selection changed. Nothing was restored."); }
  });
  refreshTrashViews();
}

export async function bulkDeletePermanently(formData: FormData) {
  const user = await requireBusinessPermission("trash.manage");
  const items = selectedTrashItems(formData);
  await assertEntities(items);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  const customerIds = ids("customer"); const appointmentIds = ids("appointment"); const photoIds = ids("photo");
  const fileOwners = await prisma.mediaAsset.findMany({ where: { OR: [{ id: { in: photoIds } }, { appointmentId: { in: appointmentIds } }, { customerId: { in: customerIds } }, { appointment: { customerId: { in: customerIds } } }] }, select: { id: true, imagePath: true, thumbnailPath: true, objectKey: true, featuredAt: true, variants: { select: { objectKey: true, sizeBytes: true } } } });
  await prisma.$transaction(async (tx) => {
    const all = await Promise.all(items.map((item) => item.type === "customer" ? tx.customer.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "appointment" ? tx.appointment.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "photo" ? tx.mediaAsset.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "service" ? tx.service.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "category" ? tx.studioCategory.count({ where: { id: item.id, deletedAt: { not: null } } }) : tx.paymentMethod.count({ where: { id: item.id, deletedAt: { not: null } } })));
    if (all.some((count) => count !== 1)) throw new Error("The selection changed. Nothing was deleted.");
    const categoryIds = ids("category"); const serviceIds = ids("service");
    if (photoIds.length) await tx.mediaAsset.deleteMany({ where: { id: { in: photoIds } } });
    if (appointmentIds.length) await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    if (customerIds.length) { await tx.appointment.deleteMany({ where: { customerId: { in: customerIds } } }); await tx.customer.deleteMany({ where: { id: { in: customerIds } } }); }
    if (categoryIds.length) await tx.service.deleteMany({ where: { categoryId: { in: categoryIds } } });
    if (serviceIds.length) await tx.service.deleteMany({ where: { id: { in: serviceIds } } });
    if (categoryIds.length) await tx.studioCategory.deleteMany({ where: { id: { in: categoryIds } } });
    const methodIds = ids("paymentMethod"); if (methodIds.length) await tx.paymentMethod.deleteMany({ where: { id: { in: methodIds } } });
    const released = fileOwners.reduce((sum, file) => sum + file.variants.reduce((variantSum, variant) => variantSum + variant.sizeBytes, 0), 0);
    if (released) await tx.studioSettings.update({ where: { id: "studio" }, data: { storageUsedBytes: { decrement: BigInt(released) } } });
  }, { timeout: 60_000 });
  await removeMediaFiles(fileOwners);
  refreshTrashViews();
}
