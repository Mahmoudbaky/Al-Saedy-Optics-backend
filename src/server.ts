import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { closeDatabase, pingDatabase } from "./db/index.js";

const app = createApp();

// On Vercel the platform invokes the exported app per request – no listener needed.
if (!process.env.VERCEL) {
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, docs: `${env.BETTER_AUTH_URL}/docs` }, "🚀 API listening");
    void pingDatabase().then((ok) => (ok ? logger.info("Database reachable") : logger.warn("Database NOT reachable")));
  });

  // Graceful shutdown – let in-flight requests finish, then release the pool.
  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
process.on("unhandledRejection", (reason) => logger.error({ err: reason }, "Unhandled promise rejection"));
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception");
  process.exit(1);
});

// Vercel's @vercel/node builder invokes the default export as the request handler.
export default app;
