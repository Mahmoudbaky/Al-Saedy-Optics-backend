import { z } from "zod";
import { localizedStringSchema, optionalLocalizedStringSchema } from "../../lib/i18n.js";
import { urlSchema } from "../../lib/schemas.js";

export const createBannerSchema = z.object({
  title: localizedStringSchema,
  subtitle: optionalLocalizedStringSchema,
  cta: optionalLocalizedStringSchema,
  imageUrl: urlSchema.nullable().optional(),
  /** In-app route, e.g. "/categories?category=sun" */
  link: z.string().trim().max(300).nullable().optional(),
  sortOrder: z.number().int().default(0),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  isActive: z.boolean().default(true),
});
export const updateBannerSchema = createBannerSchema.partial();

export const bannerResponseSchema = z.object({
  id: z.uuid(),
  title: localizedStringSchema,
  subtitle: localizedStringSchema.nullable(),
  cta: localizedStringSchema.nullable(),
  imageUrl: z.string().nullable(),
  link: z.string().nullable(),
  sortOrder: z.number(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  isActive: z.boolean(),
});

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type BannerDto = z.infer<typeof bannerResponseSchema>;
