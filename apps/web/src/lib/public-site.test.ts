import { describe, expect, it } from "vitest";
import { publicReviewSummary, publicSitePreferences } from "./public-site";

describe("publicSitePreferences", () => {
  it("accepts Persian and dark mode while rejecting unsupported query values", () => {
    expect(publicSitePreferences({ lang: "fa", theme: "dark" })).toEqual({ locale: "fa", theme: "dark" });
    expect(publicSitePreferences({ lang: "fr", theme: "neon" })).toEqual({ locale: "en", theme: "light" });
  });
});

describe("publicReviewSummary", () => {
  it("reports the approved review count and a one-decimal average", () => {
    expect(publicReviewSummary([5, 5, 4, 3])).toEqual({ count: 4, average: 4.3 });
    expect(publicReviewSummary([])).toEqual({ count: 0, average: 0 });
  });
});

describe("resolvePublicServiceCategory", () => {
  it("keeps a valid category selected and falls back safely when categories change", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const resolveCategory = publicSite.resolvePublicServiceCategory as undefined | ((ids: string[], active?: string) => string);
    expect(typeof resolveCategory).toBe("function");
    expect(resolveCategory?.(["nails", "hair"], "hair")).toBe("hair");
    expect(resolveCategory?.(["nails", "hair"], "removed")).toBe("nails");
    expect(resolveCategory?.([], "removed")).toBe("");
  });
});

describe("resolvePublicSectionAtLine", () => {
  it("selects the section crossing the navigation focus line", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const resolveSection = publicSite.resolvePublicSectionAtLine as undefined | ((sections: { id: string; top: number; bottom: number }[], line: number) => string);
    expect(typeof resolveSection).toBe("function");
    expect(resolveSection?.([{ id: "about", top: -200, bottom: 80 }, { id: "services", top: 80, bottom: 700 }], 220)).toBe("services");
    expect(resolveSection?.([{ id: "about", top: 400, bottom: 900 }], 220)).toBe("about");
    expect(resolveSection?.([], 220)).toBe("");
  });
});
