import { z } from "zod";
import { created, noContent, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { createPromoCodeSchema, listPromoCodesQuerySchema, promoCodeResponseSchema, updatePromoCodeSchema } from "./promo-codes.schema.js";
import { promoCodesService } from "./promo-codes.service.js";

const admin = createModuleRouter({ prefix: "/api/v1/admin/promo-codes", tags: ["Admin · Promo codes"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List promo codes",
  query: listPromoCodesQuerySchema,
  response: z.array(promoCodeResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await promoCodesService.list(query);
    return reply(items, { meta });
  },
});
admin.route({
  method: "post",
  path: "/",
  summary: "Create a promo code",
  body: createPromoCodeSchema,
  response: promoCodeResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await promoCodesService.create(body)),
});
admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update a promo code",
  params: idParamSchema,
  body: updatePromoCodeSchema,
  response: promoCodeResponseSchema,
  handler: ({ params, body }) => promoCodesService.update(params.id, body),
});
admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a promo code",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await promoCodesService.delete(params.id);
    return noContent();
  },
});

export const adminPromoCodesRouter = admin.router;
