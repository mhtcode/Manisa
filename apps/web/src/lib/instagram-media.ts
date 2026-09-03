export type InstagramMedia = {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
  children?: { data?: Array<{ media_type?: string; media_url?: string; thumbnail_url?: string }> };
};

export function instagramCoverUrl(media: InstagramMedia) {
  if (media.media_type === "CAROUSEL_ALBUM") {
    const first = media.children?.data?.[0];
    return first?.thumbnail_url || first?.media_url || media.thumbnail_url || media.media_url || null;
  }
  return media.thumbnail_url || media.media_url || null;
}

export function instagramCacheIsStale(lastSyncedAt: Date | null | undefined, now = new Date()) {
  return !lastSyncedAt || now.getTime() - lastSyncedAt.getTime() > 15 * 60_000;
}
