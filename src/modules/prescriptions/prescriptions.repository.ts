import { and, count, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { orders, prescriptions } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";

export type PrescriptionRow = typeof prescriptions.$inferSelect;
export type NewPrescription = typeof prescriptions.$inferInsert;

export const prescriptionsRepository = {
  listByUser: (userId: string, ex: DbExecutor = db) =>
    ex.query.prescriptions.findMany({ where: eq(prescriptions.userId, userId), orderBy: desc(prescriptions.createdAt) }),
  findById: (id: string, ex: DbExecutor = db) => ex.query.prescriptions.findFirst({ where: eq(prescriptions.id, id) }),
  findOwned: (userId: string, id: string, ex: DbExecutor = db) =>
    ex.query.prescriptions.findFirst({ where: and(eq(prescriptions.id, id), eq(prescriptions.userId, userId)) }),
  findByIds: (ids: string[], ex: DbExecutor = db) =>
    ids.length ? ex.query.prescriptions.findMany({ where: inArray(prescriptions.id, ids) }) : Promise.resolve([]),
  /** Open orders (not yet in the lab) whose checkout snapshot references one of these prescriptions. */
  async waitingOrders(ids: string[], ex: DbExecutor = db): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const rows = await ex
      .select({ rxId: sql<string>`${orders.prescription}->>'id'`, number: orders.number })
      .from(orders)
      .where(and(inArray(sql`${orders.prescription}->>'id'`, ids), inArray(orders.status, ["pending", "confirmed"])));
    return new Map(rows.map((r) => [r.rxId, r.number]));
  },
  async list(filters: SQL[], page: PaginationQuery, ex: DbExecutor = db) {
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [total]] = await Promise.all([
      ex.query.prescriptions.findMany({ where, orderBy: desc(prescriptions.createdAt), limit: page.limit, offset: offsetOf(page), with: { user: { columns: { id: true, name: true, email: true, phone: true } } } }),
      ex.select({ n: count() }).from(prescriptions).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },
  async create(data: NewPrescription, ex: DbExecutor = db) {
    const [row] = await ex.insert(prescriptions).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewPrescription>, ex: DbExecutor = db) {
    const [row] = await ex.update(prescriptions).set(data).where(eq(prescriptions.id, id)).returning();
    return row ?? null;
  },
  async delete(id: string, ex: DbExecutor = db) {
    const [row] = await ex.delete(prescriptions).where(eq(prescriptions.id, id)).returning({ id: prescriptions.id });
    return row ?? null;
  },
};
