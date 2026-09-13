import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth, type Session, type SessionUser } from "../lib/auth.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";

declare module "express-serve-static-core" {
  interface Request {
    /** Populated by `attachSession` when the request carries a valid session. */
    session?: Session["session"];
    user?: SessionUser;
  }
}

/**
 * Resolves the Better Auth session (cookie or `Authorization: Bearer`) once per
 * request and attaches it. Never rejects – route-level guards decide what to require.
 */
export const attachSession: RequestHandler = async (req, _res, next) => {
  const result = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (result) {
    req.session = result.session;
    req.user = result.user;
    req.log?.setBindings?.({ userId: result.user.id });
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new UnauthorizedError());
  if (req.user.banned) return next(new ForbiddenError("Your account has been suspended"));
  next();
};

export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role ?? "user")) return next(new ForbiddenError());
    next();
  };

export const requireAdmin = [requireAuth, requireRole("admin")] as const;

/** Type helper for handlers behind `requireAuth` – `req.user` is guaranteed. */
export type AuthedRequest = Request & { user: SessionUser; session: Session["session"] };
