import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Manisa — Hair & Nail Studio",
  description: "Manisa home hair-and-nail studio and its private appointment management application.",
  icons: {
    icon: [
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico?v=2", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: "/favicon-32.png?v=2",
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
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
