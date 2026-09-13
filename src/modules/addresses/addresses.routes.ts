import { z } from "zod";
import { created, noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { addressResponseSchema, createAddressSchema, updateAddressSchema } from "./addresses.schema.js";
import { addressesService } from "./addresses.service.js";

const r = createModuleRouter({ prefix: "/api/v1/me/addresses", tags: ["Me · Addresses"], auth: "user" });

r.route({
  method: "get",
  path: "/",
  summary: "List my delivery addresses",
  response: z.array(addressResponseSchema),
  handler: ({ user }) => addressesService.list(user.id),
});
r.route({
  method: "post",
  path: "/",
  summary: "Add an address",
  body: createAddressSchema,
  response: addressResponseSchema,
  status: 201,
  handler: async ({ user, body }) => created(await addressesService.create(user.id, body)),
});
r.route({
  method: "patch",
  path: "/:id",
  summary: "Update an address",
  params: idParamSchema,
  body: updateAddressSchema,
  response: addressResponseSchema,
  handler: ({ user, params, body }) => addressesService.update(user.id, params.id, body),
});
r.route({
  method: "post",
  path: "/:id/default",
  summary: "Make an address the default",
  params: idParamSchema,
  response: addressResponseSchema,
  status: 200,
  handler: ({ user, params }) => addressesService.setDefault(user.id, params.id),
});
r.route({
  method: "delete",
  path: "/:id",
  summary: "Delete an address",
  params: idParamSchema,
  status: 204,
  handler: async ({ user, params }) => {
    await addressesService.delete(user.id, params.id);
    return noContent();
  },
});

export const addressesRouter = r.router;
