import compression from "compression";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { toNodeHandler } from "better-auth/node";
import { createRouteHandler } from "uploadthing/express";
import { env, isProd } from "./config/env.js";
import { uploadRouter } from "./config/uploadthing.js";
import { auth } from "./lib/auth.js";
import { ForbiddenError } from "./lib/errors.js";
import { attachSession } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRateLimit } from "./middleware/rate-limit.js";
import { requestLogger } from "./middleware/request-logger.js";
import { apiRouter } from "./modules/index.js";
import { docsRouter } from "./modules/docs/docs.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

/**
 * Builds the Express application. Kept separate from `server.ts` so tests can
 * import the app without binding a port.
 */
export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1); // Vercel / reverse proxies – needed for correct IPs & secure cookies
  app.disable("x-powered-by");

  app.use(requestLogger);
  app.use(helmet({ contentSecurityPolicy: isProd ? undefined : false }));
  app.use(
    cors({
      // Mobile apps send no Origin header → allowed. Browsers must be whitelisted.
      origin: (origin, cb) => {
        if (!origin || env.CORS_ORIGINS.includes(origin)) return cb(null, true);
        cb(new ForbiddenError(`Origin ${origin} is not allowed`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "x-uploadthing-package", "x-uploadthing-version"],
      exposedHeaders: ["X-Request-Id", "set-auth-token"],
      maxAge: 86_400,
    }),
  );
  app.use(compression());

  // Better Auth must see the raw stream – mount BEFORE express.json().
  app.all("/api/auth/*splat", toNodeHandler(auth));

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use(healthRouter);
  app.use(docsRouter);

  app.use(attachSession);

  if (env.UPLOADTHING_TOKEN) {
    app.use("/api/uploadthing", createRouteHandler({ router: uploadRouter, config: { token: env.UPLOADTHING_TOKEN } }));
  }

  app.use("/api/v1", apiRateLimit, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
