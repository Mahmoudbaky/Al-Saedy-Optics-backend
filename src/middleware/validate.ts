import type { RequestHandler } from "express";
import type { ZodType } from "zod";
import { ValidationError } from "../lib/errors.js";

export interface RequestSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Validates and *replaces* `req.params` / `req.query` / `req.body` with the parsed
 * (coerced, defaulted, stripped) values. Express 5 exposes `req.query` as a getter,
 * so the parsed value is stored on `req.validated` and mirrored where writable.
 */
export const validate =
  (schemas: RequestSchemas): RequestHandler =>
  (req, _res, next) => {
    const issues: { in: string; path: string; message: string }[] = [];
    const out: Record<string, unknown> = {};

    for (const key of ["params", "query", "body"] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (result.success) {
        out[key] = result.data;
      } else {
        for (const i of result.error.issues) {
          issues.push({ in: key, path: i.path.join("."), message: i.message });
        }
      }
    }

    if (issues.length) return next(new ValidationError(issues));

    req.validated = { params: out.params, query: out.query, body: out.body };
    if (out.body !== undefined) req.body = out.body;
    next();
  };

declare module "express-serve-static-core" {
  interface Request {
    validated?: { params?: unknown; query?: unknown; body?: unknown };
  }
}
