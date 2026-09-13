import { z } from "zod";
import { DELIVERY_METHODS, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from "../../db/schema/enums.js";
import { localizedStringSchema } from "../../lib/i18n.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { phoneSchema, uuidSchema } from "../../lib/schemas.js";
import { addressResponseSchema } from "../addresses/addresses.schema.js";

export const checkoutSchema = z.object({
  deliveryMethod: z.enum(DELIVERY_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  /** Required for home delivery; defaults to the user's default address. */
  addressId: uuidSchema.optional(),
  /** Overrides the prescription attached to the cart. */
  prescriptionId: uuidSchema.optional(),
  note: z.string().trim().max(500).optional(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const listMyOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});

export const adminListOrdersQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  deliveryMethod: z.enum(DELIVERY_METHODS).optional(),
  userId: uuidSchema.optional(),
  /** Order number or customer email/phone/name */
  search: z.string().trim().max(100).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});
export type AdminListOrdersQuery = z.infer<typeof adminListOrdersQuerySchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export const updateOrderDetailsSchema = z
  .object({
    courierName: z.string().trim().max(100).nullable().optional(),
    courierPhone: phoneSchema.nullable().optional(),
    eta: localizedStringSchema.nullable().optional(),
    adminNote: z.string().trim().max(1000).nullable().optional(),
    paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const cancelOrderSchema = z.object({ reason: z.string().trim().max(300).optional() });

const orderItemSchema = z.object({
  id: z.uuid(),
  productId: z.uuid().nullable(),
  variantId: z.uuid().nullable(),
  name: localizedStringSchema,
  code: z.string().nullable(),
  colorHex: z.string().nullable(),
  imageUrl: z.string().nullable(),
  variantLabel: z.string().nullable(),
  addons: z.array(z.object({ id: z.string(), name: localizedStringSchema, price: z.number() })),
  unitPrice: z.number(),
  quantity: z.number(),
  lineTotal: z.number(),
});

export const orderResponseSchema = z.object({
  id: z.uuid(),
  number: z.number(),
  status: z.enum(ORDER_STATUSES),
  deliveryMethod: z.enum(DELIVERY_METHODS),
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  address: addressResponseSchema.omit({ id: true, label: true, isDefault: true }).nullable(),
  prescription: z
    .object({
      id: z.string(),
      od: z.object({ sph: z.string().nullable(), cyl: z.string().nullable(), axis: z.string().nullable() }),
      os: z.object({ sph: z.string().nullable(), cyl: z.string().nullable(), axis: z.string().nullable() }),
      pd: z.string().nullable(),
      add: z.string().nullable(),
    })
    .nullable(),
  items: z.array(orderItemSchema),
  itemCount: z.number(),
  subtotal: z.number(),
  discount: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
  currency: z.string(),
  promoCode: z.string().nullable(),
  customerNote: z.string().nullable(),
  courier: z.object({ name: z.string(), phone: z.string().nullable() }).nullable(),
  eta: localizedStringSchema.nullable(),
  /** Ordered steps for the tracking screen; `at` is null for steps not reached yet. */
  timeline: z.array(z.object({ status: z.enum(ORDER_STATUSES), at: z.string().nullable(), note: z.string().nullable() })),
  canCancel: z.boolean(),
  cancelReason: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrderDto = z.infer<typeof orderResponseSchema>;

export const adminOrderResponseSchema = orderResponseSchema.extend({
  adminNote: z.string().nullable(),
  user: z.object({ id: z.uuid(), name: z.string(), email: z.string(), phone: z.string().nullable() }),
  events: z.array(z.object({ status: z.enum(ORDER_STATUSES), at: z.string(), note: z.string().nullable(), actorId: z.uuid().nullable() })),
});
export type AdminOrderDto = z.infer<typeof adminOrderResponseSchema>;
