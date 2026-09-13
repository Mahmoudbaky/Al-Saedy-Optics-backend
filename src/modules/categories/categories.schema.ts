import { z } from "zod";
import { localizedStringSchema, optionalLocalizedStringSchema } from "../../lib/i18n.js";
import { boolQuery, slugSchema, urlSchema } from "../../lib/schemas.js";

export const createCategorySchema = z.object({
  slug: slugSchema,
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  imageUrl: urlSchema.nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoriesQuerySchema = z.object({
  includeInactive: boolQuery,
});

export const categoryResponseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: localizedStringSchema,
  description: localizedStringSchema.nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  productCount: z.number().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CategoryDto = z.infer<typeof categoryResponseSchema>;
