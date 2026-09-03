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
}

function destination(type: TrashEntityType) {
  return type === "customer" ? "/customers" : type === "appointment" ? "/appointments" : type === "photo" ? "/gallery" : type === "service" ? "/services" : "/settings/categories";
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
  } else {
    const remainingServices = await prisma.service.count({ where: { categoryId: id, deletedAt: null } });
    if (remainingServices) throw new Error("Move every service in this category to Trash before deleting the category.");
    await prisma.studioCategory.update({ where: { id, deletedAt: null }, data: { deletedAt } });
  }

  refreshTrashViews();
  redirect(destination(typeValue));
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
  } else {
    await prisma.studioCategory.update({ where: { id }, data: { deletedAt: null } });
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
  } else {
    const category = await prisma.studioCategory.findUnique({ where: { id }, select: { deletedAt: true, _count: { select: { services: true } } } });
    if (!category?.deletedAt) throw new Error("Only categories in Trash can be permanently deleted.");
    if (category._count.services) throw new Error("Permanently delete the category’s services first.");
    await prisma.studioCategory.delete({ where: { id } });
  }

  await removePreparedPhotos(files);
  refreshTrashViews();
  redirect("/settings/trash");
}
