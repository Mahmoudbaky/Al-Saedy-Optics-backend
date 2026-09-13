import { Router, type Request, type RequestHandler, type Response } from "express";
import type { z, ZodType } from "zod";
import type { Session, SessionUser } from "./auth.js";
import { isApiReply } from "./http.js";
import { registerRoute, type AuthLevel, type HttpMethod } from "./openapi.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

/**
 * Typed route definition = auth guard + validation + OpenAPI doc + handler,
 * declared once. Handlers receive already-validated, fully typed input and simply
 * return data (or `reply(data, { status, meta })`); the envelope is applied here.
 */
export interface RouteContext<P, Q, B, A extends AuthLevel> {
  params: P;
  query: Q;
  body: B;
  user: A extends "user" | "admin" ? SessionUser : SessionUser | undefined;
  session: A extends "user" | "admin" ? Session["session"] : Session["session"] | undefined;
  req: Request;
  res: Response;
}

export interface RouteDefinition<
  P extends ZodType | undefined,
  Q extends ZodType | undefined,
  B extends ZodType | undefined,
  A extends AuthLevel,
> {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  auth?: A;
  params?: P;
  query?: Q;
  body?: B;
  response?: ZodType;
  /** Success status for docs; runtime status comes from `reply()` or defaults to 200. */
  status?: number;
  /** Extra middleware (e.g. a stricter rate limiter) run after auth, before validation. */
  middleware?: RequestHandler[];
  deprecated?: boolean;
  handler: (
    ctx: RouteContext<
      P extends ZodType ? z.output<P> : Record<string, never>,
      Q extends ZodType ? z.output<Q> : Record<string, never>,
      B extends ZodType ? z.output<B> : undefined,
      A
    >,
  ) => Promise<unknown> | unknown;
}

export interface ModuleRouterOptions<D extends AuthLevel> {
  /** Mount prefix, used only for documentation (e.g. "/api/v1/products"). */
  prefix: string;
  tags: string[];
  /** Default auth level for every route in this router. */
  auth?: D;
}

export function createModuleRouter<D extends AuthLevel = "public">(options: ModuleRouterOptions<D>) {
  // mergeParams lets routers mounted at "/products/:productId/reviews" read :productId
  const router = Router({ mergeParams: true });
  const defaultAuth: AuthLevel = options.auth ?? "public";

  function route<
    P extends ZodType | undefined = undefined,
    Q extends ZodType | undefined = undefined,
    B extends ZodType | undefined = undefined,
    A extends AuthLevel = D,
  >(def: RouteDefinition<P, Q, B, A>) {
    const auth: AuthLevel = def.auth ?? defaultAuth;

    registerRoute({
      method: def.method,
      path: `${options.prefix}${def.path === "/" ? "" : def.path}`,
      summary: def.summary,
      description: def.description,
      tags: options.tags,
      auth,
      params: def.params,
      query: def.query,
      body: def.body,
      response: def.response,
      status: def.status,
      deprecated: def.deprecated,
    });

    const guards: RequestHandler[] =
      auth === "admin" ? [...requireAdmin] : auth === "user" ? [requireAuth] : [];

    const handler: RequestHandler = async (req, res) => {
      const v = req.validated ?? {};
      const result = await def.handler({
        params: (v.params ?? req.params) as never,
        query: (v.query ?? req.query) as never,
        body: (v.body ?? req.body) as never,
        user: req.user as never,
        session: req.session as never,
        req,
        res,
      });

      if (res.headersSent) return;
      if (isApiReply(result)) {
        if (result.status === 204) return void res.status(204).end();
        return void res.status(result.status).json({ success: true, data: result.data, ...(result.meta ? { meta: result.meta } : {}) });
      }
      res.status(def.status ?? 200).json({ success: true, data: result ?? null });
    };

    router[def.method](
      def.path,
      ...guards,
      ...(def.middleware ?? []),
      validate({ params: def.params, query: def.query, body: def.body }),
      handler,
    );
  }

  return { router, route };
}

export type ModuleRouter = ReturnType<typeof createModuleRouter>;
