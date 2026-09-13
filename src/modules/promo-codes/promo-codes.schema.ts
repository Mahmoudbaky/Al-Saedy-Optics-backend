import { z } from "zod";
import { PROMO_TYPES } from "../../db/schema/enums.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { boolQuery, moneySchema } from "../../lib/schemas.js";

export const promoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,30}$/, "3–30 letters, numbers, - or _");

export const createPromoCodeSchema = z
  .object({
    code: promoCodeSchema,
    type: z.enum(PROMO_TYPES),
    value: z.number().int().positive(),
    minSubtotal: moneySchema.default(0),
    maxDiscount: moneySchema.nullable().optional(),
    startsAt: z.iso.datetime().nullable().optional(),
    endsAt: z.iso.datetime().nullable().optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.type !== "percent" || v.value <= 100, { path: ["value"], message: "Percent must be ≤ 100" });

export const updatePromoCodeSchema = z.object({
  type: z.enum(PROMO_TYPES).optional(),
  value: z.number().int().positive().optional(),
  minSubtotal: moneySchema.optional(),
  maxDiscount: moneySchema.nullable().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  endsAt: z.iso.datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const listPromoCodesQuerySchema = paginationQuerySchema.extend({ active: boolQuery });

export const promoCodeResponseSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  type: z.enum(PROMO_TYPES),
  value: z.number(),
  minSubtotal: z.number(),
  maxDiscount: z.number().nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  maxUses: z.number().nullable(),
  usedCount: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
});

export type CreatePromoCodeInput = z.infer<typeof createPromoCodeSchema>;
export type UpdatePromoCodeInput = z.infer<typeof updatePromoCodeSchema>;
export type PromoCodeDto = z.infer<typeof promoCodeResponseSchema>;
