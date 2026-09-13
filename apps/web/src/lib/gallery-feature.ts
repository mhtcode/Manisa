export const MAX_FEATURED_GALLERY_ITEMS = 10;

export function canFeatureGalleryItem(featuredCount: number, alreadyFeatured: boolean) {
  return alreadyFeatured || featuredCount < MAX_FEATURED_GALLERY_ITEMS;
}
