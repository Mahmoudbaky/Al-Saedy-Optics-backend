import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside the app, so it reads env vars directly.
// Use the *unpooled* Neon URL for migrations (see docs/neon-connection-pooling).
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (or DATABASE_URL_UNPOOLED) is required");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url },
  casing: "snake_case",
  strict: true,
  verbose: true,
});
