import { describe, expect, it } from "vitest";
import { publicReviewSchema, reviewLanguage } from "./reviews";

describe("studio reviews", () => {
  it("validates ratings and meaningful opinions", () => {
    expect(publicReviewSchema.safeParse({ reviewerName: "Sara", rating: 5, opinion: "A wonderful appointment." }).success).toBe(true);
    expect(publicReviewSchema.safeParse({ reviewerName: "S", rating: 6, opinion: "Too short" }).success).toBe(false);
  });

  it("keeps Persian opinions in Persian direction", () => {
    expect(reviewLanguage("تجربه خیلی خوبی بود")).toBe("fa");
    expect(reviewLanguage("A lovely studio visit")).toBe("en");
  });
});
