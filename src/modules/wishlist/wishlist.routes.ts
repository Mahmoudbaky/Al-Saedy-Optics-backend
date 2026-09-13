import { z } from "zod";
import { noContent } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { uuidSchema } from "../../lib/schemas.js";
import { productCardSchema } from "../products/products.schema.js";
import { wishlistService } from "./wishlist.service.js";

const r = createModuleRouter({ prefix: "/api/v1/me/wishlist", tags: ["Me · Wishlist"], auth: "user" });
const productParam = z.object({ productId: uuidSchema });
const toggleResponse = z.object({ productId: z.uuid(), inWishlist: z.boolean() });

r.route({
  method: "get",
  path: "/",
  summary: "My wishlist (full product cards)",
  response: z.array(productCardSchema),
  handler: ({ user }) => wishlistService.list(user.id),
});
r.route({
  method: "get",
  path: "/ids",
  summary: "My wishlist product ids only",
  response: z.array(z.uuid()),
  handler: ({ user }) => wishlistService.ids(user.id),
});
r.route({
  method: "post",
  path: "/:productId",
  summary: "Add a product to my wishlist",
  params: productParam,
  response: toggleResponse,
  status: 200,
  handler: ({ user, params }) => wishlistService.add(user.id, params.productId),
});
r.route({
  method: "post",
  path: "/:productId/toggle",
  summary: "Toggle a product in my wishlist",
  params: productParam,
  response: toggleResponse,
  status: 200,
  handler: ({ user, params }) => wishlistService.toggle(user.id, params.productId),
});
r.route({
  method: "delete",
  path: "/:productId",
  summary: "Remove a product from my wishlist",
  params: productParam,
  response: toggleResponse,
  handler: ({ user, params }) => wishlistService.remove(user.id, params.productId),
});
r.route({
  method: "delete",
  path: "/",
  summary: "Clear my wishlist",
  status: 204,
  handler: async ({ user }) => {
    await wishlistService.clear(user.id);
    return noContent();
  },
});

export const wishlistRouter = r.router;
