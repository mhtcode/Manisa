import { describe, expect, it } from "vitest";
import { publicReviewSchema, REVIEW_MAX_WORDS, reviewLanguage, reviewWordCount } from "./reviews";

describe("studio reviews", () => {
  it("validates ratings and meaningful opinions", () => {
    expect(publicReviewSchema.safeParse({ reviewerName: "Sara", rating: 5, opinion: "A wonderful appointment." }).success).toBe(true);
    expect(publicReviewSchema.safeParse({ reviewerName: "S", rating: 6, opinion: "Too short" }).success).toBe(false);
  });

  it("keeps Persian opinions in Persian direction", () => {
    expect(reviewLanguage("تجربه خیلی خوبی بود")).toBe("fa");
    expect(reviewLanguage("A lovely studio visit")).toBe("en");
  });

  it("enforces the public word limit for English and Persian text", () => {
    expect(reviewWordCount("تجربه خیلی خوبی بود")).toBe(4);
    expect(publicReviewSchema.safeParse({ reviewerName: "Sara", rating: 0, opinion: "A wonderful appointment." }).success).toBe(false);
    expect(publicReviewSchema.safeParse({ reviewerName: "Sara", rating: 5, opinion: Array.from({ length: REVIEW_MAX_WORDS + 1 }, () => "lovely").join(" ") }).success).toBe(false);
  });
});
