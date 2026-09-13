import { asc, eq, inArray } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { lensAddons } from "../../db/schema/index.js";

export type LensAddonRow = typeof lensAddons.$inferSelect;
export type NewLensAddon = typeof lensAddons.$inferInsert;

export const lensAddonsRepository = {
  list(opts: { includeInactive?: boolean } = {}, ex: DbExecutor = db) {
    return ex.query.lensAddons.findMany({
      where: opts.includeInactive ? undefined : eq(lensAddons.isActive, true),
      orderBy: asc(lensAddons.sortOrder),
    });
  },
  findById: (id: string, ex: DbExecutor = db) => ex.query.lensAddons.findFirst({ where: eq(lensAddons.id, id) }),
  findManyActive(ids: string[], ex: DbExecutor = db) {
    if (ids.length === 0) return Promise.resolve([] as LensAddonRow[]);
    return ex.query.lensAddons.findMany({ where: inArray(lensAddons.id, ids) });
  },
  async create(data: NewLensAddon, ex: DbExecutor = db) {
    const [row] = await ex.insert(lensAddons).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewLensAddon>, ex: DbExecutor = db) {
    const [row] = await ex.update(lensAddons).set(data).where(eq(lensAddons.id, id)).returning();
    return row ?? null;
  },
  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(lensAddons).where(eq(lensAddons.id, id)).returning({ id: lensAddons.id });
    return row ?? null;
  },
};
