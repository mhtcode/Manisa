export const mobileNavigationKeys = ["dashboard", "appointments", "calendar", "customers", "services", "reports", "workingHours", "settings", "more"] as const;
export type MobileNavigationKey = typeof mobileNavigationKeys[number];

export const defaultMobileNavigation: MobileNavigationKey[] = ["dashboard", "appointments", "calendar", "more"];

export const mobileNavigationLabels: Record<MobileNavigationKey, string> = {
  dashboard: "Dashboard",
  appointments: "Appointments",
  calendar: "Calendar",
  customers: "Customers",
  services: "Services",
  reports: "Reports",
  workingHours: "Working Hours",
  settings: "Settings",
  more: "More menu",
};

export function parseMobileNavigation(value?: string | null): MobileNavigationKey[] {
  const items = (value || "").split(",").filter((item): item is MobileNavigationKey => mobileNavigationKeys.includes(item as MobileNavigationKey));
  return items.length === 4 && new Set(items).size === 4 && items.includes("more") ? items : defaultMobileNavigation;
}
