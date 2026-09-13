import { relations } from "drizzle-orm";
import { account, session, user } from "./auth.js";
import { brands, categories, lensAddons, productImages, products, productVariants } from "./catalog.js";
import { appointments, doctors } from "./clinic.js";
import { cartItems, carts, orderEvents, orderItems, orders } from "./commerce.js";
import { addresses, deviceTokens, notifications, prescriptions, reviews, wishlistItems } from "./customer.js";

/**
 * Relational metadata for `db.query.*` (relational queries API).
 * Kept separate from the table definitions so the tables stay readable.
 */

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  addresses: many(addresses),
  prescriptions: many(prescriptions),
  orders: many(orders),
  reviews: many(reviews),
  wishlist: many(wishlistItems),
  appointments: many(appointments),
  deviceTokens: many(deviceTokens),
  notifications: many(notifications),
  cart: one(carts, { fields: [user.id], references: [carts.userId] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const brandRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  variants: many(productVariants),
  images: many(productImages),
  reviews: many(reviews),
}));

export const productVariantRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  images: many(productImages),
}));

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [productImages.variantId], references: [productVariants.id] }),
}));

export const lensAddonRelations = relations(lensAddons, () => ({}));

export const addressRelations = relations(addresses, ({ one }) => ({
  user: one(user, { fields: [addresses.userId], references: [user.id] }),
}));

export const prescriptionRelations = relations(prescriptions, ({ one }) => ({
  user: one(user, { fields: [prescriptions.userId], references: [user.id] }),
}));

export const wishlistRelations = relations(wishlistItems, ({ one }) => ({
  user: one(user, { fields: [wishlistItems.userId], references: [user.id] }),
  product: one(products, { fields: [wishlistItems.productId], references: [products.id] }),
}));

export const reviewRelations = relations(reviews, ({ one }) => ({
  user: one(user, { fields: [reviews.userId], references: [user.id] }),
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
}));

export const cartRelations = relations(carts, ({ one, many }) => ({
  user: one(user, { fields: [carts.userId], references: [user.id] }),
  prescription: one(prescriptions, { fields: [carts.prescriptionId], references: [prescriptions.id] }),
  items: many(cartItems),
}));

export const cartItemRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, { fields: [cartItems.cartId], references: [carts.id] }),
  product: one(products, { fields: [cartItems.productId], references: [products.id] }),
  variant: one(productVariants, { fields: [cartItems.variantId], references: [productVariants.id] }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(user, { fields: [orders.userId], references: [user.id] }),
  items: many(orderItems),
  events: many(orderEvents),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const orderEventRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  actor: one(user, { fields: [orderEvents.actorId], references: [user.id] }),
}));

export const doctorRelations = relations(doctors, ({ many }) => ({
  appointments: many(appointments),
}));

export const appointmentRelations = relations(appointments, ({ one }) => ({
  user: one(user, { fields: [appointments.userId], references: [user.id] }),
  doctor: one(doctors, { fields: [appointments.doctorId], references: [doctors.id] }),
}));

export const deviceTokenRelations = relations(deviceTokens, ({ one }) => ({
  user: one(user, { fields: [deviceTokens.userId], references: [user.id] }),
}));

export const notificationRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] }),
}));
