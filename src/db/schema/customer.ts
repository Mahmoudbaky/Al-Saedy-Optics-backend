import { boolean, date, index, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./_shared.js";
import { user } from "./auth.js";
import { products } from "./catalog.js";
import { devicePlatformEnum, prescriptionSourceEnum, prescriptionStatusEnum } from "./enums.js";

export const addresses = pgTable(
  "addresses",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** e.g. "Home", "Work" */
    label: text("label"),
    recipientName: text("recipient_name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    /** District / neighbourhood, e.g. "Karrada" */
    area: text("area").notNull(),
    street: text("street"),
    building: text("building"),
    /** Free text landmark / delivery notes */
    notes: text("notes"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("addresses_user_idx").on(t.userId)],
);

/**
 * Eyeglass prescription. Values are stored as text because they carry sign and
 * precision exactly as written on the paper ("-1.25", "+0.50", "180").
 */
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Display label, e.g. doctor name. */
    label: text("label"),
    doctorName: text("doctor_name"),
    issuedOn: date("issued_on"),
    expiresOn: date("expires_on"),
    source: prescriptionSourceEnum("source").notNull().default("manual"),
    status: prescriptionStatusEnum("status").notNull().default("pending"),
    // Right eye (oculus dexter)
    odSph: text("od_sph"),
    odCyl: text("od_cyl"),
    odAxis: text("od_axis"),
    // Left eye (oculus sinister)
    osSph: text("os_sph"),
    osCyl: text("os_cyl"),
    osAxis: text("os_axis"),
    /** Pupillary distance in mm */
    pd: text("pd"),
    /** Reading addition */
    addPower: text("add_power"),
    /** Photo/scan of the paper prescription, when uploaded. */
    imageUrl: text("image_url"),
    /** Admin note when verifying / rejecting */
    reviewNote: text("review_note"),
    ...timestamps,
  },
  (t) => [index("prescriptions_user_idx").on(t.userId)],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamps.createdAt,
  },
  (t) => [uniqueIndex("wishlist_user_product_uq").on(t.userId, t.productId)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    rating: smallint("rating").notNull(),
    comment: text("comment"),
    /** Hidden by admin (spam / abuse) */
    isVisible: boolean("is_visible").notNull().default(true),
    ...timestamps,
  },
  (t) => [uniqueIndex("reviews_user_product_uq").on(t.userId, t.productId), index("reviews_product_idx").on(t.productId)],
);

/** Expo push tokens so the backend can notify about order / appointment updates. */
export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: devicePlatformEnum("platform").notNull(),
    lastSeenAt: timestamps.createdAt,
    createdAt: timestamps.createdAt,
  },
  (t) => [index("device_tokens_user_idx").on(t.userId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    titleAr: text("title_ar").notNull(),
    titleEn: text("title_en").notNull(),
    bodyAr: text("body_ar").notNull(),
    bodyEn: text("body_en").notNull(),
    /** Deep-link target inside the app, e.g. "/orders/10428" */
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);
