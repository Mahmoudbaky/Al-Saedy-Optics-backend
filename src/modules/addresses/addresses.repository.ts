import { and, desc, eq } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { addresses } from "../../db/schema/index.js";

export type AddressRow = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

export const addressesRepository = {
  listByUser: (userId: string, ex: DbExecutor = db) =>
    ex.query.addresses.findMany({ where: eq(addresses.userId, userId), orderBy: [desc(addresses.isDefault), desc(addresses.createdAt)] }),
  findOwned: (userId: string, id: string, ex: DbExecutor = db) =>
    ex.query.addresses.findFirst({ where: and(eq(addresses.id, id), eq(addresses.userId, userId)) }),
  findDefault: (userId: string, ex: DbExecutor = db) =>
    ex.query.addresses.findFirst({ where: and(eq(addresses.userId, userId), eq(addresses.isDefault, true)) }),
  clearDefault: (userId: string, ex: DbExecutor = db) =>
    ex.update(addresses).set({ isDefault: false }).where(and(eq(addresses.userId, userId), eq(addresses.isDefault, true))),
  async create(data: NewAddress, ex: DbExecutor = db) {
    const [row] = await ex.insert(addresses).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewAddress>, ex: DbExecutor = db) {
    const [row] = await ex.update(addresses).set(data).where(eq(addresses.id, id)).returning();
    return row ?? null;
  },
  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(addresses).where(eq(addresses.id, id)).returning({ id: addresses.id });
    return row ?? null;
  },
};
