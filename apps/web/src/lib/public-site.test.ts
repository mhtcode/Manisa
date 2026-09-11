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
