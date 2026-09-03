export type CollectionKey = "appointments" | "customers" | "services" | "gallery" | "reportRecords";

export function collectionView(value: unknown, key: CollectionKey, fallback: "grid" | "list" = "list") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return (value as Record<string, unknown>)[key] === "grid" ? "grid" : (value as Record<string, unknown>)[key] === "list" ? "list" : fallback;
}

export function sectionCollapsed(value: unknown, sectionId: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as Record<string, unknown>)[sectionId] === true;
}
