import { z } from "zod";
import { createModuleRouter } from "../../lib/router.js";
import { uuidSchema } from "../../lib/schemas.js";
import { strictRateLimit } from "../../middleware/rate-limit.js";
import { addCartItemSchema, applyPromoSchema, attachLineAppointmentSchema, attachLinePrescriptionSchema, cartResponseSchema, updateCartItemSchema } from "./cart.schema.js";
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
// ---- per-line prescription source -----------------------------------------
r.route({
  method: "put",
  path: "/items/:itemId/prescription",
  summary: "Option 1 – use one of my saved prescriptions for this item",
  params: itemParam,
  body: attachLinePrescriptionSchema,
  response: cartResponseSchema,
  handler: ({ user, params, body }) => cartService.attachLinePrescription(user.id, params.itemId, body.prescriptionId),
});
r.route({
  method: "put",
  path: "/items/:itemId/appointment",
  summary: "Option 2 – get the prescription from an eye exam (link an upcoming appointment or book a new slot)",
  description:
    "Send `{ appointmentId }` to link an appointment you already booked, or `{ scheduledAt, doctorId?, reason?, remindMe?, notes? }` to book one now. " +
    "The line stays `awaitingExam` until the clinic records the prescription; it is then attached automatically.",
  middleware: [strictRateLimit],
  params: itemParam,
  body: attachLineAppointmentSchema,
  response: cartResponseSchema,
  handler: ({ user, params, body }) => cartService.attachLineAppointment(user.id, params.itemId, body, user.locale ?? null),
});
r.route({
  method: "delete",
  path: "/items/:itemId/prescription",
  summary: "Remove the prescription / appointment from this item",
  params: itemParam,
  response: cartResponseSchema,
  handler: ({ user, params }) => cartService.clearLineRx(user.id, params.itemId),
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
