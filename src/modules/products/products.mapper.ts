import { localized } from "../../lib/i18n.js";
import type { ProductWithRelations } from "./products.repository.js";
import type { ProductCardDto, ProductDetailDto } from "./products.schema.js";

const NEW_ARRIVAL_DAYS = 30;

export const discountPercent = (price: number, compareAt: number | null) =>
  compareAt && compareAt > price ? Math.round((1 - price / compareAt) * 100) : 0;

/** Primary image: first product-level image, else first variant image. */
function primaryImage(p: ProductWithRelations): string | null {
  return p.images.find((i) => !i.variantId)?.url ?? p.images[0]?.url ?? null;
}

export function toProductCard(p: ProductWithRelations): ProductCardDto {
  const activeVariants = p.variants.filter((v) => v.isActive);
  return {
    id: p.id,
    slug: p.slug,
    code: p.code,
    name: localized(p, "name")!,
    brand: p.brand ? { id: p.brand.id, slug: p.brand.slug, name: localized(p.brand, "name")! } : null,
    category: { id: p.category.id, slug: p.category.slug, name: localized(p.category, "name")! },
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    discountPercent: discountPercent(p.price, p.compareAtPrice),
    shape: p.shape,
    gender: p.gender,
    colors: activeVariants.map((v) => v.colorHex),
    note: localized(p, "note"),
    image: primaryImage(p),
    isBestSeller: p.isBestSeller,
    isNew: Date.now() - p.createdAt.getTime() < NEW_ARRIVAL_DAYS * 86_400_000,
    inStock: activeVariants.some((v) => v.stock > 0),
    rating: { average: p.ratingAvg / 100, count: p.ratingCount },
    isActive: p.isActive,
  };
}

export function toProductDetail(p: ProductWithRelations, related: ProductWithRelations[]): ProductDetailDto {
  return {
    ...toProductCard(p),
    description: localized(p, "description"),
    specs: p.specs ?? null,
    supportsLensAddons: p.supportsLensAddons,
    requiresPrescription: p.requiresPrescription,
    images: p.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt, sortOrder: i.sortOrder, variantId: i.variantId })),
    variants: p.variants.map((v) => ({
      id: v.id,
      colorHex: v.colorHex,
      colorName: localized(v, "colorName"),
      sku: v.sku,
      stock: v.stock,
      inStock: v.stock > 0,
      sortOrder: v.sortOrder,
      isActive: v.isActive,
      images: p.images.filter((i) => i.variantId === v.id).map((i) => i.url),
    })),
    related: related.map(toProductCard),
    soldCount: p.soldCount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
