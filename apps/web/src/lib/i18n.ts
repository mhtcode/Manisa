export const messages = {
  en: { dashboard: "Dashboard", report: "Report", appointments: "Appointments", customers: "Customers", services: "Services", calendar: "Calendar", gallery: "Gallery", reports: "Reports", workingHours: "Working Hours", settings: "Settings", newAppointment: "New appointment", newCustomer: "New customer", newService: "New service", search: "Search", save: "Save", cancel: "Cancel", edit: "Edit", complete: "Complete", signOut: "Sign out", welcome: "Welcome back", upcoming: "Upcoming appointments" },
  fa: { dashboard: "داشبورد", report: "گزارش", appointments: "قرارها", customers: "مشتریان", services: "خدمات", calendar: "تقویم", gallery: "گالری", reports: "گزارش‌ها", workingHours: "ساعات کاری", settings: "تنظیمات", newAppointment: "قرار جدید", newCustomer: "مشتری جدید", newService: "خدمت جدید", search: "جستجو", save: "ذخیره", cancel: "لغو", edit: "ویرایش", complete: "تکمیل", signOut: "خروج", welcome: "خوش آمدید", upcoming: "قرارهای آینده" },
} as const;
export type AppLocale = keyof typeof messages;
export function getMessages(locale: AppLocale) { return messages[locale]; }
