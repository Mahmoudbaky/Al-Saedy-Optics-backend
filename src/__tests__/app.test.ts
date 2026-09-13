import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

/**
 * HTTP-level tests that don't need a database: envelope shape, validation,
 * auth guards, docs and request-id propagation.
 */
const app = createApp();

describe("app", () => {
  it("serves liveness", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("echoes / mints a request id", async () => {
    const res = await request(app).get("/health").set("x-request-id", "abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
    const res2 = await request(app).get("/health");
    expect(res2.headers["x-request-id"]).toMatch(/[0-9a-f-]{36}/);
  });

  it("returns the JSON error envelope for unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
  });

  it("validates query params before touching the database", async () => {
    const res = await request(app).get("/api/v1/products?limit=0&sort=bogus");
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const paths = res.body.error.details.map((d: { path: string }) => d.path).sort();
    expect(paths).toEqual(["limit", "sort"]);
  });

  it("rejects malformed JSON bodies", async () => {
    const res = await request(app).post("/api/v1/me/cart/items").set("content-type", "application/json").send("{bad json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("guards customer and admin routes", async () => {
    expect((await request(app).get("/api/v1/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/dashboard/overview")).status).toBe(401);
  });

  it("publishes an OpenAPI document covering every module", async () => {
    const res = await request(app).get("/docs/openapi.json");
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe("3.1.0");
    const paths = Object.keys(res.body.paths);
    expect(paths).toEqual(expect.arrayContaining(["/api/v1/products", "/api/v1/me/cart", "/api/v1/me/orders/checkout", "/api/v1/admin/products", "/api/v1/clinic/availability"]));
    expect(res.body.paths["/api/v1/admin/products"].post.security).toEqual([{ bearerAuth: [] }, { cookieAuth: [] }]);
  });

  it("blocks browser origins that are not whitelisted", async () => {
    const res = await request(app).get("/health").set("origin", "https://evil.example");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });
});
