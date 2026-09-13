import { z } from "zod";
import { phoneSchema } from "../../lib/schemas.js";

export const createAddressSchema = z.object({
  label: z.string().trim().max(40).nullable().optional(),
  recipientName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  city: z.string().trim().min(2).max(60),
  area: z.string().trim().min(2).max(100),
  street: z.string().trim().max(120).nullable().optional(),
  building: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(300).nullable().optional(),
  isDefault: z.boolean().default(false),
});
export const updateAddressSchema = createAddressSchema.partial();

export const addressResponseSchema = z.object({
  id: z.uuid(),
  label: z.string().nullable(),
  recipientName: z.string(),
  phone: z.string(),
  city: z.string(),
  area: z.string(),
  street: z.string().nullable(),
  building: z.string().nullable(),
  notes: z.string().nullable(),
  isDefault: z.boolean(),
  /** Single-line summary for display, e.g. "Baghdad · Karrada, St. 62, Bldg 14" */
  formatted: z.string(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type AddressDto = z.infer<typeof addressResponseSchema>;
