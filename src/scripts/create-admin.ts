/**
 * Creates (or promotes) an admin account for the admin panel.
 *
 *   ADMIN_EMAIL=owner@example.com ADMIN_PASSWORD='…' ADMIN_NAME='Owner' pnpm admin:create
 */
import { eq } from "drizzle-orm";
import { logger } from "../config/logger.js";
import { closeDatabase, db } from "../db/index.js";
import { user } from "../db/schema/index.js";
import { auth } from "../lib/auth.js";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const name = process.env.ADMIN_NAME ?? "Admin";

if (!email || !password) {
  logger.fatal("ADMIN_EMAIL and ADMIN_PASSWORD are required");
  process.exit(1);
}

try {
  let existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (!existing) {
    await auth.api.signUpEmail({ body: { email, password, name } });
    existing = await db.query.user.findFirst({ where: eq(user.email, email) });
    logger.info({ email }, "User created");
  }
  await db.update(user).set({ role: "admin", emailVerified: true }).where(eq(user.id, existing!.id));
  logger.info({ email, id: existing!.id }, "User is now an admin");
} catch (err) {
  logger.fatal({ err }, "Failed to create admin");
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
