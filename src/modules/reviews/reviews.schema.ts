import { z } from "zod";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { boolQuery, uuidSchema } from "../../lib/schemas.js";

export const upsertReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(2).max(1000).nullable().optional(),
});

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  rating: z.coerce.number().int().min(1).max(5).optional(),
});

export const adminListReviewsQuerySchema = paginationQuerySchema.extend({
  productId: uuidSchema.optional(),
  userId: uuidSchema.optional(),
  visible: boolQuery,
});

export const reviewResponseSchema = z.object({
  id: z.uuid(),
  productId: z.uuid(),
  rating: z.number(),
  comment: z.string().nullable(),
  isVisible: z.boolean(),
  createdAt: z.string(),
  user: z.object({ id: z.uuid(), name: z.string(), image: z.string().nullable() }),
});

export const reviewSummarySchema = z.object({
  average: z.number(),
  count: z.number(),
  distribution: z.record(z.string(), z.number()),
});

export type UpsertReviewInput = z.infer<typeof upsertReviewSchema>;
export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;
export type AdminListReviewsQuery = z.infer<typeof adminListReviewsQuerySchema>;
export type ReviewDto = z.infer<typeof reviewResponseSchema>;
