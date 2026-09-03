import "server-only";

import { subDays } from "date-fns";
import { removePreparedPhotos, type StoredPhotoPaths } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";
import { TRASH_RETENTION_DAYS } from "@/lib/trash-lifecycle";

export type TrashPurgeResult = { appointments: number; categories: number; customers: number; photos: number; services: number };

export async function purgeExpiredTrash(now = new Date()): Promise<TrashPurgeResult> {
  const cutoff = subDays(now, TRASH_RETENTION_DAYS);
  const removedPhotoFiles: StoredPhotoPaths[] = [];

  const counts = await prisma.$transaction(async (transaction) => {
    let photos = 0;
    let appointments = 0;
    const expiredPhotos = await transaction.appointmentPhoto.findMany({ where: { deletedAt: { lte: cutoff } }, select: { id: true, imagePath: true, thumbnailPath: true } });
    for (const photo of expiredPhotos) {
      const deleted = await transaction.appointmentPhoto.deleteMany({ where: { id: photo.id, deletedAt: { lte: cutoff } } });
      if (deleted.count) { photos += 1; removedPhotoFiles.push(photo); }
    }

    const expiredAppointments = await transaction.appointment.findMany({ where: { deletedAt: { lte: cutoff } }, select: { id: true, photos: { select: { imagePath: true, thumbnailPath: true } } } });
    for (const appointment of expiredAppointments) {
      const deleted = await transaction.appointment.deleteMany({ where: { id: appointment.id, deletedAt: { lte: cutoff } } });
      if (deleted.count) { appointments += 1; removedPhotoFiles.push(...appointment.photos); }
    }

    const customers = await transaction.customer.deleteMany({ where: { deletedAt: { lte: cutoff }, appointments: { none: {} } } });
    const services = await transaction.service.deleteMany({ where: { deletedAt: { lte: cutoff } } });
    const categories = await transaction.studioCategory.deleteMany({ where: { deletedAt: { lte: cutoff }, services: { none: {} } } });
    return { appointments, categories: categories.count, customers: customers.count, photos, services: services.count };
  }, { timeout: 60_000 });

  await removePreparedPhotos(removedPhotoFiles);
  return counts;
}
