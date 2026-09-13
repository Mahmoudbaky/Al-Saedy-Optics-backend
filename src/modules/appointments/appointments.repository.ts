import { and, asc, count, desc, eq, gte, inArray, lt, type SQL } from "drizzle-orm";
import { db, type DbExecutor } from "../../db/index.js";
import { appointments, doctors } from "../../db/schema/index.js";
import { offsetOf, type PaginationQuery } from "../../lib/pagination.js";

export type DoctorRow = typeof doctors.$inferSelect;
export type NewDoctor = typeof doctors.$inferInsert;
export type AppointmentRow = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

const withDoctor = { doctor: true, user: { columns: { id: true, name: true, email: true, phone: true, locale: true } } } as const;
export type AppointmentWithDoctor = NonNullable<Awaited<ReturnType<typeof appointmentsRepository.findById>>>;

const LIVE = ["booked", "confirmed"] as const;

export const appointmentsRepository = {
  // ---- doctors ----------------------------------------------------------------
  listDoctors: (includeInactive: boolean, ex: DbExecutor = db) =>
    ex.query.doctors.findMany({ where: includeInactive ? undefined : eq(doctors.isActive, true), orderBy: asc(doctors.createdAt) }),
  findDoctor: (id: string, ex: DbExecutor = db) => ex.query.doctors.findFirst({ where: eq(doctors.id, id) }),
  firstActiveDoctor: (ex: DbExecutor = db) => ex.query.doctors.findFirst({ where: eq(doctors.isActive, true), orderBy: asc(doctors.createdAt) }),
  async createDoctor(data: NewDoctor, ex: DbExecutor = db) {
    const [row] = await ex.insert(doctors).values(data).returning();
    return row!;
  },
  async updateDoctor(id: string, data: Partial<NewDoctor>, ex: DbExecutor = db) {
    const [row] = await ex.update(doctors).set(data).where(eq(doctors.id, id)).returning();
    return row ?? null;
  },

  // ---- appointments ----------------------------------------------------------
  findById: (id: string, ex: DbExecutor = db) => ex.query.appointments.findFirst({ where: eq(appointments.id, id), with: withDoctor }),
  findOwned: (userId: string, id: string, ex: DbExecutor = db) =>
    ex.query.appointments.findFirst({ where: and(eq(appointments.id, id), eq(appointments.userId, userId)), with: withDoctor }),
  listByUser: (userId: string, ex: DbExecutor = db) =>
    ex.query.appointments.findMany({ where: eq(appointments.userId, userId), with: withDoctor, orderBy: desc(appointments.scheduledAt) }),

  /** Start times already taken for a doctor within [from, to). */
  async takenSlots(doctorId: string, from: Date, to: Date, ex: DbExecutor = db) {
    const rows = await ex.query.appointments.findMany({
      where: and(eq(appointments.doctorId, doctorId), inArray(appointments.status, [...LIVE]), gte(appointments.scheduledAt, from), lt(appointments.scheduledAt, to)),
      columns: { scheduledAt: true },
    });
    return new Set(rows.map((r) => r.scheduledAt.getTime()));
  },

  async list(filters: SQL[], page: PaginationQuery, ex: DbExecutor = db) {
    const where = filters.length ? and(...filters) : undefined;
    const [rows, [total]] = await Promise.all([
      ex.query.appointments.findMany({ where, with: withDoctor, orderBy: asc(appointments.scheduledAt), limit: page.limit, offset: offsetOf(page) }),
      ex.select({ n: count() }).from(appointments).where(where),
    ]);
    return { rows, total: total?.n ?? 0 };
  },

  async create(data: NewAppointment, ex: DbExecutor = db) {
    const [row] = await ex.insert(appointments).values(data).returning();
    return row!;
  },
  async update(id: string, data: Partial<NewAppointment>, ex: DbExecutor = db) {
    const [row] = await ex.update(appointments).set(data).where(eq(appointments.id, id)).returning();
    return row ?? null;
  },
  async countUpcoming(ex: DbExecutor = db) {
    const [row] = await ex
      .select({ n: count() })
      .from(appointments)
      .where(and(inArray(appointments.status, [...LIVE]), gte(appointments.scheduledAt, new Date())));
    return row?.n ?? 0;
  },
};
