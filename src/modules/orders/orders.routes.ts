import { z } from "zod";
import { ORDER_STATUSES } from "../../db/schema/enums.js";
import { created, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema } from "../../lib/schemas.js";
import { strictRateLimit } from "../../middleware/rate-limit.js";
import {
  adminListOrdersQuerySchema,
  adminOrderResponseSchema,
  cancelOrderSchema,
  checkoutSchema,
  listMyOrdersQuerySchema,
  orderResponseSchema,
  updateOrderDetailsSchema,
  updateOrderStatusSchema,
} from "./orders.schema.js";
import { ordersService } from "./orders.service.js";

const me = createModuleRouter({ prefix: "/api/v1/me/orders", tags: ["Me · Orders"], auth: "user" });

me.route({
  method: "post",
  path: "/checkout",
  summary: "Place an order from my cart",
  description:
    "Totals are recomputed on the server. Home delivery needs an address (defaults to the default address); " +
    "items flagged `requiresPrescription` need a prescription attached to the cart or passed here (pending ones are allowed – staff verify before the lab step; rejected/expired are refused). " +
    "Cash-on-delivery orders start as `confirmed`; card/wallet start as `pending` until staff confirm payment.",
  middleware: [strictRateLimit],
  body: checkoutSchema,
  response: orderResponseSchema,
  status: 201,
  handler: async ({ user, body }) => created(await ordersService.checkout(user.id, body)),
});
me.route({
  method: "get",
  path: "/",
  summary: "My orders",
  query: listMyOrdersQuerySchema,
  response: z.array(orderResponseSchema),
  handler: async ({ user, query }) => {
    const { items, meta } = await ordersService.listMine(user.id, query);
    return reply(items, { meta });
  },
});
me.route({
  method: "get",
  path: "/:id",
  summary: "Order details & tracking timeline",
  params: idParamSchema,
  response: orderResponseSchema,
  handler: ({ user, params }) => ordersService.getMine(user.id, params.id),
});
me.route({
  method: "post",
  path: "/:id/cancel",
  summary: "Cancel my order (while pending / confirmed)",
  params: idParamSchema,
  body: cancelOrderSchema,
  response: orderResponseSchema,
  status: 200,
  handler: ({ user, params, body }) => ordersService.cancelMine(user.id, params.id, body.reason),
});

const admin = createModuleRouter({ prefix: "/api/v1/admin/orders", tags: ["Admin · Orders"], auth: "admin" });
const adminOrderWithNext = adminOrderResponseSchema.extend({ nextStatuses: z.array(z.enum(ORDER_STATUSES)) });

admin.route({
  method: "get",
  path: "/",
  summary: "List orders",
  query: adminListOrdersQuerySchema,
  response: z.array(adminOrderResponseSchema),
  handler: async ({ query }) => {
    const { items, meta } = await ordersService.adminList(query);
    return reply(items, { meta });
  },
});
admin.route({
  method: "get",
  path: "/:id",
  summary: "Order details (with allowed next statuses)",
  params: idParamSchema,
  response: adminOrderWithNext,
  handler: ({ params }) => ordersService.adminGet(params.id),
});
admin.route({
  method: "post",
  path: "/:id/status",
  summary: "Advance / cancel an order",
  description: "Allowed transitions: pending→confirmed, confirmed→lab/onTheWay/ready, lab→onTheWay/ready, onTheWay|ready→delivered; any active state→cancelled.",
  params: idParamSchema,
  body: updateOrderStatusSchema,
  response: adminOrderWithNext,
  status: 200,
  handler: ({ params, body, user }) => ordersService.updateStatus(params.id, body.status, body.note, user.id),
});
admin.route({
  method: "patch",
  path: "/:id",
  summary: "Set courier, ETA, payment status or internal note",
  params: idParamSchema,
  body: updateOrderDetailsSchema,
  response: adminOrderWithNext,
  handler: ({ params, body }) => ordersService.updateDetails(params.id, body),
});

export const ordersRouter = me.router;
export const adminOrdersRouter = admin.router;
