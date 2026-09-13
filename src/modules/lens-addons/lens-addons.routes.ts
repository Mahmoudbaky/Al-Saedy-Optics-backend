import { z } from "zod";
import { created, noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { boolQuery } from "../../lib/schemas.js";
import { addonIdSchema, createLensAddonSchema, lensAddonResponseSchema, updateLensAddonSchema } from "./lens-addons.schema.js";
import { lensAddonsService } from "./lens-addons.service.js";

const pub = createModuleRouter({ prefix: "/api/v1/lens-addons", tags: ["Lens add-ons"] });

pub.route({
  method: "get",
  path: "/",
  summary: "List active lens add-ons (blue-light, anti-glare, thin lenses…)",
  response: z.array(lensAddonResponseSchema),
  handler: () => lensAddonsService.list(false),
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/lens-addons", tags: ["Admin · Lens add-ons"], auth: "admin" });
const idParam = z.object({ id: addonIdSchema });

admin.route({
  method: "get",
  path: "/",
  summary: "List all lens add-ons",
  query: z.object({ includeInactive: boolQuery }),
  response: z.array(lensAddonResponseSchema),
  handler: ({ query }) => lensAddonsService.list(query.includeInactive ?? true),
});
admin.route({
  method: "post",
  path: "/",
  summary: "Create a lens add-on",
  body: createLensAddonSchema,
  response: lensAddonResponseSchema,
  status: 201,
  handler: async ({ body }) => created(await lensAddonsService.create(body)),
});
admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update a lens add-on",
  params: idParam,
  body: updateLensAddonSchema,
  response: lensAddonResponseSchema,
  handler: ({ params, body }) => lensAddonsService.update(params.id, body),
});
admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a lens add-on",
  params: idParam,
  status: 204,
  handler: async ({ params }) => {
    await lensAddonsService.delete(params.id);
    return noContent();
  },
});

export const lensAddonsRouter = pub.router;
export const adminLensAddonsRouter = admin.router;
