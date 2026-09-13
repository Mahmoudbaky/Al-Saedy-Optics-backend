import { and, desc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { wishlistItems } from "../../db/schema/index.js";

export const wishlistRepository = {
  productIds: async (userId: string, ex: DbExecutor = db) =>
    (await ex.query.wishlistItems.findMany({ where: eq(wishlistItems.userId, userId), orderBy: desc(wishlistItems.createdAt), columns: { productId: true } })).map(
      (r) => r.productId,
    ),
  add: (userId: string, productId: string, ex: DbExecutor = db) =>
    ex.insert(wishlistItems).values({ userId, productId }).onConflictDoNothing(),
  remove: async (userId: string, productId: string, ex: DbExecutor = db) =>
    (await ex.delete(wishlistItems).where(and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId))).returning({ id: wishlistItems.id })).length > 0,
  has: async (userId: string, productId: string, ex: DbExecutor = db) =>
    Boolean(await ex.query.wishlistItems.findFirst({ where: and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId)), columns: { id: true } })),
  clear: (userId: string, ex: DbExecutor = db) => ex.delete(wishlistItems).where(eq(wishlistItems.userId, userId)),
};
