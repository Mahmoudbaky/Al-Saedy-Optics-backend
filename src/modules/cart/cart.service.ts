import { env } from "../../config/env.js";
import { createLogger } from "../../config/logger.js";
import { db } from "../../db/index.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { localized } from "../../lib/i18n.js";
import { lensAddonsRepository, type LensAddonRow } from "../lens-addons/lens-addons.repository.js";
import { lensAddonsService } from "../lens-addons/lens-addons.service.js";
import { prescriptionsService, toPrescriptionDto } from "../prescriptions/prescriptions.service.js";
import { toProductCard } from "../products/products.mapper.js";
import { productsRepository } from "../products/products.repository.js";
import { promoCodesService } from "../promo-codes/promo-codes.service.js";
import { cartRepository, type CartItemWithProduct, type CartWithItems } from "./cart.repository.js";
import type { AddCartItemInput, CartDto, CartItemDto } from "./cart.schema.js";

const log = createLogger("cart");

/** Delivery fee rule shared by cart preview and checkout. */
export function deliveryFeeFor(subtotal: number, method: "home" | "pickup"): number {
  if (method === "pickup" || subtotal <= 0) return 0;
  return subtotal >= env.FREE_DELIVERY_THRESHOLD ? 0 : env.DELIVERY_FEE;
}

/** A priced cart line – the single source of truth reused by checkout. */
export interface PricedLine {
  item: CartItemWithProduct;
  addons: LensAddonRow[];
  unitPrice: number;
  lineTotal: number;
  available: boolean;
  issue: string | null;
}

export async function priceLines(cart: CartWithItems): Promise<PricedLine[]> {
  const addonIds = [...new Set(cart.items.flatMap((i) => i.addonIds))];
  const addonRows = await lensAddonsRepository.findManyActive(addonIds);
  const addonById = new Map(addonRows.map((a) => [a.id, a]));

  return cart.items.map((item) => {
    const addons = item.addonIds.map((id) => addonById.get(id)).filter((a): a is LensAddonRow => Boolean(a));
    const unitPrice = item.product.price + addons.reduce((s, a) => s + a.price, 0);
    let issue: string | null = null;
    if (!item.product.isActive) issue = "Product is no longer available";
    else if (!item.variant.isActive) issue = "This colour is no longer available";
    else if (item.variant.stock <= 0) issue = "Out of stock";
    else if (item.variant.stock < item.quantity) issue = `Only ${item.variant.stock} left in stock`;
    else if (addons.length !== item.addonIds.length || addons.some((a) => !a.isActive)) issue = "A selected lens add-on is no longer available";
    return { item, addons, unitPrice, lineTotal: unitPrice * item.quantity, available: issue === null, issue };
  });
}

function toItemDto(line: PricedLine): CartItemDto {
  const { item } = line;
  return {
    id: item.id,
    product: toProductCard(item.product),
    variant: { id: item.variant.id, colorHex: item.variant.colorHex, colorName: localized(item.variant, "colorName"), stock: item.variant.stock },
    quantity: item.quantity,
    addons: line.addons.map((a) => ({ id: a.id, name: localized(a, "name")!, price: a.price })),
    variantLabel: item.variantLabel || null,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    available: line.available,
    issue: line.issue,
  };
}

export async function buildCartDto(cart: CartWithItems): Promise<CartDto> {
  const lines = await priceLines(cart);
  const availableLines = lines.filter((l) => l.available);
  const subtotal = availableLines.reduce((s, l) => s + l.lineTotal, 0);
  const promo = await promoCodesService.tryEvaluate(cart.promoCode, subtotal);
  const deliveryFee = deliveryFeeFor(subtotal - promo.discount, "home");
  return {
    id: cart.id,
    items: lines.map(toItemDto),
    prescription: cart.prescription ? toPrescriptionDto(cart.prescription) : null,
    requiresPrescription: availableLines.some((l) => l.item.product.requiresPrescription),
    promo: { code: cart.promoCode, discount: promo.discount, error: promo.error ?? null },
    summary: {
      itemCount: availableLines.reduce((s, l) => s + l.item.quantity, 0),
      subtotal,
      discount: promo.discount,
      deliveryFee,
      freeDeliveryThreshold: env.FREE_DELIVERY_THRESHOLD,
      total: subtotal - promo.discount + deliveryFee,
      currency: env.CURRENCY,
    },
  };
}

