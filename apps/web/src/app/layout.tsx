import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manisa — Business Management Platform",
  description: "A focused platform for managing customers, appointments, services, payments, and business insights.",
  icons: { icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon.svg", type: "image/svg+xml" }], apple: "/icon-192.png" },
};

export const viewport = { themeColor: "#080b10", colorScheme: "dark" };

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = (await cookies()).get("manisa_theme")?.value || "dark";
  return (
    <html lang="en" dir="ltr" data-theme={theme}>
      <body>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
