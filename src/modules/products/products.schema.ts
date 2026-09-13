import { z } from "zod";
import { FRAME_SHAPES, PRODUCT_GENDERS } from "../../db/schema/enums.js";
import { localizedStringSchema, optionalLocalizedStringSchema } from "../../lib/i18n.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { boolQuery, hexColorSchema, moneySchema, slugSchema, urlSchema, uuidSchema } from "../../lib/schemas.js";
import { brandResponseSchema } from "../brands/brands.schema.js";
import { categoryResponseSchema } from "../categories/categories.schema.js";

export const PRODUCT_SORTS = ["newest", "priceAsc", "priceDesc", "bestSelling", "rating", "name"] as const;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
export const listProductsQuerySchema = paginationQuerySchema.extend({
  /** Category slug, e.g. "sun" */
  category: slugSchema.optional(),
  /** Brand slug */
  brand: slugSchema.optional(),
  shape: z.enum(FRAME_SHAPES).optional(),
  gender: z.enum(PRODUCT_GENDERS).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  /** Free-text search across name (ar/en) and model code */
  search: z.string().trim().max(100).optional(),
  bestSeller: boolQuery,
  onSale: boolQuery,
  inStock: boolQuery,
  /** Comma separated product ids – used to hydrate wishlist / recently viewed */
  ids: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(uuidSchema).max(50))
    .optional(),
  sort: z.enum(PRODUCT_SORTS).default("newest"),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const adminListProductsQuerySchema = listProductsQuerySchema.extend({
  includeInactive: boolQuery,
  /** Products with at least one active colour at/below this stock level (restock list) */
  lowStock: z.coerce.number().int().min(0).optional(),
});
export type AdminListProductsQuery = z.infer<typeof adminListProductsQuerySchema>;

// ---------------------------------------------------------------------------
// Admin write payloads
// ---------------------------------------------------------------------------
export const frameSpecsSchema = z
  .object({
    lensWidth: z.number().positive().optional(),
    bridge: z.number().positive().optional(),
    templeLength: z.number().positive().optional(),
    frameWidth: z.number().positive().optional(),
    lensHeight: z.number().positive().optional(),
    weightGrams: z.number().positive().optional(),
    material: z.string().trim().max(100).optional(),
  })
  .strict();

export const variantInputSchema = z.object({
  colorHex: hexColorSchema,
  colorName: optionalLocalizedStringSchema,
  sku: z.string().trim().max(64).nullable().optional(),
  stock: z.number().int().min(0).default(0),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const imageInputSchema = z.object({
  url: urlSchema,
  alt: z.string().trim().max(200).nullable().optional(),
  sortOrder: z.number().int().default(0),
  /** Attach the image to the variant with this colour (must exist on the product). */
  variantColorHex: hexColorSchema.nullable().optional(),
});

export const createProductSchema = z.object({
  /** Optional – generated from the English name when omitted. */
  slug: slugSchema.optional(),
  code: z.string().trim().max(40).nullable().optional(),
  name: localizedStringSchema,
  description: optionalLocalizedStringSchema,
  note: optionalLocalizedStringSchema,
  categoryId: uuidSchema,
  brandId: uuidSchema.nullable().optional(),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  shape: z.enum(FRAME_SHAPES).nullable().optional(),
  gender: z.enum(PRODUCT_GENDERS).default("unisex"),
  specs: frameSpecsSchema.nullable().optional(),
  supportsLensAddons: z.boolean().default(true),
  requiresPrescription: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  isActive: z.boolean().default(true),
  variants: z.array(variantInputSchema).min(1, "At least one colour variant is required"),
  images: z.array(imageInputSchema).default([]),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema
  .omit({ variants: true, images: true })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const updateVariantSchema = variantInputSchema.partial();
export const adjustStockSchema = z
  .object({
    /** Absolute stock level */
    stock: z.number().int().min(0).optional(),
    /** Relative change, e.g. -1 or +10 */
    delta: z.number().int().optional(),
  })
  .refine((v) => (v.stock !== undefined) !== (v.delta !== undefined), "Provide either stock or delta");

export const reorderImagesSchema = z.object({ imageIds: z.array(uuidSchema).min(1) });

export const bulkProductActionSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(100),
  action: z.enum(["activate", "deactivate", "markBestSeller", "unmarkBestSeller", "delete"]),
});

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------
export const productVariantResponseSchema = z.object({
  id: z.uuid(),
  colorHex: z.string(),
  colorName: localizedStringSchema.nullable(),
  sku: z.string().nullable(),
  stock: z.number(),
  inStock: z.boolean(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  images: z.array(z.string()),
});

export const productImageResponseSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  alt: z.string().nullable(),
  sortOrder: z.number(),
  variantId: z.uuid().nullable(),
});

/** Compact shape used by grids / carts / wishlist. Mirrors the app's `Product` type. */
export const productCardSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  code: z.string().nullable(),
  name: localizedStringSchema,
  brand: brandResponseSchema.pick({ id: true, slug: true, name: true }).nullable(),
  category: categoryResponseSchema.pick({ id: true, slug: true, name: true }),
  price: z.number(),
  compareAtPrice: z.number().nullable(),
  discountPercent: z.number(),
  shape: z.enum(FRAME_SHAPES).nullable(),
  gender: z.enum(PRODUCT_GENDERS).nullable(),
  colors: z.array(z.string()),
  note: localizedStringSchema.nullable(),
  image: z.string().nullable(),
  isBestSeller: z.boolean(),
  isNew: z.boolean(),
  inStock: z.boolean(),
  rating: z.object({ average: z.number(), count: z.number() }),
  isActive: z.boolean(),
});
export type ProductCardDto = z.infer<typeof productCardSchema>;

export const productDetailSchema = productCardSchema.extend({
  description: localizedStringSchema.nullable(),
  specs: frameSpecsSchema.nullable(),
  supportsLensAddons: z.boolean(),
  requiresPrescription: z.boolean(),
  images: z.array(productImageResponseSchema),
  variants: z.array(productVariantResponseSchema),
  related: z.array(productCardSchema),
  soldCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProductDetailDto = z.infer<typeof productDetailSchema>;
