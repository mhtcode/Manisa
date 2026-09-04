"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { removePreparedPhotos } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { trashEntityTypes, type TrashEntityType } from "@/lib/trash-lifecycle";
import { requireUser } from "@/lib/auth";

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

export async function moveToTrash(typeValue: string, id: string) {
  await requireUser();
  validType(typeValue);
  const deletedAt = new Date();

  if (typeValue === "customer") {
    await prisma.$transaction([
      prisma.customer.update({ where: { id, deletedAt: null }, data: { deletedAt } }),
      prisma.appointment.updateMany({ where: { customerId: id, deletedAt: null }, data: { deletedAt } }),
    ]);
  } else if (typeValue === "appointment") {
    await prisma.appointment.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  } else if (typeValue === "photo") {
    await prisma.appointmentPhoto.update({ where: { id, deletedAt: null }, data: { deletedAt } });
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
  await requireUser();
  validType(typeValue);
  const raw = JSON.parse(String(formData.get("ids") || "[]"));
  if (!Array.isArray(raw) || !raw.length || raw.length > 10_000 || raw.some((id) => typeof id !== "string")) throw new Error("Invalid selection.");
  const ids = [...new Set(raw as string[])];
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
      await tx.customer.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
    } else if (typeValue === "paymentMethod") {
      const result = await tx.paymentMethod.updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt, active: false } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    } else {
      const model = typeValue === "appointment" ? tx.appointment : typeValue === "photo" ? tx.appointmentPhoto : tx.service;
      const result = await (model as typeof tx.service).updateMany({ where: { id: { in: ids }, deletedAt: null }, data: { deletedAt } });
      if (result.count !== ids.length) throw new Error("The selection changed. Nothing was deleted.");
    }
  });
  refreshTrashViews();
}

export async function restoreFromTrash(typeValue: string, id: string) {
  await requireUser();
  validType(typeValue);

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
    const photo = await prisma.appointmentPhoto.findUnique({ where: { id }, select: { appointment: { select: { deletedAt: true, customer: { select: { deletedAt: true } } } } } });
    if (!photo || photo.appointment.deletedAt || photo.appointment.customer.deletedAt) throw new Error("Restore the appointment and customer before restoring this photo.");
    await prisma.appointmentPhoto.update({ where: { id }, data: { deletedAt: null } });
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
  await requireUser();
  validType(typeValue);
  const files: Array<{ imagePath: string; thumbnailPath: string }> = [];

  if (typeValue === "photo") {
    const photo = await prisma.appointmentPhoto.findUnique({ where: { id }, select: { deletedAt: true, imagePath: true, thumbnailPath: true } });
    if (!photo?.deletedAt) throw new Error("Only photos in Trash can be permanently deleted.");
    await prisma.appointmentPhoto.delete({ where: { id } });
    files.push(photo);
  } else if (typeValue === "appointment") {
    const appointment = await prisma.appointment.findUnique({ where: { id }, select: { deletedAt: true, photos: { select: { imagePath: true, thumbnailPath: true } } } });
    if (!appointment?.deletedAt) throw new Error("Only appointments in Trash can be permanently deleted.");
    await prisma.appointment.delete({ where: { id } });
    files.push(...appointment.photos);
  } else if (typeValue === "customer") {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { deletedAt: true, appointments: { select: { photos: { select: { imagePath: true, thumbnailPath: true } } } } } });
    if (!customer?.deletedAt) throw new Error("Only customers in Trash can be permanently deleted.");
    await prisma.$transaction([prisma.appointment.deleteMany({ where: { customerId: id } }), prisma.customer.delete({ where: { id } })]);
    files.push(...customer.appointments.flatMap((appointment) => appointment.photos));
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

  await removePreparedPhotos(files);
  refreshTrashViews();
  redirect("/settings/trash");
}

