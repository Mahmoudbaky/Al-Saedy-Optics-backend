import { z } from "zod";
import { created, noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { categoryResponseSchema, createCategorySchema, listCategoriesQuerySchema, updateCategorySchema } from "./categories.schema.js";
import { categoriesService } from "./categories.service.js";

// ---------------------------------------------------------------------------
// Public (mobile app)
// ---------------------------------------------------------------------------
const pub = createModuleRouter({ prefix: "/api/v1/categories", tags: ["Categories"] });

pub.route({
  method: "get",
  path: "/",
  summary: "List active categories",
  response: z.array(categoryResponseSchema),
  handler: () => categoriesService.list(false),
});

pub.route({
  method: "get",
  path: "/:id",
  summary: "Get a category",
  params: idParamSchema,
  response: categoryResponseSchema,
  handler: ({ params }) => categoriesService.getById(params.id),
});

// ---------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------
const admin = createModuleRouter({ prefix: "/api/v1/admin/categories", tags: ["Admin · Categories"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List all categories (incl. inactive) with product counts",
  query: listCategoriesQuerySchema,
  response: z.array(categoryResponseSchema),
  handler: ({ query }) => categoriesService.list(query.includeInactive ?? true),
});

admin.route({
  method: "post",
  path: "/",
  summary: "Create a category",
  body: createCategorySchema,
  response: categoryResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await categoriesService.create(body)),
});

admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update a category",
  params: idParamSchema,
  body: updateCategorySchema,
  response: categoryResponseSchema,
  handler: ({ params, body }) => categoriesService.update(params.id, body),
});

admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a category (must have no products)",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await categoriesService.delete(params.id);
    return noContent();
  },
});

export const categoriesRouter = pub.router;
export const adminCategoriesRouter = admin.router;
