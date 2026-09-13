import pino, { type Logger } from "pino";
import { env, isDev, isTest } from "./env.js";

/**
 * Application-wide structured logger.
 *
 * - JSON lines in production (ingestible by Vercel / Neon log drains, Grafana, etc.)
 * - Pretty printed in development
 * - Sensitive fields are redacted before they ever hit stdout
 */
export const logger: Logger = pino({
  level: env.LOG_LEVEL ?? (isTest ? "silent" : isDev ? "debug" : "info"),
  base: { service: "al-saedy-optics-api", env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      'res.headers["set-cookie"]',
      "*.password",
      "*.otp",
      "*.token",
      "*.secret",
    ],
    censor: "[REDACTED]",
  },
  ...(isDev
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname,service,env" },
        },
      }
    : {}),
});

/** Child logger with a fixed module name, e.g. `createLogger("orders")`. */
export const createLogger = (module: string): Logger => logger.child({ module });
