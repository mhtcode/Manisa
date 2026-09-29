export const MAX_FEATURED_GALLERY_ITEMS = 10;

export function canFeatureGalleryItem(featuredCount: number, alreadyFeatured: boolean) {
  return alreadyFeatured || featuredCount < MAX_FEATURED_GALLERY_ITEMS;
}

export function galleryPublishSource(asset: { objectKey: string | null; variants: Array<{ kind: string; objectKey: string }> }) {
  return asset.variants.find((variant) => variant.kind === "MEDIUM")?.objectKey
    || asset.variants.find((variant) => variant.kind === "LARGE")?.objectKey
    || asset.objectKey;
}

export function galleryAssetReady(asset: { imagePath: string | null; thumbnailPath: string | null; objectKey: string | null; variants: Array<{ kind: string; objectKey: string }> }) {
  return Boolean(galleryPublishSource(asset) || asset.imagePath || asset.thumbnailPath);
}
