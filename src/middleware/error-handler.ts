import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProd } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError } from "../lib/errors.js";
import { asPgError } from "../lib/pg-errors.js";

/** 404 for anything that fell through the routers. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError("Route", `${req.method} ${req.originalUrl}`));
};

const pgErrorMap: Record<string, { status: number; code: string; message: string }> = {
  "23505": { status: 409, code: "ALREADY_EXISTS", message: "A record with the same unique value already exists" },
  "23503": { status: 409, code: "REFERENCE_ERROR", message: "Referenced record does not exist or is still in use" },
  "23502": { status: 400, code: "MISSING_FIELD", message: "A required field is missing" },
  "22P02": { status: 400, code: "INVALID_INPUT", message: "Invalid input syntax" },
};

/**
 * Single place that turns thrown errors into the JSON error envelope.
 * Express 5 forwards rejected promises here automatically.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const log = req.log ?? logger;

  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details: unknown;
  const pgError = asPgError(err);

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    status = 422;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err && typeof err === "object" && "type" in err && err.type === "entity.parse.failed") {
    status = 400;
    code = "INVALID_JSON";
    message = "Request body is not valid JSON";
  } else if (pgError && pgErrorMap[pgError.code]) {
    ({ status, code, message } = pgErrorMap[pgError.code]!);
    details = isProd ? undefined : { constraint: pgError.constraint };
  } else if (err && typeof err === "object" && "status" in err && typeof err.status === "number" && err.status < 500) {
    // e.g. errors thrown by body-parser / cors
    status = err.status;
    code = "BAD_REQUEST";
    message = (err as Error).message;
  }

  if (status >= 500) {
    log.error({ err, status }, "Unhandled error");
  } else {
    log.warn({ code, status, details }, message);
  }

  if (res.headersSent) return;

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      ...(status >= 500 && !isProd ? { stack: (err as Error)?.stack } : {}),
    },
  });
};
