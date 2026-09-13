import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://manisa.masihtan.com";
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/appointments/", "/calendar", "/customers/", "/gallery/", "/report", "/settings/", "/login", "/setup", "/platform"] }, sitemap: `${origin.replace(/\/$/, "")}/sitemap.xml`, host: origin.replace(/\/$/, "") };
}
