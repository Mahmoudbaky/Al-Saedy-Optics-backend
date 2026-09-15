import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql, sum, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { orderEvents, orderItems, orders, user } from "../../db/schema/index.js";
import type { OrderStatus } from "../../db/schema/enums.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";
import type { AdminListOrdersQuery } from "./orders.schema.js";

export type OrderRow = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type NewOrderItem = typeof orderItems.$inferInsert;

const orderWith = {
  items: { orderBy: [asc(orderItems.id)] },
  events: { orderBy: [asc(orderEvents.createdAt)] },
  user: { columns: { id: true, name: true, email: true, phone: true, locale: true } },
} satisfies NonNullable<Parameters<typeof db.query.orders.findFirst>[0]>["with"];

export type OrderWithRelations = NonNullable<Awaited<ReturnType<typeof ordersRepository.findById>>>;

export const ordersRepository = {
  findById: (id: string, ex: DbExecutor = db) => ex.query.orders.findFirst({ where: eq(orders.id, id), with: orderWith }),
  findOwned: (userId: string, id: string, ex: DbExecutor = db) =>
    ex.query.orders.findFirst({ where: and(eq(orders.id, id), eq(orders.userId, userId)), with: orderWith }),

  async list(filters: SQL[], page: PaginationQuery, ex: DbExecutor = db) {
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [total]] = await Promise.all([
      ex.query.orders.findMany({ where, with: orderWith, orderBy: desc(orders.createdAt), limit: page.limit, offset: offsetOf(page) }),
      ex.select({ n: count() }).from(orders).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },

  adminFilters(q: AdminListOrdersQuery): SQL[] {
    const f: SQL[] = [];
    if (q.status?.length) f.push(q.status.length === 1 ? eq(orders.status, q.status[0]!) : inArray(orders.status, q.status));
    if (q.paymentStatus) f.push(eq(orders.paymentStatus, q.paymentStatus));
    if (q.deliveryMethod) f.push(eq(orders.deliveryMethod, q.deliveryMethod));
    if (q.userId) f.push(eq(orders.userId, q.userId));
    if (q.from) f.push(gte(orders.createdAt, new Date(q.from)));
    if (q.to) f.push(lte(orders.createdAt, new Date(q.to)));
    if (q.search) {
      const term = `%${q.search}%`;
      const byNumber = /^\d+$/.test(q.search) ? eq(orders.number, Number(q.search)) : undefined;
      const byUser = inArray(
        orders.userId,
        db.select({ id: user.id }).from(user).where(or(ilike(user.email, term), ilike(user.name, term), ilike(user.phone, term))),
      );
      f.push(byNumber ? or(byNumber, byUser)! : byUser);
    }
    return f;
  },

  async create(order: NewOrder, items: Omit<NewOrderItem, "orderId">[], ex: DbExecutor = db) {
    const [row] = await ex.insert(orders).values(order).returning();
    await ex.insert(orderItems).values(items.map((i) => ({ ...i, orderId: row!.id })));
    return row!;
  },

  async update(id: string, data: Partial<NewOrder>, ex: DbExecutor = db) {
    const [row] = await ex.update(orders).set(data).where(eq(orders.id, id)).returning();
    return row ?? null;
  },

  addEvent: (orderId: string, status: OrderStatus, note: string | null, actorId: string | null, ex: DbExecutor = db) =>
    ex.insert(orderEvents).values({ orderId, status, note, actorId }),

  // ---- stats (admin dashboard) ------------------------------------------------
  async countByStatus(ex: DbExecutor = db) {
    const rows = await ex.select({ status: orders.status, n: count() }).from(orders).groupBy(orders.status);
    return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>;
  },
  async revenue(since: Date | null, ex: DbExecutor = db) {
    const [row] = await ex
      .select({ total: sum(orders.total), n: count() })
      .from(orders)
      .where(and(eq(orders.status, "delivered"), since ? gte(orders.createdAt, since) : undefined));
    return { total: Number(row?.total ?? 0), orders: row?.n ?? 0 };
  },
  async revenueByDay(days: number, ex: DbExecutor = db) {
    const since = new Date(Date.now() - days * 86_400_000);
    return ex
      .select({ day: sql<string>`to_char(${orders.createdAt}, 'YYYY-MM-DD')`, revenue: sum(orders.total).mapWith(Number), orders: count() })
      .from(orders)
      .where(and(gte(orders.createdAt, since), sql`${orders.status} <> 'cancelled'`))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  },
  async topProducts(limit: number, days: number, ex: DbExecutor = db) {
    const since = new Date(Date.now() - days * 86_400_000);
    return ex
      .select({
        productId: orderItems.productId,
        nameAr: orderItems.nameAr,
        nameEn: orderItems.nameEn,
        quantity: sum(orderItems.quantity).mapWith(Number),
        revenue: sum(orderItems.lineTotal).mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(and(gte(orders.createdAt, since), sql`${orders.status} <> 'cancelled'`))
      .groupBy(orderItems.productId, orderItems.nameAr, orderItems.nameEn)
      .orderBy(desc(sum(orderItems.quantity)))
      .limit(limit);
  },
};
