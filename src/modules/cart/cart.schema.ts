import { z } from "zod";
import { localizedStringSchema } from "../../lib/i18n.js";
import { uuidSchema } from "../../lib/schemas.js";
import { addonIdSchema } from "../lens-addons/lens-addons.schema.js";
import { bookAppointmentSchema } from "../appointments/appointments.schema.js";
import { prescriptionResponseSchema } from "../prescriptions/prescriptions.schema.js";
import { appointmentSummarySchema, lineRxModeSchema, lineRxStateSchema } from "../prescriptions/rx-line.js";
import { productCardSchema } from "../products/products.schema.js";
import { promoCodeSchema } from "../promo-codes/promo-codes.schema.js";

export const addCartItemSchema = z.object({
  productId: uuidSchema,
  /** Colour variant. Defaults to the product's first active variant. */
  variantId: uuidSchema.optional(),
  quantity: z.number().int().min(1).max(20).default(1),
  addonIds: z.array(addonIdSchema).max(10).default([]),
  /** Free-text option such as contact-lens power, shown under the item name. */
  variantLabel: z.string().trim().max(80).optional(),
  /** Prescription source for items that need one (pick one). Can also be set later per line. */
  prescriptionId: uuidSchema.optional(),
  appointmentId: uuidSchema.optional(),
}).refine((v) => !(v.prescriptionId && v.appointmentId), { message: "Choose either prescriptionId or appointmentId, not both", path: ["appointmentId"] });

export const updateCartItemSchema = z.object({
  /** 0 removes the line. */
  quantity: z.number().int().min(0).max(20),
});

/** Option 1 – use a prescription the customer already has. */
export const attachLinePrescriptionSchema = z.object({ prescriptionId: uuidSchema });

/**
 * Option 2 – get the prescription from an eye exam: either link an upcoming
 * appointment the customer already booked, or book a new slot right here.
 */
export const attachLineAppointmentSchema = z.union([
  z.object({ appointmentId: uuidSchema }),
  bookAppointmentSchema.extend({ reason: bookAppointmentSchema.shape.reason.default("rx") }),
]);

export const applyPromoSchema = z.object({ code: promoCodeSchema.nullable() });

export const cartItemResponseSchema = z.object({
  id: z.uuid(),
  product: productCardSchema,
  variant: z.object({
    id: z.uuid(),
    colorHex: z.string(),
    colorName: localizedStringSchema.nullable(),
    stock: z.number(),
  }),
  quantity: z.number(),
  addons: z.array(z.object({ id: z.string(), name: localizedStringSchema, price: z.number() })),
  variantLabel: z.string().nullable(),
  unitPrice: z.number(),
  lineTotal: z.number(),
  /** False when the product/variant was removed or is out of stock – excluded from totals. */
  available: z.boolean(),
  issue: z.string().nullable(),
  /** Per-line prescription: how it will be fulfilled and whether the line can be checked out. */
  prescription: z.object({
    required: z.boolean(),
    mode: lineRxModeSchema,
    state: lineRxStateSchema,
    ready: z.boolean(),
    issue: z.string().nullable(),
    prescription: prescriptionResponseSchema.nullable(),
    appointment: appointmentSummarySchema.nullable(),
  }),
});

export const cartSummarySchema = z.object({
  itemCount: z.number(),
  subtotal: z.number(),
  discount: z.number(),
  /** Fee for home delivery; pickup is always free. */
  deliveryFee: z.number(),
  freeDeliveryThreshold: z.number(),
  total: z.number(),
  currency: z.string(),
});

export const cartResponseSchema = z.object({
  id: z.uuid(),
  items: z.array(cartItemResponseSchema),
  /** True when at least one line needs a prescription. */
  requiresPrescription: z.boolean(),
  /** False while any line still needs a prescription source (or has a rejected/expired one). */
  prescriptionsReady: z.boolean(),
  promo: z.object({ code: z.string().nullable(), discount: z.number(), error: z.string().nullable() }),
  summary: cartSummarySchema,
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type AttachLineAppointmentInput = z.infer<typeof attachLineAppointmentSchema>;
export type CartItemDto = z.infer<typeof cartItemResponseSchema>;
export type CartDto = z.infer<typeof cartResponseSchema>;
