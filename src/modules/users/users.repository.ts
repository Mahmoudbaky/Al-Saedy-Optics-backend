import { and, asc, count, desc, eq, gte, ilike, inArray, max, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { appointments, orders, prescriptions, user, wishlistItems } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";
import type { AdminListUsersQuery } from "./users.schema.js";

export type UserRow = typeof user.$inferSelect;

export const usersRepository = {
  findById: (id: string, ex: DbExecutor = db) => ex.query.user.findFirst({ where: eq(user.id, id) }),

  async profileStats(userId: string, ex: DbExecutor = db) {
    const [[o], [p], [w], [a]] = await Promise.all([
      ex.select({ n: count() }).from(orders).where(eq(orders.userId, userId)),
      ex.select({ n: count() }).from(prescriptions).where(eq(prescriptions.userId, userId)),
      ex.select({ n: count() }).from(wishlistItems).where(eq(wishlistItems.userId, userId)),
      ex
        .select({ at: appointments.scheduledAt })
        .from(appointments)
        .where(and(eq(appointments.userId, userId), inArray(appointments.status, ["booked", "confirmed"]), gte(appointments.scheduledAt, new Date())))
        .orderBy(asc(appointments.scheduledAt))
        .limit(1),
    ]);
    return { orders: o?.n ?? 0, prescriptions: p?.n ?? 0, wishlist: w?.n ?? 0, nextAppointmentAt: a?.at ?? null };
  },

  async list(q: AdminListUsersQuery, ex: DbExecutor = db) {
    const filters: SQL[] = [];
    if (q.search) {
      const term = `%${q.search}%`;
      filters.push(or(ilike(user.email, term), ilike(user.name, term), ilike(user.phone, term))!);
    }
    if (q.role) filters.push(q.role === "user" ? or(eq(user.role, "user"), sql`${user.role} is null`)! : eq(user.role, q.role));
    if (q.banned !== undefined) filters.push(q.banned ? eq(user.banned, true) : or(eq(user.banned, false), sql`${user.banned} is null`)!);
    const where = filters.length ? and(...filters) : undefined;

    const [rows, [total]] = await Promise.all([
      ex
        .select({
          user,
          orders: count(orders.id),
          totalSpent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'delivered'), 0)`.mapWith(Number),
          lastOrderAt: max(orders.createdAt),
        })
        .from(user)
        .leftJoin(orders, eq(orders.userId, user.id))
        .where(where)
        .groupBy(user.id)
        .orderBy(desc(user.createdAt))
        .limit(q.limit)
        .offset(offsetOf(q as PaginationQuery)),
      ex.select({ n: count() }).from(user).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },

  async orderStats(userId: string, ex: DbExecutor = db) {
    const [row] = await ex
      .select({ orders: count(), totalSpent: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} = 'delivered'), 0)`.mapWith(Number), lastOrderAt: max(orders.createdAt) })
      .from(orders)
      .where(eq(orders.userId, userId));
    return { orders: row?.orders ?? 0, totalSpent: row?.totalSpent ?? 0, lastOrderAt: row?.lastOrderAt ?? null };
  },

  async countCustomers(since: Date | null, ex: DbExecutor = db) {
    const [row] = await ex
      .select({ n: count() })
      .from(user)
      .where(and(or(eq(user.role, "user"), sql`${user.role} is null`), since ? gte(user.createdAt, since) : undefined));
    return row?.n ?? 0;
  },
};

