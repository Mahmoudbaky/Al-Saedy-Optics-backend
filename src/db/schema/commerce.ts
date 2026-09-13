import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./_shared.js";
import { user } from "./auth.js";
import { products, productVariants } from "./catalog.js";
import { prescriptions } from "./customer.js";
import { deliveryMethodEnum, orderStatusEnum, paymentMethodEnum, paymentStatusEnum, promoTypeEnum } from "./enums.js";

/** One cart per user. Totals are computed on read from live prices. */
export const carts = pgTable("carts", {
  id: uuidPk(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  prescriptionId: uuid("prescription_id").references(() => prescriptions.id, { onDelete: "set null" }),
  promoCode: text("promo_code"),
  ...timestamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuidPk(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    /** Sorted lens add-on ids, e.g. ["antiGlare","blueLight"]. */
    addonIds: text("addon_ids").array().notNull().default([]),
    /** Free-text variant info, e.g. contact lens power "-1.00". Empty string when none. */
    variantLabel: text("variant_label").notNull().default(""),
    ...timestamps,
  },
  (t) => [
    index("cart_items_cart_idx").on(t.cartId),
    // Same product + colour + add-ons merges into one line.
    uniqueIndex("cart_items_line_uq").on(t.cartId, t.variantId, t.addonIds, t.variantLabel),
  ],
);

export const promoCodes = pgTable("promo_codes", {
  id: uuidPk(),
  code: text("code").notNull().unique(),
  type: promoTypeEnum("type").notNull(),
  /** Percent (0-100) or fixed IQD depending on `type`. */
  value: integer("value").notNull(),
  minSubtotal: integer("min_subtotal").notNull().default(0),
  maxDiscount: integer("max_discount"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export type AddressSnapshot = {
  recipientName: string;
  phone: string;
  city: string;
  area: string;
  street?: string | null;
  building?: string | null;
  notes?: string | null;
};

export type PrescriptionSnapshot = {
  id: string;
  od: { sph: string | null; cyl: string | null; axis: string | null };
  os: { sph: string | null; cyl: string | null; axis: string | null };
  pd: string | null;
  add: string | null;
};

export const orders = pgTable(
  "orders",
  {
    id: uuidPk(),
    /** Human friendly incremental number shown to customers, e.g. 10428. */
    number: serial("number").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pending"),
    deliveryMethod: deliveryMethodEnum("delivery_method").notNull().default("home"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cod"),
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("unpaid"),
    /** Copied at checkout so later address edits don't rewrite history. */
    address: jsonb("address").$type<AddressSnapshot>(),
    prescription: jsonb("prescription").$type<PrescriptionSnapshot>(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    deliveryFee: integer("delivery_fee").notNull().default(0),
    total: integer("total").notNull(),
    promoCode: text("promo_code"),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    courierName: text("courier_name"),
    courierPhone: text("courier_phone"),
    /** Estimated delivery window, free text set by staff. */
    etaAr: text("eta_ar"),
    etaEn: text("eta_en"),
    cancelReason: text("cancel_reason"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("orders_user_created_idx").on(t.userId, t.createdAt), index("orders_status_idx").on(t.status)],
);

export type OrderItemAddon = { id: string; nameAr: string; nameEn: string; price: number };

export const orderItems = pgTable(
  "order_items",
  {
    id: uuidPk(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    // Snapshots – the catalogue may change after the order is placed.
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    code: text("code"),
    colorHex: text("color_hex"),
    imageUrl: text("image_url"),
    variantLabel: text("variant_label"),
    addons: jsonb("addons").$type<OrderItemAddon[]>().notNull().default([]),
    /** Product price + add-ons at purchase time. */
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** Status timeline shown on the tracking screen. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuidPk(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: orderStatusEnum("status").notNull(),
    note: text("note"),
    /** User id of the staff member who made the change, null for system/customer. */
    actorId: uuid("actor_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

