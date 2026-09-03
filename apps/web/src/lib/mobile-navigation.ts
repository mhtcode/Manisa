export const mobileNavigationKeys = ["report", "calendar", "gallery", "settings", "appointments", "customers", "services"] as const;
export type MobileNavigationKey = typeof mobileNavigationKeys[number];

export const defaultMobileNavigation: MobileNavigationKey[] = ["report", "calendar", "gallery", "settings"];

export const mobileNavigationLabels: Record<MobileNavigationKey, string> = {
  report: "Report",
  calendar: "Calendar",
  gallery: "Gallery",
  settings: "Settings",
  appointments: "Appointments",
  customers: "Customers",
  services: "Services",
};

export const mobileNavigationHrefs: Record<MobileNavigationKey, string> = {
  report: "/report",
  calendar: "/calendar",
  gallery: "/gallery",
  settings: "/settings",
  appointments: "/appointments",
  customers: "/customers",
  services: "/services",
};

export function parseMobileNavigation(value?: string | null): MobileNavigationKey[] {
  const items = (value || "").split(",").filter((item): item is MobileNavigationKey => mobileNavigationKeys.includes(item as MobileNavigationKey));
  return items.length === 4 && new Set(items).size === 4 ? items : defaultMobileNavigation;
}

export function swipeDestinationIndex(current: number, deltaX: number, length: number, rtl = false) {
  if (current < 0 || length < 2 || deltaX === 0) return -1;
  const physicalDirection = deltaX < 0 ? 1 : -1;
  const direction = rtl ? -physicalDirection : physicalDirection;
  const next = current + direction;
  return next >= 0 && next < length ? next : -1;
}
