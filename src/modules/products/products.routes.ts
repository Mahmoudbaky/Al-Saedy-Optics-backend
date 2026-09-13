import { z } from "zod";
import { created, noContent, reply } from "../../lib/http.js";
import { createModuleRouter } from "../../lib/router.js";
import { idParamSchema, uuidSchema } from "../../lib/schemas.js";
import {
  adjustStockSchema,
  adminListProductsQuerySchema,
  bulkProductActionSchema,
  createProductSchema,
  imageInputSchema,
  listProductsQuerySchema,
  productCardSchema,
  productDetailSchema,
  reorderImagesSchema,
  updateProductSchema,
  updateVariantSchema,
  variantInputSchema,
} from "./products.schema.js";
import { productsService } from "./products.service.js";

// ---------------------------------------------------------------------------
// Public (mobile app)
// ---------------------------------------------------------------------------
const pub = createModuleRouter({ prefix: "/api/v1/products", tags: ["Products"] });

pub.route({
  method: "get",
  path: "/",
  summary: "Browse products",
  description:
    "Paginated catalogue with filters used by the Categories tab and search. " +
    "Pass `ids=a,b,c` to hydrate a wishlist or recently-viewed list in one call.",
  query: listProductsQuerySchema,
  response: z.array(productCardSchema),
  handler: async ({ query }) => {
    const { items, meta } = await productsService.list(query);
    return reply(items, { meta });
  },
});

pub.route({
  method: "get",
  path: "/:idOrSlug",
  summary: "Product details",
  description: "Accepts a uuid or slug. Includes colour variants, images, stock and related products.",
  params: z.object({ idOrSlug: z.string().min(1).max(120) }),
  response: productDetailSchema,
  handler: ({ params }) => productsService.getPublic(params.idOrSlug),
});

// ---------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------
const admin = createModuleRouter({ prefix: "/api/v1/admin/products", tags: ["Admin · Products"], auth: "admin" });
const variantParams = z.object({ id: uuidSchema, variantId: uuidSchema });
const imageParams = z.object({ id: uuidSchema, imageId: uuidSchema });

admin.route({
  method: "get",
  path: "/",
  summary: "List products (incl. inactive, low-stock filter)",
  query: adminListProductsQuerySchema,
  response: z.array(productCardSchema),
  handler: async ({ query }) => {
    const { items, meta } = await productsService.adminList(query);
    return reply(items, { meta });
  },
});

admin.route({
  method: "post",
  path: "/",
  summary: "Create a product with variants and images",
  body: createProductSchema,
  response: productDetailSchema,
  status: 201,
  handler: async ({ body }) => created(await productsService.create(body)),
});

admin.route({
  method: "post",
  path: "/bulk",
  summary: "Bulk activate / deactivate / delete products",
  body: bulkProductActionSchema,
  response: z.object({ affected: z.number() }),
  status: 200,
  handler: ({ body }) => productsService.bulk(body),
});

admin.route({
  method: "get",
  path: "/:id",
  summary: "Get a product (admin view)",
  params: idParamSchema,
  response: productDetailSchema,
  handler: ({ params }) => productsService.adminGet(params.id),
});

admin.route({
  method: "patch",
  path: "/:id",
  summary: "Update product fields",
  params: idParamSchema,
  body: updateProductSchema,
  response: productDetailSchema,
  handler: ({ params, body }) => productsService.update(params.id, body),
});

admin.route({
  method: "delete",
  path: "/:id",
  summary: "Delete a product",
  params: idParamSchema,
  status: 204,
  handler: async ({ params }) => {
    await productsService.delete(params.id);
    return noContent();
  },
});

// ---- variants ---------------------------------------------------------------
admin.route({
  method: "post",
  path: "/:id/variants",
  summary: "Add a colour variant",
  params: idParamSchema,
  body: variantInputSchema,
  response: productDetailSchema,
  status: 201,
  handler: async ({ params, body }) => created(await productsService.addVariant(params.id, body)),
});

admin.route({
  method: "patch",
  path: "/:id/variants/:variantId",
  summary: "Update a variant",
  params: variantParams,
  body: updateVariantSchema,
  response: productDetailSchema,
  handler: ({ params, body }) => productsService.updateVariant(params.id, params.variantId, body),
});

admin.route({
  method: "patch",
  path: "/:id/variants/:variantId/stock",
  summary: "Set or adjust variant stock",
  params: variantParams,
  body: adjustStockSchema,
  response: z.object({ variantId: z.uuid(), stock: z.number() }),
  handler: ({ params, body }) => productsService.adjustStock(params.id, params.variantId, body),
});

admin.route({
  method: "delete",
  path: "/:id/variants/:variantId",
  summary: "Delete a variant",
  params: variantParams,
  response: productDetailSchema,
  handler: ({ params }) => productsService.deleteVariant(params.id, params.variantId),
});

// ---- images -------------------------------------------------------------------
admin.route({
  method: "post",
  path: "/:id/images",
  summary: "Attach uploaded image URLs to a product",
  description: "Upload files through `/api/uploadthing` (route `productImage`) first, then register the URLs here.",
  params: idParamSchema,
  body: z.object({ images: z.array(imageInputSchema).min(1).max(20) }),
  response: productDetailSchema,
  status: 201,
  handler: async ({ params, body }) => created(await productsService.addImages(params.id, body.images)),
});

admin.route({
  method: "put",
  path: "/:id/images/order",
  summary: "Reorder product images",
  params: idParamSchema,
  body: reorderImagesSchema,
  response: productDetailSchema,
  handler: ({ params, body }) => productsService.reorderImages(params.id, body.imageIds),
});

admin.route({
  method: "delete",
  path: "/:id/images/:imageId",
  summary: "Remove an image",
  params: imageParams,
  response: productDetailSchema,
  handler: ({ params }) => productsService.deleteImage(params.id, params.imageId),
});

export const productsRouter = pub.router;
export const adminProductsRouter = admin.router;
