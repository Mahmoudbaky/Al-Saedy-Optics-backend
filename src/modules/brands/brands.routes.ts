import { z } from "zod";
import { created, noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { boolQuery, idParamSchema } from "../../lib/schemas.js";
import { brandResponseSchema, createBrandSchema, updateBrandSchema } from "./brands.schema.js";
import { brandsService } from "./brands.service.js";

const pub = createModuleRouter({ prefix: "/api/v1/brands", tags: ["Brands"] });

pub.route({
  method: "get",
  path: "/",
  summary: "List active brands",
  response: z.array(brandResponseSchema),
  handler: () => brandsService.list(false),
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/brands", tags: ["Admin · Brands"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List all brands",
  query: z.object({ includeInactive: boolQuery }),
  response: z.array(brandResponseSchema),
  handler: ({ query }) => brandsService.list(query.includeInactive ?? true),
});
admin.route({
  method: "post",
  path: "/",
  summary: "Create a brand",
  body: createBrandSchema,
  response: brandResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await brandsService.create(body)),
});
admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update a brand",
  params: idParamSchema,
  body: updateBrandSchema,
  response: brandResponseSchema,
  handler: ({ params, body }) => brandsService.update(params.id, body),
});
admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a brand (must not be used by products)",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await brandsService.delete(params.id);
    return noContent();
  },
});

export const brandsRouter = pub.router;
export const adminBrandsRouter = admin.router;
