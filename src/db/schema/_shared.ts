import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

/** `id uuid primary key default gen_random_uuid()` */
export const uuidPk = () => uuid("id").primaryKey().defaultRandom();

/** `created_at` / `updated_at` pair used on every domain table. */
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Postgres `now()` for use inside raw `sql` fragments. */
export const now = sql`now()`;
