import { describe, expect, it } from "vitest";
import { publicReviewSummary, publicSitePreferences } from "./public-site";

describe("publicSitePreferences", () => {
  it("accepts Persian and dark mode while rejecting unsupported query values", () => {
    expect(publicSitePreferences({ lang: "fa", theme: "dark" })).toEqual({ locale: "fa", theme: "dark" });
    expect(publicSitePreferences({ lang: "fr", theme: "neon" })).toEqual({ locale: "en", theme: "dark" });
  });
});

describe("publicContentDirection", () => {
  it("keeps Persian service copy RTL even on the English public site", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const direction = publicSite.publicContentDirection as undefined | ((value: string) => "rtl" | "ltr");
    expect(typeof direction).toBe("function");
    expect(direction?.("کاشت و طراحی ناخن")).toBe("rtl");
    expect(direction?.("Hair colour رنگ مو")).toBe("ltr");
    expect(direction?.("رنگ مو Hair colour")).toBe("rtl");
  });
});

describe("public gallery helpers", () => {
  it("wraps gallery navigation and constrains zoom", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const move = publicSite.resolvePublicGalleryIndex as undefined | ((current: number, offset: number, length: number) => number);
    const zoom = publicSite.clampPublicGalleryZoom as undefined | ((value: number) => number);
    expect(move?.(0, -1, 3)).toBe(2);
    expect(move?.(2, 1, 3)).toBe(0);
    expect(zoom?.(0.5)).toBe(1);
    expect(zoom?.(5)).toBe(3);
  });

  it("requests the uncropped public variant for the lightbox", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const fullSource = publicSite.publicGalleryFullSource as undefined | ((source: string) => string);
    expect(fullSource?.("/public-media/gallery/photo-1")).toBe("/public-media/gallery/photo-1?view=full");
    expect(fullSource?.("/landing/manicure.webp")).toBe("/landing/manicure.webp");
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

describe("publicProgressRailVisible", () => {
  it("shows only during recent scroll activity", async () => {
    const publicSite = await import("./public-site") as Record<string, unknown>;
    const isVisible = publicSite.publicProgressRailVisible as undefined | ((lastScrollAt: number | null, now: number, idleDelay?: number) => boolean);
    expect(typeof isVisible).toBe("function");
    expect(isVisible?.(null, 5_000)).toBe(false);
    expect(isVisible?.(4_600, 5_000)).toBe(true);
    expect(isVisible?.(3_500, 5_000)).toBe(false);
  });
});