export const cartService = {
  async get(userId: string): Promise<CartDto> {
    return buildCartDto(await cartRepository.getOrCreate(userId));
  },

  async addItem(userId: string, input: AddCartItemInput): Promise<CartDto> {
    const product = await productsRepository.findById(input.productId);
    if (!product || !product.isActive) throw new NotFoundError("Product", input.productId);

    const variant = input.variantId
      ? product.variants.find((v) => v.id === input.variantId)
      : product.variants.find((v) => v.isActive && v.stock > 0) ?? product.variants.find((v) => v.isActive);
    if (!variant || !variant.isActive) throw new BadRequestError("Selected colour is not available");

    if (input.addonIds.length && !product.supportsLensAddons) throw new BadRequestError("This product does not support lens add-ons");
    const addons = await lensAddonsService.resolveActive(input.addonIds);
    const addonIds = addons.map((a) => a.id).sort();
    const variantLabel = input.variantLabel ?? "";

    // Stock check must include what's already in the cart for the same line.
    const cart = await cartRepository.getOrCreate(userId);
    const existing = cart.items.find(
      (i) => i.variantId === variant.id && i.variantLabel === variantLabel && i.addonIds.length === addonIds.length && i.addonIds.every((id, k) => id === addonIds[k]),
    );
    const wanted = (existing?.quantity ?? 0) + input.quantity;
    if (variant.stock < wanted) throw new BadRequestError(variant.stock === 0 ? "Out of stock" : `Only ${variant.stock} left in stock`);

    await cartRepository.upsertItem({ cartId: cart.id, productId: product.id, variantId: variant.id, quantity: input.quantity, addonIds, variantLabel });
    log.debug({ userId, productId: product.id, variantId: variant.id, qty: input.quantity }, "Cart item added");
    return this.get(userId);
  },

  async updateItem(userId: string, itemId: string, quantity: number): Promise<CartDto> {
    const cart = await cartRepository.getOrCreate(userId);
    const item = await cartRepository.findItem(cart.id, itemId);
    if (!item) throw new NotFoundError("Cart item", itemId);
    if (quantity === 0) {
      await cartRepository.deleteItem(itemId);
    } else {
      const variant = cart.items.find((i) => i.id === itemId)?.variant;
      if (variant && variant.stock < quantity) throw new BadRequestError(`Only ${variant.stock} left in stock`);
      await cartRepository.setItemQuantity(itemId, quantity);
    }
    return this.get(userId);
  },

  async removeItem(userId: string, itemId: string): Promise<CartDto> {
    const cart = await cartRepository.getOrCreate(userId);
    if (!(await cartRepository.findItem(cart.id, itemId))) throw new NotFoundError("Cart item", itemId);
    await cartRepository.deleteItem(itemId);
    return this.get(userId);
  },

  async clear(userId: string): Promise<CartDto> {
    const cart = await cartRepository.getOrCreate(userId);
    await cartRepository.clear(cart.id);
    return this.get(userId);
  },

  async attachPrescription(userId: string, prescriptionId: string | null): Promise<CartDto> {
    const cart = await cartRepository.getOrCreate(userId);
    if (prescriptionId) await prescriptionsService.getUsable(userId, prescriptionId);
    await cartRepository.update(cart.id, { prescriptionId });
    return this.get(userId);
  },

  async applyPromo(userId: string, code: string | null): Promise<CartDto> {
    const cart = await cartRepository.getOrCreate(userId);
    if (code) {
      const dto = await buildCartDto(cart);
      await promoCodesService.evaluate(code, dto.summary.subtotal); // throws a readable 400 when not applicable
    }
    await cartRepository.update(cart.id, { promoCode: code });
    return this.get(userId);
  },

  /** Used by checkout inside its transaction. */
  loadForCheckout: (userId: string, tx: typeof db) => cartRepository.getOrCreate(userId, tx),
};
