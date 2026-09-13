import { z } from "zod";
import { localizedStringSchema } from "../../lib/i18n.js";
import { slugSchema, urlSchema } from "../../lib/schemas.js";

export const createBrandSchema = z.object({
  slug: slugSchema,
  name: localizedStringSchema,
  logoUrl: urlSchema.nullable().optional(),
  isActive: z.boolean().default(true),
});
export const updateBrandSchema = createBrandSchema.partial();

export const brandResponseSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: localizedStringSchema,
  logoUrl: z.string().nullable(),
  isActive: z.boolean(),
});

export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
export type BrandDto = z.infer<typeof brandResponseSchema>;
