import { z } from "zod";
import { createModuleRouter } from "../../lib/router.js";
import { bannerResponseSchema } from "../banners/banners.schema.js";
import { bannersService } from "../banners/banners.service.js";
import { categoryResponseSchema } from "../categories/categories.schema.js";
import { categoriesService } from "../categories/categories.service.js";
import { lensAddonResponseSchema } from "../lens-addons/lens-addons.schema.js";
import { lensAddonsService } from "../lens-addons/lens-addons.service.js";
import { productCardSchema } from "../products/products.schema.js";
import { productsService } from "../products/products.service.js";
import { wishlistService } from "../wishlist/wishlist.service.js";

const r = createModuleRouter({ prefix: "/api/v1/home", tags: ["Home"] });

/**
 * One request for the whole home tab so the app renders instantly on a
 * cold start. Every section is also available from its own endpoint.
 */
r.route({
  method: "get",
  path: "/",
  summary: "Home screen bundle (banners, categories, best sellers, new arrivals)",
  auth: "optional",
  response: z.object({
    banners: z.array(bannerResponseSchema),
    categories: z.array(categoryResponseSchema),
    bestSellers: z.array(productCardSchema),
    newArrivals: z.array(productCardSchema),
    onSale: z.array(productCardSchema),
    lensAddons: z.array(lensAddonResponseSchema),
    /** Present only when signed in – ids to render filled hearts. */
    wishlistIds: z.array(z.uuid()).optional(),
  }),
  handler: async ({ user }) => {
    const base = { page: 1 as const, limit: 8 as const, sort: "bestSelling" as const };
    const [banners, categories, bestSellers, newArrivals, onSale, lensAddons, wishlistIds] = await Promise.all([
      bannersService.listActive(),
      categoriesService.list(false),
      productsService.list({ ...base, bestSeller: true }),
      productsService.list({ ...base, sort: "newest" }),
      productsService.list({ ...base, onSale: true }),
      lensAddonsService.list(false),
      user ? wishlistService.ids(user.id) : Promise.resolve(undefined),
    ]);
    return { banners, categories, bestSellers: bestSellers.items, newArrivals: newArrivals.items, onSale: onSale.items, lensAddons, wishlistIds };
  },
});

export const homeRouter = r.router;
