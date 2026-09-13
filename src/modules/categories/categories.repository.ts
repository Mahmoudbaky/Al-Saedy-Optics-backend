import { and, asc, count, eq, sql } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { categories, products } from "../../db/schema/index.js";

export type CategoryRow = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

/** Pure data-access for categories – no business rules here. */
export const categoriesRepository = {
  async list(opts: { includeInactive?: boolean } = {}, ex: DbExecutor = db) {
    const rows = await ex
      .select({
        category: categories,
        productCount: sql<number>`count(${products.id}) filter (where ${products.isActive})`.mapWith(Number),
      })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .where(opts.includeInactive ? undefined : eq(categories.isActive, true))
      .groupBy(categories.id)
      .orderBy(asc(categories.sortOrder), asc(categories.nameEn));
    return rows.map((r) => ({ ...r.category, productCount: r.productCount }));
  },

  findById(id: string, ex: DbExecutor = db) {
    return ex.query.categories.findFirst({ where: eq(categories.id, id) });
  },

  findBySlug(slug: string, ex: DbExecutor = db) {
    return ex.query.categories.findFirst({ where: eq(categories.slug, slug) });
  },

  async create(data: NewCategory, ex: DbExecutor = db) {
    const [row] = await ex.insert(categories).values(data).returning();
    return row!;
  },

  async update(id: string, data: Partial<NewCategory>, ex: DbExecutor = db) {
    const [row] = await ex.update(categories).set(data).where(eq(categories.id, id)).returning();
    return row ?? null;
  },

  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id });
    return row ?? null;
  },

  async countProducts(id: string, ex: DbExecutor = db) {
    const [row] = await ex.select({ n: count() }).from(products).where(and(eq(products.categoryId, id)));
    return row?.n ?? 0;
  },
};
