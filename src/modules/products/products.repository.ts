import { and, asc, count, desc, eq, exists, gt, gte, ilike, inArray, isNotNull, lte, ne, notExists, or, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { brands, categories, productImages, products, productVariants } from "../../db/schema/index.js";
import { offsetOf } from "../../lib/pagination.js";
import type { AdminListProductsQuery, ListProductsQuery } from "./products.schema.js";

export type ProductRow = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type VariantRow = typeof productVariants.$inferSelect;
export type NewVariant = typeof productVariants.$inferInsert;
export type ImageRow = typeof productImages.$inferSelect;
export type NewImage = typeof productImages.$inferInsert;

/** Relations loaded for every product read. */
const withRelations = {
  category: true,
  brand: true,
  variants: { orderBy: [asc(productVariants.sortOrder), asc(productVariants.createdAt)] },
  images: { orderBy: [asc(productImages.sortOrder), asc(productImages.createdAt)] },
} satisfies NonNullable<Parameters<typeof db.query.products.findFirst>[0]>["with"];

export type ProductWithRelations = NonNullable<Awaited<ReturnType<typeof productsRepository.findById>>>;

function buildFilters(q: Partial<AdminListProductsQuery>, opts: { includeInactive: boolean }): SQL[] {
  const filters: SQL[] = [];
  if (!opts.includeInactive) filters.push(eq(products.isActive, true));
  if (q.ids?.length) filters.push(inArray(products.id, q.ids));
  if (q.category) {
    filters.push(inArray(products.categoryId, db.select({ id: categories.id }).from(categories).where(eq(categories.slug, q.category))));
  }
  if (q.brand) {
    filters.push(inArray(products.brandId, db.select({ id: brands.id }).from(brands).where(eq(brands.slug, q.brand))));
  }
  if (q.shape) filters.push(eq(products.shape, q.shape));
  if (q.gender) filters.push(eq(products.gender, q.gender));
  if (q.minPrice !== undefined) filters.push(gte(products.price, q.minPrice));
  if (q.maxPrice !== undefined) filters.push(lte(products.price, q.maxPrice));
  if (q.bestSeller !== undefined) filters.push(eq(products.isBestSeller, q.bestSeller));
  if (q.onSale) filters.push(and(isNotNull(products.compareAtPrice), gt(products.compareAtPrice, products.price))!);
  if (q.search) {
    const term = `%${q.search.replace(/[%_]/g, "\\$&")}%`;
    filters.push(or(ilike(products.nameEn, term), ilike(products.nameAr, term), ilike(products.code, term))!);
  }
  const inStockSub = db
    .select({ one: sql`1` })
    .from(productVariants)
    .where(and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true), gt(productVariants.stock, 0)));
  if (q.inStock === true) filters.push(exists(inStockSub));
  if (q.inStock === false) filters.push(notExists(inStockSub));
  if (q.lowStock !== undefined) {
    filters.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(productVariants)
          .where(and(eq(productVariants.productId, products.id), eq(productVariants.isActive, true), lte(productVariants.stock, q.lowStock))),
      ),
    );
  }
  return filters;
}

function orderBy(sort: ListProductsQuery["sort"]) {
  switch (sort) {
    case "priceAsc":
      return [asc(products.price), desc(products.createdAt)];
    case "priceDesc":
      return [desc(products.price), desc(products.createdAt)];
    case "bestSelling":
      return [desc(products.isBestSeller), desc(products.soldCount), desc(products.createdAt)];
    case "rating":
      return [desc(products.ratingAvg), desc(products.ratingCount), desc(products.createdAt)];
    case "name":
      return [asc(products.nameEn)];
    case "newest":
    default:
      return [desc(products.createdAt)];
  }
}

