import { z } from "zod";
import { created, noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { bannerResponseSchema, createBannerSchema, updateBannerSchema } from "./banners.schema.js";
import { bannersService } from "./banners.service.js";

const pub = createModuleRouter({ prefix: "/api/v1/banners", tags: ["Banners"] });
pub.route({
  method: "get",
  path: "/",
  summary: "Active home-screen banners",
  response: z.array(bannerResponseSchema),
  handler: () => bannersService.listActive(),
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/banners", tags: ["Admin · Banners"], auth: "admin" });
admin.route({ method: "get", path: "/", summary: "List all banners", response: z.array(bannerResponseSchema), handler: () => bannersService.listAll() });
admin.route({
  method: "post",
  path: "/",
  summary: "Create a banner",
  body: createBannerSchema,
  response: bannerResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await bannersService.create(body)),
});
admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update a banner",
  params: idParamSchema,
  body: updateBannerSchema,
  response: bannerResponseSchema,
  handler: ({ params, body }) => bannersService.update(params.id, body),
});
admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a banner",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await bannersService.delete(params.id);
    return noContent();
  },
});

export const bannersRouter = pub.router;
export const adminBannersRouter = admin.router;