export async function bulkRestoreFromTrash(formData: FormData) {
  await requireUser();
  const items = selectedTrashItems(formData);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  await prisma.$transaction(async (tx) => {
    const categoryIds = ids("category"); const customerIds = ids("customer");
    if (categoryIds.length) await tx.studioCategory.updateMany({ where: { id: { in: categoryIds }, deletedAt: { not: null } }, data: { deletedAt: null } });
    const methodIds = ids("paymentMethod"); if (methodIds.length) await tx.paymentMethod.updateMany({ where: { id: { in: methodIds }, deletedAt: { not: null } }, data: { deletedAt: null } });
    const serviceIds = ids("service");
    if (serviceIds.length) { const blocked = await tx.service.count({ where: { id: { in: serviceIds }, category: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected categories before their services."); await tx.service.updateMany({ where: { id: { in: serviceIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); }
    if (customerIds.length) await tx.customer.updateMany({ where: { id: { in: customerIds }, deletedAt: { not: null } }, data: { deletedAt: null } });
    const appointmentIds = ids("appointment");
    if (appointmentIds.length) { const blocked = await tx.appointment.count({ where: { id: { in: appointmentIds }, customer: { deletedAt: { not: null } } } }); if (blocked) throw new Error("Restore selected customers before their appointments."); await tx.appointment.updateMany({ where: { id: { in: appointmentIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); }
    const photoIds = ids("photo");
    if (photoIds.length) { const blocked = await tx.appointmentPhoto.count({ where: { id: { in: photoIds }, OR: [{ appointment: { deletedAt: { not: null } } }, { appointment: { customer: { deletedAt: { not: null } } } }] } }); if (blocked) throw new Error("Restore selected customers and appointments before their photos."); await tx.appointmentPhoto.updateMany({ where: { id: { in: photoIds }, deletedAt: { not: null } }, data: { deletedAt: null } }); }
  });
  refreshTrashViews();
}

export async function bulkDeletePermanently(formData: FormData) {
  await requireUser();
  const items = selectedTrashItems(formData);
  const ids = (type: TrashEntityType) => items.filter((item) => item.type === type).map((item) => item.id);
  const customerIds = ids("customer"); const appointmentIds = ids("appointment"); const photoIds = ids("photo");
  const fileOwners = await prisma.appointmentPhoto.findMany({ where: { OR: [{ id: { in: photoIds } }, { appointmentId: { in: appointmentIds } }, { appointment: { customerId: { in: customerIds } } }] }, select: { imagePath: true, thumbnailPath: true } });
  await prisma.$transaction(async (tx) => {
    const all = await Promise.all(items.map((item) => item.type === "customer" ? tx.customer.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "appointment" ? tx.appointment.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "photo" ? tx.appointmentPhoto.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "service" ? tx.service.count({ where: { id: item.id, deletedAt: { not: null } } }) : item.type === "category" ? tx.studioCategory.count({ where: { id: item.id, deletedAt: { not: null } } }) : tx.paymentMethod.count({ where: { id: item.id, deletedAt: { not: null } } })));
    if (all.some((count) => count !== 1)) throw new Error("The selection changed. Nothing was deleted.");
    const categoryIds = ids("category"); const serviceIds = ids("service");
    if (categoryIds.length) { const blocked = await tx.service.count({ where: { categoryId: { in: categoryIds }, id: { notIn: serviceIds } } }); if (blocked) throw new Error("Select every related service before deleting its category."); }
    if (photoIds.length) await tx.appointmentPhoto.deleteMany({ where: { id: { in: photoIds } } });
    if (appointmentIds.length) await tx.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    if (customerIds.length) { await tx.appointment.deleteMany({ where: { customerId: { in: customerIds } } }); await tx.customer.deleteMany({ where: { id: { in: customerIds } } }); }
    if (serviceIds.length) await tx.service.deleteMany({ where: { id: { in: serviceIds } } });
    if (categoryIds.length) await tx.studioCategory.deleteMany({ where: { id: { in: categoryIds } } });
    const methodIds = ids("paymentMethod"); if (methodIds.length) await tx.paymentMethod.deleteMany({ where: { id: { in: methodIds } } });
  }, { timeout: 60_000 });
  await removePreparedPhotos(fileOwners);
  refreshTrashViews();
}
