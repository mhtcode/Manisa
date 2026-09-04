import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manisa — Business Management Platform",
  description: "A focused platform for managing customers, appointments, services, payments, and business insights.",
};

export const viewport = { themeColor: "#080b10", colorScheme: "dark" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = (await cookies()).get("manisa_locale")?.value === "fa" ? "fa" : "en";
  const theme = (await cookies()).get("manisa_theme")?.value || "dark";
  return (
    <html lang={locale} dir={locale === "fa" ? "rtl" : "ltr"} data-theme={theme}>
      <body>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
