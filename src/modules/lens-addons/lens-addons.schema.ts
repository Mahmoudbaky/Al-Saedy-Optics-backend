import { z } from "zod";
import { localizedStringSchema, optionalLocalizedStringSchema } from "../../lib/i18n.js";
import { moneySchema } from "../../lib/schemas.js";

/** Stable camelCase key used by the app: blueLight, antiGlare, thin … */
export const addonIdSchema = z
  .string()
  .trim()
  .regex(/^[a-z][A-Za-z0-9]{1,40}$/, "Use a camelCase key like blueLight");

export const createLensAddonSchema = z.object({
  id: addonIdSchema,
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  price: moneySchema,
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
export const updateLensAddonSchema = createLensAddonSchema.omit({ id: true }).partial();

export const lensAddonResponseSchema = z.object({
  id: z.string(),
  name: localizedStringSchema,
  description: localizedStringSchema.nullable(),
  price: z.number(),
  sortOrder: z.number(),
  isActive: z.boolean(),
});

export type CreateLensAddonInput = z.infer<typeof createLensAddonSchema>;
export type UpdateLensAddonInput = z.infer<typeof updateLensAddonSchema>;
export type LensAddonDto = z.infer<typeof lensAddonResponseSchema>;
