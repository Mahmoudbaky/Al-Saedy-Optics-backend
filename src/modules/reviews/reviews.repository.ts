import { and, avg, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { orderItems, orders, reviews } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";

export type ReviewRow = typeof reviews.$inferSelect;

const withUser = { user: { columns: { id: true, name: true, image: true } } } as const;

export const reviewsRepository = {
  async list(filters: SQL[], page: PaginationQuery, ex: DbExecutor = db) {
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [total]] = await Promise.all([
      ex.query.reviews.findMany({ where, with: withUser, orderBy: desc(reviews.createdAt), limit: page.limit, offset: offsetOf(page) }),
      ex.select({ n: count() }).from(reviews).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },

  findByUserAndProduct: (userId: string, productId: string, ex: DbExecutor = db) =>
    ex.query.reviews.findFirst({ where: and(eq(reviews.userId, userId), eq(reviews.productId, productId)), with: withUser }),

  findById: (id: string, ex: DbExecutor = db) => ex.query.reviews.findFirst({ where: eq(reviews.id, id), with: withUser }),

  async upsert(userId: string, productId: string, data: { rating: number; comment: string | null }, ex: DbExecutor = db) {
    const [row] = await ex
      .insert(reviews)
      .values({ userId, productId, ...data })
      .onConflictDoUpdate({ target: [reviews.userId, reviews.productId], set: { ...data, isVisible: true } })
      .returning();
    return row!;
  },

  async setVisible(id: string, isVisible: boolean, ex: DbExecutor = db) {
    const [row] = await ex.update(reviews).set({ isVisible }).where(eq(reviews.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(reviews).where(eq(reviews.id, id)).returning({ id: reviews.id, productId: reviews.productId });
    return row ?? null;
  },

  /** Average / count / per-star distribution of visible reviews. */
  async summary(productId: string, ex: DbExecutor = db) {
    const [agg] = await ex
      .select({ avg: avg(reviews.rating), n: count() })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.isVisible, true)));
    const dist = await ex
      .select({ rating: reviews.rating, n: count() })
      .from(reviews)
      .where(and(eq(reviews.productId, productId), eq(reviews.isVisible, true)))
      .groupBy(reviews.rating);
    return {
      average: agg?.avg ? Number(agg.avg) : 0,
      count: agg?.n ?? 0,
      distribution: Object.fromEntries([5, 4, 3, 2, 1].map((s) => [s, dist.find((d) => d.rating === s)?.n ?? 0])),
    };
  },

  /** Whether the user has a delivered order containing the product (verified purchase). */
  async hasPurchased(userId: string, productId: string, ex: DbExecutor = db) {
    const [row] = await ex
      .select({ one: sql<number>`1` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId), eq(orders.status, "delivered")))
      .limit(1);
    return Boolean(row);
  },
};
