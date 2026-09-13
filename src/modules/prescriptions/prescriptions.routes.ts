import { z } from "zod";
import { created, noContent, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import {
  adminListPrescriptionsQuerySchema,
  createPrescriptionSchema,
  prescriptionResponseSchema,
  reviewPrescriptionSchema,
  updatePrescriptionSchema,
} from "./prescriptions.schema.js";
import { prescriptionsService } from "./prescriptions.service.js";

const me = createModuleRouter({ prefix: "/api/v1/me/prescriptions", tags: ["Me · Prescriptions"], auth: "user" });

me.route({
  method: "get",
  path: "/",
  summary: "List my prescriptions",
  response: z.array(prescriptionResponseSchema),
  handler: ({ user }) => prescriptionsService.list(user.id),
});
me.route({
  method: "post",
  path: "/",
  summary: "Add a prescription (manual values or uploaded photo)",
  description: "New prescriptions start as `pending` until the clinic verifies them.",
  body: createPrescriptionSchema,
  response: prescriptionResponseSchema,
  status: 201,
  handler: async ({ user, body }) => created(await prescriptionsService.create(user.id, body)),
});
me.route({
  method: "patch",
  path: "/:id",
  summary: "Edit a pending prescription",
  params: idParamSchema,
  body: updatePrescriptionSchema,
  response: prescriptionResponseSchema,
  handler: ({ user, params, body }) => prescriptionsService.update(user.id, params.id, body),
});
me.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a prescription",
  params: idParamSchema,
  status: 204,
  handler: async ({ user, params }) => {
    await prescriptionsService.delete(user.id, params.id);
    return noContent();
  },
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/prescriptions", tags: ["Admin · Prescriptions"], auth: "admin" });

admin.route({
  method: "get",
  path: "/",
  summary: "List prescriptions awaiting review",
  query: adminListPrescriptionsQuerySchema,
  response: z.array(prescriptionResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await prescriptionsService.adminList(query);
    return reply(items, { meta });
  },
});
admin.route({
  method: "post",
  path: "/:id/review",
  summary: "Verify / reject a prescription (optionally correcting values)",
  params: idParamSchema,
  body: reviewPrescriptionSchema,
  response: prescriptionResponseSchema,
  status: 200,
  handler: ({ params, body }) => prescriptionsService.review(params.id, body),
});

export const prescriptionsRouter = me.router;
export const adminPrescriptionsRouter = admin.router;
