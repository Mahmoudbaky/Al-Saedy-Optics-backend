import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { logger } from "../config/logger.js";

/**
 * Applies pending SQL migrations from ./drizzle.
 * Uses the unpooled Neon URL – migrations must not run through PgBouncer.
 */
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  logger.fatal("DATABASE_URL_UNPOOLED or DATABASE_URL is required");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url, max: 1 });
const db = drizzle({ client: pool, casing: "snake_case" });

try {
  logger.info("Running migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  logger.info("Migrations applied");
} catch (err) {
  logger.fatal({ err }, "Migration failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
