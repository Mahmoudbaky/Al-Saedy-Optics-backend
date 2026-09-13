import { z } from "zod";
import { createModuleRouter } from "../../lib/router.js";
import { uuidSchema } from "../../lib/schemas.js";
import { addCartItemSchema, applyPromoSchema, attachPrescriptionSchema, cartResponseSchema, updateCartItemSchema } from "./cart.schema.js";
import { cartService } from "./cart.service.js";

const r = createModuleRouter({ prefix: "/api/v1/me/cart", tags: ["Me · Cart"], auth: "user" });
const itemParam = z.object({ itemId: uuidSchema });

r.route({
  method: "get",
  path: "/",
  summary: "Get my cart with live prices and totals",
  response: cartResponseSchema,
  handler: ({ user }) => cartService.get(user.id),
});
r.route({
  method: "post",
  path: "/items",
  summary: "Add a product (colour + lens add-ons) to my cart",
  body: addCartItemSchema,
  response: cartResponseSchema,
  status: 200,
  handler: ({ user, body }) => cartService.addItem(user.id, body),
});
r.route({
  method: "patch",
  path: "/items/:itemId",
  summary: "Change a line's quantity (0 removes it)",
  params: itemParam,
  body: updateCartItemSchema,
  response: cartResponseSchema,
  handler: ({ user, params, body }) => cartService.updateItem(user.id, params.itemId, body.quantity),
});
r.route({
  method: "delete",
  path: "/items/:itemId",
  summary: "Remove a line",
  params: itemParam,
  response: cartResponseSchema,
  handler: ({ user, params }) => cartService.removeItem(user.id, params.itemId),
});
r.route({
  method: "delete",
  path: "/",
  summary: "Empty my cart",
  response: cartResponseSchema,
  handler: ({ user }) => cartService.clear(user.id),
});
r.route({
  method: "put",
  path: "/prescription",
  summary: "Attach (or detach with null) a verified prescription to the order",
  body: attachPrescriptionSchema,
  response: cartResponseSchema,
  handler: ({ user, body }) => cartService.attachPrescription(user.id, body.prescriptionId),
});
r.route({
  method: "put",
  path: "/promo",
  summary: "Apply (or remove with null) a promo code",
  body: applyPromoSchema,
  response: cartResponseSchema,
  handler: ({ user, body }) => cartService.applyPromo(user.id, body.code),
});

export const cartRouter = r.router;
