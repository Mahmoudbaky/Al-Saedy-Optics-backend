import { asc, count, eq } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { brands, products } from "../../db/schema/index.js";

export type BrandRow = typeof brands.$inferSelect;
export type NewBrand = typeof brands.$inferInsert;

export const brandsRepository = {
  list(opts: { includeInactive?: boolean } = {}, ex: DbExecutor = db) {
    return ex.query.brands.findMany({
      where: opts.includeInactive ? undefined : eq(brands.isActive, true),
      orderBy: asc(brands.nameEn),
    });
  },
  findById: (id: string, ex: DbExecutor = db) => ex.query.brands.findFirst({ where: eq(brands.id, id) }),
  findBySlug: (slug: string, ex: DbExecutor = db) => ex.query.brands.findFirst({ where: eq(brands.slug, slug) }),
  async create(data: NewBrand, ex: DbExecutor = db) {
    const [row] = await ex.insert(brands).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewBrand>, ex: DbExecutor = db) {
    const [row] = await ex.update(brands).set(data).where(eq(brands.id, id)).returning();
    return row ?? null;
  },
  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(brands).where(eq(brands.id, id)).returning({ id: brands.id });
    return row ?? null;
  },
  async countProducts(id: string, ex: DbExecutor = db) {
    const [row] = await ex.select({ n: count() }).from(products).where(eq(products.brandId, id));
    return row?.n ?? 0;
  },
};
