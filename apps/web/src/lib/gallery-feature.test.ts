import { describe, expect, it } from "vitest";
import { canFeatureGalleryItem, MAX_FEATURED_GALLERY_ITEMS } from "./gallery-feature";

describe("landing gallery feature limit", () => {
  it("allows a new item before the ten-item limit", () => {
    expect(MAX_FEATURED_GALLERY_ITEMS).toBe(10);
    expect(canFeatureGalleryItem(9, false)).toBe(true);
  });

  it("rejects a new item at the limit while allowing removal", () => {
    expect(canFeatureGalleryItem(10, false)).toBe(false);
    expect(canFeatureGalleryItem(10, true)).toBe(true);
  });
});
