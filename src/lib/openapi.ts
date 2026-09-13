import { z, type ZodType } from "zod";
import { env } from "../config/env.js";

/**
 * Minimal OpenAPI 3.1 registry. Routes register themselves through `defineRoute`
 * (see router.ts); the document is assembled lazily on first request to /docs.
 * Schemas are converted with Zod 4's built-in `z.toJSONSchema`, so docs never
 * drift from the validators.
 */
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";
export type AuthLevel = "public" | "optional" | "user" | "admin";

export interface RouteDoc {
  method: HttpMethod;
  path: string; // full path, express style (/api/v1/products/:id)
  summary: string;
  description?: string;
  tags: string[];
  auth: AuthLevel;
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
  /** Optional response schema for the `data` field of the 200/201 envelope. */
  response?: ZodType;
  status?: number;
  deprecated?: boolean;
}

const routes: RouteDoc[] = [];

export const registerRoute = (doc: RouteDoc) => {
  routes.push(doc);
};

const toJson = (schema: ZodType) =>
  z.toJSONSchema(schema, { target: "openapi-3.0", io: "input", unrepresentable: "any" }) as Record<string, unknown>;

const expressToOpenApiPath = (p: string) => p.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

function paramsFrom(schema: ZodType | undefined, location: "path" | "query") {
  if (!schema) return [];
  const json = toJson(schema) as { properties?: Record<string, unknown>; required?: string[] };
  const required = new Set(json.required ?? []);
  return Object.entries(json.properties ?? {}).map(([name, s]) => ({
    name,
    in: location,
    required: location === "path" ? true : required.has(name),
    schema: s,
  }));
}

const errorSchema = {
  type: "object",
  properties: {
    success: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      properties: { code: { type: "string" }, message: { type: "string" }, details: {} },
    },
  },
};

const envelope = (data: Record<string, unknown>) => ({
  type: "object",
  properties: { success: { type: "boolean", enum: [true] }, data, meta: { type: "object" } },
});

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const r of routes) {
    const path = expressToOpenApiPath(r.path);
    paths[path] ??= {};
    const okStatus = r.status ?? (r.method === "post" ? 201 : 200);
    paths[path][r.method] = {
      summary: r.summary,
      description: r.description,
      tags: r.tags,
      deprecated: r.deprecated,
      security: r.auth === "public" ? [] : [{ bearerAuth: [] }, { cookieAuth: [] }],
      "x-auth": r.auth,
      parameters: [...paramsFrom(r.params, "path"), ...paramsFrom(r.query, "query")],
      ...(r.body
        ? { requestBody: { required: true, content: { "application/json": { schema: toJson(r.body) } } } }
        : {}),
      responses: {
        [okStatus]: {
          description: "Success",
          content: { "application/json": { schema: envelope(r.response ? toJson(r.response) : {}) } },
        },
        ...(r.auth !== "public" ? { 401: { description: "Not authenticated", content: { "application/json": { schema: errorSchema } } } } : {}),
        ...(r.auth === "admin" ? { 403: { description: "Admin only", content: { "application/json": { schema: errorSchema } } } } : {}),
        ...(r.body || r.query || r.params
          ? { 422: { description: "Validation failed", content: { "application/json": { schema: errorSchema } } } }
          : {}),
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${env.APP_NAME} API`,
      version: "2.0.0",
      description: [
        "REST API for the Al-Saedy Optics mobile app and admin panel.",
        "",
        "**Authentication** is handled by Better Auth under `/api/auth/*` (see `/api/auth/reference`).",
        "Mobile clients send `Authorization: Bearer <token>`; browsers use the session cookie.",
        "",
        "Every response is wrapped as `{ success, data, meta? }` or `{ success: false, error }`.",
        "Localised strings are returned as `{ ar, en }` objects. Prices are whole IQD integers.",
      ].join("\n"),
    },
    servers: [{ url: env.BETTER_AUTH_URL }],
    tags: [...new Set(routes.flatMap((r) => r.tags))].sort().map((name) => ({ name })),
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "better-auth.session_token" },
      },
    },
    paths,
  };
}
