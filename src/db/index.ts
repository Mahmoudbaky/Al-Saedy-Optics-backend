import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env, isProd } from "../config/env.js";
import { createLogger } from "../config/logger.js";
import * as schema from "./schema/index.js";

const log = createLogger("db");

/**
 * node-postgres pool against the *pooled* Neon endpoint (PgBouncer).
 * A small pool is enough: Neon's pooler multiplexes on its side, and on
 * serverless hosts each instance gets its own pool anyway.
 */
export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: isProd ? 5 : 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err) => log.error({ err }, "Unexpected idle client error"));

export const db = drizzle({
  client: pool,
  schema,
  casing: "snake_case",
  logger: env.LOG_LEVEL === "trace" ? { logQuery: (q, p) => log.trace({ params: p }, q) } : false,
});

export type Database = typeof db;
/** Transaction handle type – accepted by repositories so they can run inside `db.transaction`. */
export type DbExecutor = Database | Parameters<Parameters<Database["transaction"]>[0]>[0];

/** Cheap connectivity probe used by /health and at boot. */
export async function pingDatabase(): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch (err) {
    log.error({ err }, "Database ping failed");
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
  log.info("Database pool closed");
}

export { schema };
