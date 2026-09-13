import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import "./globals.css";

const publicOrigin = "https://manisa.masihtan.com";
const defaultTitle = "Manisa Hair & Nail Studio in Toronto";
const defaultDescription = "Private hair and nail services in Toronto. Explore Manisa studio work, client reviews, and request a private appointment online.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || publicOrigin),
  title: { default: defaultTitle, template: "%s | Manisa" },
  description: defaultDescription,
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    url: publicOrigin,
    siteName: "Manisa Hair & Nail Studio",
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: `${publicOrigin}/opengraph-image`, width: 1200, height: 630, alt: "Manisa private hair and nail studio in Toronto" }],
  },
  twitter: { card: "summary_large_image", title: defaultTitle, description: defaultDescription, images: [`${publicOrigin}/opengraph-image`] },
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
  const structuredData = {
    "@context": "https://schema.org", "@type": "BeautySalon", "@id": `${publicOrigin}/#studio`,
    name: "Manisa Hair & Nail Studio", url: publicOrigin, image: `${publicOrigin}/opengraph-image`, description: defaultDescription,
    address: { "@type": "PostalAddress", streetAddress: "77 Finch Avenue East", addressLocality: "Toronto", addressRegion: "ON", addressCountry: "CA" },
  };
  return (
    <html lang="en" dir="ltr" data-theme={theme}>
      <head><script dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} type="application/ld+json" /></head>
      <body>{children}<ServiceWorkerRegistration /></body>
    </html>
  );
}
