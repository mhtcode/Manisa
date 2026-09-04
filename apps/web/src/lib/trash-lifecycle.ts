export const TRASH_RETENTION_DAYS = 7;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const trashEntityTypes = ["customer", "appointment", "photo", "service", "category", "paymentMethod"] as const;
export type TrashEntityType = (typeof trashEntityTypes)[number];

export function trashExpiresAt(deletedAt: Date) {
  return new Date(deletedAt.getTime() + TRASH_RETENTION_MS);
}

export function trashTimeRemaining(deletedAt: Date, now = new Date()) {
  const milliseconds = Math.max(0, trashExpiresAt(deletedAt).getTime() - now.getTime());
  const hours = Math.ceil(milliseconds / 3_600_000);
  return hours > 48 ? `${Math.ceil(hours / 24)} days` : hours > 1 ? `${hours} hours` : "less than 1 hour";
}
