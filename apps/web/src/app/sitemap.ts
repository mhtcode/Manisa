import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://manisa.masihtan.com").replace(/\/$/, "");
  return [{ url: origin, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }];
}
