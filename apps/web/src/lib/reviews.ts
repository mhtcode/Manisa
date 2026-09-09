import { z } from "zod";

export const publicReviewSchema = z.object({
  reviewerName: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  opinion: z.string().trim().min(10).max(1200),
});

export function reviewLanguage(value: string): "fa" | "en" {
  return /[\u0600-\u06ff]/.test(value) ? "fa" : "en";
}
