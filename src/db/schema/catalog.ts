import { boolean, index, integer, jsonb, pgTable, smallint, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./_shared.js";
import { frameShapeEnum, productGenderEnum } from "./enums.js";

/**
 * Bilingual content: every user-facing string is stored twice (`*_ar`, `*_en`).
 * The API serialises them as `{ ar, en }` to match the app's `LocalizedString`.
 */

export const categories = pgTable(
  "categories",
  {
    id: uuidPk(),
    /** Stable identifier used by the app, e.g. "prescription", "sun", "contact", "kids". */
    slug: text("slug").notNull().unique(),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [index("categories_sort_idx").on(t.sortOrder)],
);

export const brands = pgTable("brands", {
  id: uuidPk(),
  slug: text("slug").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  logoUrl: text("logo_url"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

/** Physical measurements of a frame in millimetres (except weight in grams). */
export type FrameSpecs = {
  lensWidth?: number;
  bridge?: number;
  templeLength?: number;
  frameWidth?: number;
  lensHeight?: number;
  weightGrams?: number;
  material?: string;
};

export const products = pgTable(
  "products",
  {
    id: uuidPk(),
    /** URL-safe identifier, unique. e.g. "vc-214" */
    slug: text("slug").notNull().unique(),
    /** Short model code shown in the app, e.g. "VC 214". */
    code: text("code"),
    nameAr: text("name_ar").notNull(),
    nameEn: text("name_en").notNull(),
    descriptionAr: text("description_ar"),
    descriptionEn: text("description_en"),
    /** Short descriptor line, e.g. "خفيف · ٨ غرام" / "Light · 8 g" */
    noteAr: text("note_ar"),
    noteEn: text("note_en"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),
    /** Prices are whole IQD – no fractional dinars. */
    price: integer("price").notNull(),
    /** Original price when discounted; null when not on sale. */
    compareAtPrice: integer("compare_at_price"),
    shape: frameShapeEnum("shape"),
    gender: productGenderEnum("gender").default("unisex"),
    specs: jsonb("specs").$type<FrameSpecs>(),
    /** Whether lens add-ons (blue-light, anti-glare…) can be attached. */
    supportsLensAddons: boolean("supports_lens_addons").notNull().default(true),
    /** Whether a prescription is needed to order (frames / contacts). */
    requiresPrescription: boolean("requires_prescription").notNull().default(false),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    // Denormalised review stats, maintained by the reviews service.
    ratingAvg: integer("rating_avg_x100").notNull().default(0), // stored ×100 to avoid floats
    ratingCount: integer("rating_count").notNull().default(0),
    /** Denormalised sales counter for "best selling" sorting. */
    soldCount: integer("sold_count").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
    index("products_active_created_idx").on(t.isActive, t.createdAt),
    index("products_price_idx").on(t.price),
  ],
);

/** A colour option of a product. Stock is tracked per variant. */
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuidPk(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku").unique(),
    /** Hex colour rendered as the swatch in the app, e.g. "#22262B". */
    colorHex: text("color_hex").notNull(),
    colorNameAr: text("color_name_ar"),
    colorNameEn: text("color_name_en"),
    stock: integer("stock").notNull().default(0),
    sortOrder: smallint("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_product_color_uq").on(t.productId, t.colorHex),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuidPk(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Optional: image belongs to a specific colour variant. */
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    sortOrder: smallint("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

/** Lens upgrades selectable on frames: blue-light, anti-glare, thin lenses… */
export const lensAddons = pgTable("lens_addons", {
  /** Stable key used by the app, e.g. "blueLight". */
  id: text("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  descriptionAr: text("description_ar"),
  descriptionEn: text("description_en"),
  price: integer("price").notNull(),
  sortOrder: smallint("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
