import { and, asc, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { cartItems, carts, productImages, productVariants } from "../../db/schema/index.js";

export type CartRow = typeof carts.$inferSelect;
export type NewCartItem = typeof cartItems.$inferInsert;

const cartWith = {
  prescription: true,
  items: {
    orderBy: [asc(cartItems.createdAt)],
    with: {
      variant: true,
      product: {
        with: {
          category: true,
          brand: true,
          variants: { orderBy: [asc(productVariants.sortOrder)] },
          images: { orderBy: [asc(productImages.sortOrder)] },
        },
      },
    },
  },
} satisfies NonNullable<Parameters<typeof db.query.carts.findFirst>[0]>["with"];

export type CartWithItems = NonNullable<Awaited<ReturnType<typeof cartRepository.findByUser>>>;
export type CartItemWithProduct = CartWithItems["items"][number];

export const cartRepository = {
  findByUser: (userId: string, ex: DbExecutor = db) => ex.query.carts.findFirst({ where: eq(carts.userId, userId), with: cartWith }),

  /** Idempotent create-or-get of the user's single cart. */
  async getOrCreate(userId: string, ex: DbExecutor = db) {
    const existing = await this.findByUser(userId, ex);
    if (existing) return existing;
    await ex.insert(carts).values({ userId }).onConflictDoNothing();
    return (await this.findByUser(userId, ex))!;
  },

  update: (cartId: string, data: Partial<CartRow>, ex: DbExecutor = db) => ex.update(carts).set(data).where(eq(carts.id, cartId)),

  /** Inserts a line or bumps the quantity of an identical one (same variant + add-ons + label). */
  async upsertItem(item: NewCartItem, ex: DbExecutor = db) {
    const [row] = await ex
      .insert(cartItems)
      .values(item)
      .onConflictDoUpdate({
        target: [cartItems.cartId, cartItems.variantId, cartItems.addonIds, cartItems.variantLabel],
        set: { quantity: sql`${cartItems.quantity} + ${item.quantity ?? 1}` },
      })
      .returning();
    return row!;
  },

  findItem: (cartId: string, itemId: string, ex: DbExecutor = db) =>
    ex.query.cartItems.findFirst({ where: and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)) }),

  setItemQuantity: (itemId: string, quantity: number, ex: DbExecutor = db) =>
    ex.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId)),

  deleteItem: (itemId: string, ex: DbExecutor = db) => ex.delete(cartItems).where(eq(cartItems.id, itemId)),

  clear: (cartId: string, ex: DbExecutor = db) =>
    Promise.all([
      ex.delete(cartItems).where(eq(cartItems.cartId, cartId)),
      ex.update(carts).set({ promoCode: null, prescriptionId: null }).where(eq(carts.id, cartId)),
    ]),
};
