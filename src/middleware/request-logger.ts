import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { logger } from "../config/logger.js";

/**
 * Per-request logging with correlation ids.
 * - honours an incoming `x-request-id` (from Vercel / a proxy) or mints one
 * - echoes it back in the response so mobile bug reports can be traced
 * - `req.log` is a child logger carrying the id for use in handlers/services
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const id = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  autoLogging: {
    ignore: (req) => req.url === "/health" || req.url === "/api/health" || req.url?.startsWith("/docs") === true,
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, responseTime) => `${req.method} ${req.url} → ${res.statusCode} (${responseTime}ms)`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
