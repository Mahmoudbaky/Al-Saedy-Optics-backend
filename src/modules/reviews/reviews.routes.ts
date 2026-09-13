import { z } from "zod";
import { noContent, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema, uuidSchema } from "../../lib/schemas.js";
import { strictRateLimit } from "../../middleware/rate-limit.js";
import { adminListReviewsQuerySchema, listReviewsQuerySchema, reviewResponseSchema, upsertReviewSchema } from "./reviews.schema.js";
import { reviewsService } from "./reviews.service.js";

const productParam = z.object({ productId: uuidSchema });

// Public listing lives under /products/:productId/reviews
const pub = createModuleRouter({ prefix: "/api/v1/products/:productId/reviews", tags: ["Reviews"] });

pub.route({
  method: "get",
  path: "/",
  summary: "Reviews for a product (with rating summary in meta)",
  params: productParam,
  query: listReviewsQuerySchema,
  response: z.array(reviewResponseSchema),
  handler: async ({ params, query }) => {
    const { items, meta } = await reviewsService.listForProduct(params.productId, query);
    return reply(items, { meta });
  },
});
pub.route({
  method: "get",
  path: "/mine",
  summary: "My review of this product",
  auth: "user",
  params: productParam,
  response: reviewResponseSchema.nullable(),
  handler: ({ user, params }) => reviewsService.mine(user.id, params.productId),
});
pub.route({
  method: "put",
  path: "/mine",
  summary: "Create or update my review (requires a delivered order)",
  auth: "user",
  middleware: [strictRateLimit],
  params: productParam,
  body: upsertReviewSchema,
  response: reviewResponseSchema,
  handler: ({ user, params, body }) => reviewsService.upsert(user.id, params.productId, body),
});
pub.route({
  method: "delete",
  path: "/mine",
  summary: "Delete my review",
  auth: "user",
  params: productParam,
  status: 204,
  handler: async ({ user, params }) => {
    await reviewsService.deleteMine(user.id, params.productId);
    return noContent();
  },
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/reviews", tags: ["Admin · Reviews"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List reviews",
  query: adminListReviewsQuerySchema,
  response: z.array(reviewResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await reviewsService.adminList(query);
    return reply(items, { meta });
  },
});
admin.route({
  method: "patch",
  path: "/:id/visibility",
  summary: "Hide or show a review",
  params: idParamSchema,
  body: z.object({ isVisible: z.boolean() }),
  response: reviewResponseSchema,
  handler: ({ params, body }) => reviewsService.setVisible(params.id, body.isVisible),
});
admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a review",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await reviewsService.adminDelete(params.id);
    return noContent();
  },
});

export const reviewsRouter = pub.router;
export const adminReviewsRouter = admin.router;
