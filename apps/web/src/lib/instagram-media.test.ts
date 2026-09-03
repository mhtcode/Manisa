import { describe, expect, it } from "vitest";
import { instagramCacheIsStale, instagramCoverUrl } from "./instagram-media";

describe("Instagram media helpers", () => {
  it("uses video thumbnails and the first carousel child", () => {
    const base = { id: "1", permalink: "https://instagram.com/p/1", timestamp: "2026-01-01T00:00:00Z" };
    expect(instagramCoverUrl({ ...base, media_type: "VIDEO", media_url: "video", thumbnail_url: "cover" })).toBe("cover");
    expect(instagramCoverUrl({ ...base, media_type: "CAROUSEL_ALBUM", children: { data: [{ media_url: "first" }] } })).toBe("first");
  });

  it("marks caches older than fifteen minutes as stale", () => {
    const now = new Date("2026-01-01T12:16:00Z");
    expect(instagramCacheIsStale(new Date("2026-01-01T12:00:00Z"), now)).toBe(true);
    expect(instagramCacheIsStale(new Date("2026-01-01T12:05:00Z"), now)).toBe(false);
  });
});