export const productsRepository = {
  async list(q: AdminListProductsQuery, opts: { includeInactive: boolean }, ex: DbExecutor = db) {
    const where = and(...buildFilters(q, opts));
    const [rows, [total]] = await Promise.all([
      ex.query.products.findMany({ where, with: withRelations, orderBy: orderBy(q.sort), limit: q.limit, offset: offsetOf(q) }),
      ex.select({ n: count() }).from(products).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },

  findById(id: string, ex: DbExecutor = db) {
    return ex.query.products.findFirst({ where: eq(products.id, id), with: withRelations });
  },

  findBySlug(slug: string, ex: DbExecutor = db) {
    return ex.query.products.findFirst({ where: eq(products.slug, slug), with: withRelations });
  },

  findManyByIds(ids: string[], ex: DbExecutor = db) {
    if (ids.length === 0) return Promise.resolve([]);
    return ex.query.products.findMany({ where: inArray(products.id, ids), with: withRelations });
  },

  /** Active products in the same category, excluding the product itself. */
  related(productId: string, categoryId: string, limit: number, ex: DbExecutor = db) {
    return ex.query.products.findMany({
      where: and(eq(products.categoryId, categoryId), ne(products.id, productId), eq(products.isActive, true)),
      with: withRelations,
      orderBy: [desc(products.isBestSeller), desc(products.soldCount)],
      limit,
    });
  },

  slugExists: async (slug: string, ex: DbExecutor = db) =>
    Boolean(await ex.query.products.findFirst({ where: eq(products.slug, slug), columns: { id: true } })),

  async create(data: NewProduct, ex: DbExecutor = db) {
    const [row] = await ex.insert(products).values(data).returning();
    return row!;
  },

  async update(id: string, data: Partial<NewProduct>, ex: DbExecutor = db) {
    const [row] = await ex.update(products).set(data).where(eq(products.id, id)).returning();
    return row ?? null;
  },

  async updateMany(ids: string[], data: Partial<NewProduct>, ex: DbExecutor = db) {
    const rows = await ex.update(products).set(data).where(inArray(products.id, ids)).returning({ id: products.id });
    return rows.length;
  },

  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(products).where(eq(products.id, id)).returning({ id: products.id });
    return row ?? null;
  },

  async deleteMany(ids: string[], ex: DbExecutor = db) {
    const rows = await ex.delete(products).where(inArray(products.id, ids)).returning({ id: products.id });
    return rows.length;
  },

  // ---- variants -----------------------------------------------------------
  async insertVariants(rows: NewVariant[], ex: DbExecutor = db) {
    if (rows.length === 0) return [];
    return ex.insert(productVariants).values(rows).returning();
  },
  findVariant(productId: string, variantId: string, ex: DbExecutor = db) {
    return ex.query.productVariants.findFirst({ where: and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)) });
  },
  async updateVariant(variantId: string, data: Partial<NewVariant>, ex: DbExecutor = db) {
    const [row] = await ex.update(productVariants).set(data).where(eq(productVariants.id, variantId)).returning();
    return row ?? null;
  },
  async adjustVariantStock(variantId: string, delta: number, ex: DbExecutor = db) {
    const [row] = await ex
      .update(productVariants)
      .set({ stock: sql`greatest(${productVariants.stock} + ${delta}, 0)` })
      .where(eq(productVariants.id, variantId))
      .returning();
    return row ?? null;
  },
  async deleteVariant(variantId: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(productVariants).where(eq(productVariants.id, variantId)).returning({ id: productVariants.id });
    return row ?? null;
  },
  async countVariants(productId: string, ex: DbExecutor = db) {
    const [row] = await ex.select({ n: count() }).from(productVariants).where(eq(productVariants.productId, productId));
    return row?.n ?? 0;
  },

  // ---- images -------------------------------------------------------------
  async insertImages(rows: NewImage[], ex: DbExecutor = db) {
    if (rows.length === 0) return [];
    return ex.insert(productImages).values(rows).returning();
  },
  async deleteImage(productId: string, imageId: string, ex: DbExecutor = db) {
    const [row] = await ex
      .delete(productImages)
      .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
      .returning({ id: productImages.id, url: productImages.url });
    return row ?? null;
  },
  async reorderImages(productId: string, imageIds: string[], ex: DbExecutor = db) {
    await Promise.all(
      imageIds.map((id, i) =>
        ex.update(productImages).set({ sortOrder: i }).where(and(eq(productImages.id, id), eq(productImages.productId, productId))),
      ),
    );
  },

  // ---- stats ---------------------------------------------------------------
  incrementSold(productId: string, qty: number, ex: DbExecutor = db) {
    return ex.update(products).set({ soldCount: sql`${products.soldCount} + ${qty}` }).where(eq(products.id, productId));
  },
  setRating(productId: string, avgX100: number, ratingCount: number, ex: DbExecutor = db) {
    return ex.update(products).set({ ratingAvg: avgX100, ratingCount }).where(eq(products.id, productId));
  },
};
