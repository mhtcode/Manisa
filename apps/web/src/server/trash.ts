import "server-only";

import { subDays } from "date-fns";
import { removePreparedPhotos, type StoredPhotoPaths } from "@/lib/photo-storage";
import { removeObject } from "@/lib/object-storage";
import { prisma } from "@/lib/prisma";
import { TRASH_RETENTION_DAYS } from "@/lib/trash-lifecycle";

export type TrashPurgeResult = { appointments: number; categories: number; customers: number; photos: number; services: number; paymentMethods: number };

export async function purgeExpiredTrash(now = new Date()): Promise<TrashPurgeResult> {
  const cutoff = subDays(now, TRASH_RETENTION_DAYS);
  const removedPhotoFiles: StoredPhotoPaths[] = [];
  const objectKeys = new Set<string>();
  const publicKeys = new Set<string>();

  const counts = await prisma.$transaction(async (transaction) => {
    let photos = 0;
    let appointments = 0;
    const expiredPhotos = await transaction.mediaAsset.findMany({
      where: { OR: [{ deletedAt: { lte: cutoff } }, { appointment: { deletedAt: { lte: cutoff } } }, { customer: { deletedAt: { lte: cutoff } } }] },
      select: { id: true, businessId: true, featuredAt: true, objectKey: true, imagePath: true, thumbnailPath: true, variants: { select: { objectKey: true, sizeBytes: true } } },
    });
    const releasedByBusiness = new Map<string, bigint>();
    for (const photo of expiredPhotos) {
      const deleted = await transaction.mediaAsset.deleteMany({ where: { id: photo.id } });
      if (deleted.count) {
        photos += 1; removedPhotoFiles.push(photo);
        if (photo.objectKey) objectKeys.add(photo.objectKey);
        for (const variant of photo.variants) objectKeys.add(variant.objectKey);
        if (photo.featuredAt) publicKeys.add(`${photo.businessId}/featured/${photo.id}.webp`);
        const bytes = BigInt(photo.variants.reduce((sum, variant) => sum + variant.sizeBytes, 0));
        releasedByBusiness.set(photo.businessId, (releasedByBusiness.get(photo.businessId) || BigInt(0)) + bytes);
      }
    }
    for (const [businessId, bytes] of releasedByBusiness) if (bytes) await transaction.business.update({ where: { id: businessId }, data: { storageUsedBytes: { decrement: bytes } } });

    const expiredAppointments = await transaction.appointment.findMany({ where: { deletedAt: { lte: cutoff } }, select: { id: true } });
    for (const appointment of expiredAppointments) {
      const deleted = await transaction.appointment.deleteMany({ where: { id: appointment.id, deletedAt: { lte: cutoff } } });
      if (deleted.count) appointments += 1;
    }

    const customers = await transaction.customer.deleteMany({ where: { deletedAt: { lte: cutoff }, appointments: { none: {} } } });
    const services = await transaction.service.deleteMany({ where: { deletedAt: { lte: cutoff } } });
    const categories = await transaction.studioCategory.deleteMany({ where: { deletedAt: { lte: cutoff }, services: { none: {} } } });
    const paymentMethods = await transaction.paymentMethod.deleteMany({ where: { deletedAt: { lte: cutoff } } });
    return { appointments, categories: categories.count, customers: customers.count, photos, services: services.count, paymentMethods: paymentMethods.count };
  }, { timeout: 60_000 });

  await removePreparedPhotos(removedPhotoFiles);
  await Promise.allSettled([...objectKeys].map((key) => removeObject(key)));
  await Promise.allSettled([...publicKeys].map((key) => removeObject(key, true)));
  return counts;
}
