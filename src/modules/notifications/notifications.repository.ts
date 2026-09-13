import { and, count, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { deviceTokens, notifications } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export const notificationsRepository = {
  async list(userId: string, page: PaginationQuery, ex: DbExecutor = db) {
    const where = eq(notifications.userId, userId);
    const [rows, [total], [unread]] = await Promise.all([
      ex.query.notifications.findMany({ where, orderBy: desc(notifications.createdAt), limit: page.limit, offset: offsetOf(page) }),
      ex.select({ n: count() }).from(notifications).where(where),
      ex.select({ n: count() }).from(notifications).where(and(where, isNull(notifications.readAt))),
    ]);
    return { rows, total: total?.n ?? 0, unread: unread?.n ?? 0 };
  },
  async unreadCount(userId: string, ex: DbExecutor = db) {
    const [row] = await ex.select({ n: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row?.n ?? 0;
  },
  async insert(data: NewNotification, ex: DbExecutor = db) {
    const [row] = await ex.insert(notifications).values(data).returning();
    return row!;
  },
  markRead: (userId: string, ids: string[] | "all", ex: DbExecutor = db) =>
    ex
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt), ids === "all" ? undefined : inArray(notifications.id, ids))),

  // ---- device tokens ------------------------------------------------------
  upsertToken: (userId: string, token: string, platform: "ios" | "android" | "web", ex: DbExecutor = db) =>
    ex
      .insert(deviceTokens)
      .values({ userId, token, platform })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId, platform, lastSeenAt: new Date() } }),
  deleteToken: (userId: string, token: string, ex: DbExecutor = db) =>
    ex.delete(deviceTokens).where(and(eq(deviceTokens.userId, userId), eq(deviceTokens.token, token))),
  deleteTokens: (tokens: string[], ex: DbExecutor = db) => (tokens.length ? ex.delete(deviceTokens).where(inArray(deviceTokens.token, tokens)) : Promise.resolve()),
  tokensForUser: async (userId: string, ex: DbExecutor = db) =>
    (await ex.query.deviceTokens.findMany({ where: eq(deviceTokens.userId, userId), columns: { token: true } })).map((r) => r.token),
};
