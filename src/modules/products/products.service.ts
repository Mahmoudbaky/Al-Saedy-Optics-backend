import { createLogger } from "../../config/logger.js";
import { db } from "../../db/index.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { toColumns } from "../../lib/i18n.js";
import { pageMeta } from "../../lib/pagination.js";
import { slugify } from "../../lib/slug.js";
import { brandsRepository } from "../brands/brands.repository.js";
import { categoriesRepository } from "../categories/categories.repository.js";
import { toProductCard, toProductDetail } from "./products.mapper.js";
import { productsRepository, type NewProduct, type ProductWithRelations } from "./products.repository.js";
import type {
  AdminListProductsQuery,
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schema.js";
import type { z } from "zod";
import type { adjustStockSchema, bulkProductActionSchema, imageInputSchema, updateVariantSchema, variantInputSchema } from "./products.schema.js";

const log = createLogger("products");
const RELATED_LIMIT = 6;

async function loadOrThrow(id: string): Promise<ProductWithRelations> {
  const p = await productsRepository.findById(id);
  if (!p) throw new NotFoundError("Product", id);
  return p;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  for (let i = 2; await productsRepository.slugExists(slug); i++) slug = `${base}-${i}`;
  return slug;
}

function scalarColumns(input: Partial<CreateProductInput>): Partial<NewProduct> {
  return {
    ...(input.code !== undefined ? { code: input.code } : {}),
    ...(input.name ? { nameAr: input.name.ar, nameEn: input.name.en } : {}),
    ...toColumns("description", input.description),
    ...toColumns("note", input.note),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.brandId !== undefined ? { brandId: input.brandId } : {}),
    ...(input.price !== undefined ? { price: input.price } : {}),
    ...(input.compareAtPrice !== undefined ? { compareAtPrice: input.compareAtPrice } : {}),
    ...(input.shape !== undefined ? { shape: input.shape } : {}),
    ...(input.gender !== undefined ? { gender: input.gender } : {}),
    ...(input.specs !== undefined ? { specs: input.specs } : {}),
    ...(input.supportsLensAddons !== undefined ? { supportsLensAddons: input.supportsLensAddons } : {}),
    ...(input.requiresPrescription !== undefined ? { requiresPrescription: input.requiresPrescription } : {}),
    ...(input.isBestSeller !== undefined ? { isBestSeller: input.isBestSeller } : {}),
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

async function assertReferences(input: { categoryId?: string; brandId?: string | null; price?: number; compareAtPrice?: number | null }) {
  if (input.categoryId && !(await categoriesRepository.findById(input.categoryId))) {
    throw new BadRequestError("categoryId does not exist");
  }
  if (input.brandId && !(await brandsRepository.findById(input.brandId))) {
    throw new BadRequestError("brandId does not exist");
  }
  if (input.compareAtPrice != null && input.price != null && input.compareAtPrice <= input.price) {
    throw new BadRequestError("compareAtPrice must be greater than price");
  }
}

export const productsService = {
  // ---- customer -----------------------------------------------------------
  async list(query: ListProductsQuery) {
    const { rows, total } = await productsRepository.list(query, { includeInactive: false });
    return { items: rows.map(toProductCard), meta: pageMeta(total, query) };
  },

  /** Accepts a uuid or a slug so deep links like /product/vc-214 work. */
  async getPublic(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
    const p = isUuid ? await productsRepository.findById(idOrSlug) : await productsRepository.findBySlug(idOrSlug);
    if (!p || !p.isActive) throw new NotFoundError("Product", idOrSlug);
    const related = await productsRepository.related(p.id, p.categoryId, RELATED_LIMIT);
    return toProductDetail(p, related);
  },

  async cardsByIds(ids: string[]) {
    const rows = await productsRepository.findManyByIds(ids);
    const byId = new Map(rows.map((r) => [r.id, toProductCard(r)]));
    return ids.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  },

  // ---- admin ---------------------------------------------------------------
  /** Admin rows carry variants/stock and sales so the catalogue table needs no per-row fetch. */
  async adminList(query: AdminListProductsQuery) {
    const { rows, total } = await productsRepository.list(query, { includeInactive: query.includeInactive ?? true });
    return { items: rows.map((p) => toProductDetail(p, [])), meta: pageMeta(total, query) };
  },

  async adminGet(id: string) {
    const p = await loadOrThrow(id);
    return toProductDetail(p, []);
  },

  async create(input: CreateProductInput) {
    await assertReferences(input);
    const slug = input.slug ? input.slug : await uniqueSlug(slugify(input.code ?? input.name.en, "product"));
    if (input.slug && (await productsRepository.slugExists(input.slug))) throw new ConflictError(`Slug '${input.slug}' already exists`);

    const colorSet = new Set(input.variants.map((v) => v.colorHex.toUpperCase()));
    if (colorSet.size !== input.variants.length) throw new BadRequestError("Duplicate variant colours");

    const id = await db.transaction(async (tx) => {
      const product = await productsRepository.create({ slug, ...scalarColumns(input) } as NewProduct, tx);
      const variants = await productsRepository.insertVariants(
        input.variants.map((v, i) => ({
          productId: product.id,
          colorHex: v.colorHex.toUpperCase(),
          ...toColumns("colorName", v.colorName),
          sku: v.sku ?? null,
          stock: v.stock,
          sortOrder: v.sortOrder ?? i,
          isActive: v.isActive,
        })),
        tx,
      );
      const variantByColor = new Map(variants.map((v) => [v.colorHex, v.id]));
      await productsRepository.insertImages(
        input.images.map((img, i) => {
          const variantId = img.variantColorHex ? variantByColor.get(img.variantColorHex.toUpperCase()) : null;
          if (img.variantColorHex && !variantId) throw new BadRequestError(`Image references unknown variant colour ${img.variantColorHex}`);
          return { productId: product.id, variantId: variantId ?? null, url: img.url, alt: img.alt ?? null, sortOrder: img.sortOrder ?? i };
        }),
        tx,
      );
      return product.id;
    });

    log.info({ id, slug }, "Product created");
    return this.adminGet(id);
  },

  async update(id: string, input: UpdateProductInput) {
    const existing = await loadOrThrow(id);
    await assertReferences({
      categoryId: input.categoryId,
      brandId: input.brandId,
      price: input.price ?? existing.price,
      compareAtPrice: input.compareAtPrice === undefined ? existing.compareAtPrice : input.compareAtPrice,
    });
    if (input.slug && input.slug !== existing.slug && (await productsRepository.slugExists(input.slug))) {
      throw new ConflictError(`Slug '${input.slug}' already exists`);
    }
    await productsRepository.update(id, { ...(input.slug ? { slug: input.slug } : {}), ...scalarColumns(input) });
    log.info({ id, fields: Object.keys(input) }, "Product updated");
    return this.adminGet(id);
  },

  async delete(id: string) {
    // Order items reference products with ON DELETE SET NULL, so history is kept.
    if (!(await productsRepository.delete(id))) throw new NotFoundError("Product", id);
    log.info({ id }, "Product deleted");
  },

  async bulk(input: z.infer<typeof bulkProductActionSchema>) {
    const { ids, action } = input;
    let affected = 0;
    switch (action) {
      case "activate":
        affected = await productsRepository.updateMany(ids, { isActive: true });
        break;
      case "deactivate":
        affected = await productsRepository.updateMany(ids, { isActive: false });
        break;
      case "markBestSeller":
        affected = await productsRepository.updateMany(ids, { isBestSeller: true });
        break;
      case "unmarkBestSeller":
        affected = await productsRepository.updateMany(ids, { isBestSeller: false });
        break;
      case "delete":
        affected = await productsRepository.deleteMany(ids);
        break;
    }
    log.info({ action, affected }, "Bulk product action");
    return { affected };
  },

  // ---- variants -------------------------------------------------------------
  async addVariant(productId: string, input: z.infer<typeof variantInputSchema>) {
    await loadOrThrow(productId);
    await productsRepository.insertVariants([
      {
        productId,
        colorHex: input.colorHex.toUpperCase(),
        ...toColumns("colorName", input.colorName),
        sku: input.sku ?? null,
        stock: input.stock,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
      },
    ]);
    return this.adminGet(productId);
  },

  async updateVariant(productId: string, variantId: string, input: z.infer<typeof updateVariantSchema>) {
    if (!(await productsRepository.findVariant(productId, variantId))) throw new NotFoundError("Variant", variantId);
    await productsRepository.updateVariant(variantId, {
      ...(input.colorHex ? { colorHex: input.colorHex.toUpperCase() } : {}),
      ...toColumns("colorName", input.colorName),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.stock !== undefined ? { stock: input.stock } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return this.adminGet(productId);
  },

  async adjustStock(productId: string, variantId: string, input: z.infer<typeof adjustStockSchema>) {
    if (!(await productsRepository.findVariant(productId, variantId))) throw new NotFoundError("Variant", variantId);
    const row =
      input.stock !== undefined
        ? await productsRepository.updateVariant(variantId, { stock: input.stock })
        : await productsRepository.adjustVariantStock(variantId, input.delta!);
    log.info({ productId, variantId, stock: row?.stock }, "Stock adjusted");
    return { variantId, stock: row!.stock };
  },

  async deleteVariant(productId: string, variantId: string) {
    if (!(await productsRepository.findVariant(productId, variantId))) throw new NotFoundError("Variant", variantId);
    if ((await productsRepository.countVariants(productId)) <= 1) throw new ConflictError("A product must keep at least one variant");
    await productsRepository.deleteVariant(variantId);
    return this.adminGet(productId);
  },

  // ---- images ---------------------------------------------------------------
  async addImages(productId: string, inputs: z.infer<typeof imageInputSchema>[]) {
    const p = await loadOrThrow(productId);
    const variantByColor = new Map(p.variants.map((v) => [v.colorHex, v.id]));
    const start = p.images.length;
    await productsRepository.insertImages(
      inputs.map((img, i) => {
        const variantId = img.variantColorHex ? variantByColor.get(img.variantColorHex.toUpperCase()) : null;
        if (img.variantColorHex && !variantId) throw new BadRequestError(`Unknown variant colour ${img.variantColorHex}`);
        return { productId, variantId: variantId ?? null, url: img.url, alt: img.alt ?? null, sortOrder: img.sortOrder || start + i };
      }),
    );
    return this.adminGet(productId);
  },

  async deleteImage(productId: string, imageId: string) {
    const removed = await productsRepository.deleteImage(productId, imageId);
    if (!removed) throw new NotFoundError("Image", imageId);
    return this.adminGet(productId);
  },

  async reorderImages(productId: string, imageIds: string[]) {
    await loadOrThrow(productId);
    await productsRepository.reorderImages(productId, imageIds);
    return this.adminGet(productId);
  },
};
