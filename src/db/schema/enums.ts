import { pgEnum } from "drizzle-orm/pg-core";

// Keep the string unions exported so services / validators can reuse them
// without importing drizzle internals.

export const USER_ROLES = ["user", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const FRAME_SHAPES = ["rectangle", "round", "oval", "aviator", "square", "half-rim", "cat-eye"] as const;
export const frameShapeEnum = pgEnum("frame_shape", FRAME_SHAPES);
export type FrameShape = (typeof FRAME_SHAPES)[number];

export const PRODUCT_GENDERS = ["men", "women", "unisex", "kids"] as const;
export const productGenderEnum = pgEnum("product_gender", PRODUCT_GENDERS);

export const ORDER_STATUSES = ["pending", "confirmed", "lab", "onTheWay", "ready", "delivered", "cancelled"] as const;
export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_METHODS = ["home", "pickup"] as const;
export const deliveryMethodEnum = pgEnum("delivery_method", DELIVERY_METHODS);

export const PAYMENT_METHODS = ["cod", "wallet", "card"] as const;
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS);

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export const paymentStatusEnum = pgEnum("payment_status", PAYMENT_STATUSES);

export const PRESCRIPTION_STATUSES = ["pending", "verified", "expired", "rejected"] as const;
export const prescriptionStatusEnum = pgEnum("prescription_status", PRESCRIPTION_STATUSES);

export const PRESCRIPTION_SOURCES = ["manual", "upload", "clinic"] as const;
export const prescriptionSourceEnum = pgEnum("prescription_source", PRESCRIPTION_SOURCES);

export const APPOINTMENT_REASONS = ["exam", "rx", "contacts"] as const;
export const appointmentReasonEnum = pgEnum("appointment_reason", APPOINTMENT_REASONS);

export const APPOINTMENT_STATUSES = ["booked", "confirmed", "completed", "cancelled", "noShow"] as const;
export const appointmentStatusEnum = pgEnum("appointment_status", APPOINTMENT_STATUSES);

export const PROMO_TYPES = ["percent", "fixed"] as const;
export const promoTypeEnum = pgEnum("promo_type", PROMO_TYPES);

export const DEVICE_PLATFORMS = ["ios", "android", "web"] as const;
export const devicePlatformEnum = pgEnum("device_platform", DEVICE_PLATFORMS);
