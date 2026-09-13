import { count, desc, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { promoCodes } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";

export type PromoCodeRow = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;

export const promoCodesRepository = {
  findByCode: (code: string, ex: DbExecutor = db) => ex.query.promoCodes.findFirst({ where: eq(promoCodes.code, code) }),
  findById: (id: string, ex: DbExecutor = db) => ex.query.promoCodes.findFirst({ where: eq(promoCodes.id, id) }),
  async list(page: PaginationQuery, active: boolean | undefined, ex: DbExecutor = db) {
    const where = active === undefined ? undefined : eq(promoCodes.isActive, active);
    const [rows, [total]] = await Promise.all([
      ex.query.promoCodes.findMany({ where, orderBy: desc(promoCodes.createdAt), limit: page.limit, offset: offsetOf(page) }),
      ex.select({ n: count() }).from(promoCodes).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },
  async create(data: NewPromoCode, ex: DbExecutor = db) {
    const [row] = await ex.insert(promoCodes).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewPromoCode>, ex: DbExecutor = db) {
    const [row] = await ex.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return row ?? null;
  },
  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(promoCodes).where(eq(promoCodes.id, id)).returning({ id: promoCodes.id });
    return row ?? null;
  },
  incrementUsed: (code: string, by: number, ex: DbExecutor = db) =>
    ex.update(promoCodes).set({ usedCount: sql`greatest(${promoCodes.usedCount} + ${by}, 0)` }).where(eq(promoCodes.code, code)),
};
