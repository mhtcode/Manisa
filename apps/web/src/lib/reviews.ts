import { z } from "zod";

export const REVIEW_MIN_WORDS = 3;
export const REVIEW_MAX_WORDS = 180;

export function reviewWordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export const publicReviewSchema = z.object({
  reviewerName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  opinion: z.string().trim().min(10).max(1600).superRefine((value, context) => {
    const words = reviewWordCount(value);
    if (words < REVIEW_MIN_WORDS || words > REVIEW_MAX_WORDS) context.addIssue({ code: "custom", message: `Write between ${REVIEW_MIN_WORDS} and ${REVIEW_MAX_WORDS} words.` });
  }),
});

export function reviewLanguage(value: string): "fa" | "en" {
  return /[\u0600-\u06ff]/.test(value) ? "fa" : "en";
}
