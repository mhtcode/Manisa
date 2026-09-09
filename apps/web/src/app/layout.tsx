import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Manisa — Hair & Nail Studio",
  description: "Manisa home hair-and-nail studio and its private appointment management application.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
