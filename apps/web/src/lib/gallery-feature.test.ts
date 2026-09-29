import { describe, expect, it } from "vitest";
import { canFeatureGalleryItem, galleryPublishSource, MAX_FEATURED_GALLERY_ITEMS } from "./gallery-feature";

describe("landing gallery feature limit", () => {
  it("allows a new item before the ten-item limit", () => {
    expect(MAX_FEATURED_GALLERY_ITEMS).toBe(10);
    expect(canFeatureGalleryItem(9, false)).toBe(true);
  });

  it("rejects a new item at the limit while allowing removal", () => {
    expect(canFeatureGalleryItem(10, false)).toBe(false);
    expect(canFeatureGalleryItem(10, true)).toBe(true);
  });

  it("can republish a restored original when generated variants are unavailable", () => {
    expect(galleryPublishSource({ objectKey: "original/photo.webp", variants: [] })).toBe("original/photo.webp");
    expect(galleryPublishSource({ objectKey: "original/photo.webp", variants: [{ kind: "MEDIUM", objectKey: "medium/photo.webp" }] })).toBe("medium/photo.webp");
  });
});
