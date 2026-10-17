import { env } from "../../config/env.js";
import { createLogger } from "../../config/logger.js";
import { db } from "../../db/index.js";
import { BadRequestError, NotFoundError } from "../../lib/errors.js";
import { localized } from "../../lib/i18n.js";
import { lensAddonsRepository, type LensAddonRow } from "../lens-addons/lens-addons.repository.js";
import { lensAddonsService } from "../lens-addons/lens-addons.service.js";
import { appointmentsRepository } from "../appointments/appointments.repository.js";
import { appointmentsService } from "../appointments/appointments.service.js";
import { prescriptionsService, toPrescriptionDto } from "../prescriptions/prescriptions.service.js";
import { LIVE_APPOINTMENT, resolveLineRx, type AppointmentSummary, type RxResolution } from "../prescriptions/rx-line.js";
import { toProductCard } from "../products/products.mapper.js";
import { productsRepository } from "../products/products.repository.js";
import { promoCodesService } from "../promo-codes/promo-codes.service.js";
import { cartRepository, type CartItemWithProduct, type CartWithItems } from "./cart.repository.js";
import type { AddCartItemInput, AttachLineAppointmentInput, CartDto, CartItemDto } from "./cart.schema.js";

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
  /** Prescription state for this line (see rx-line.ts). */
  rx: RxResolution;
}

export const appointmentSummary = (a: CartItemWithProduct["appointment"]): AppointmentSummary | null =>
  a ? { id: a.id, scheduledAt: a.scheduledAt.toISOString(), status: a.status, doctor: { id: a.doctor.id, name: localized(a.doctor, "name")! } } : null;

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
    const rx = resolveLineRx({ required: item.product.requiresPrescription, prescription: item.prescription, appointment: item.appointment });
    return { item, addons, unitPrice, lineTotal: unitPrice * item.quantity, available: issue === null, issue, rx };
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
    prescription: {
      required: item.product.requiresPrescription,
      mode: line.rx.mode,
      state: line.rx.state,
      ready: line.rx.ready,
      issue: line.rx.issue,
      prescription: item.prescription ? toPrescriptionDto(item.prescription) : null,
      appointment: appointmentSummary(item.appointment),
    },
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
    requiresPrescription: availableLines.some((l) => l.item.product.requiresPrescription),
    prescriptionsReady: availableLines.every((l) => l.rx.ready),
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

/** Validates a saved prescription as a line's source. */
async function resolveExistingRx(userId: string, prescriptionId: string) {
  await prescriptionsService.getUsable(userId, prescriptionId);
  return { prescriptionId, appointmentId: null };
}

/**
 * Validates an appointment as a line's source. If the exam already happened and
 * the clinic recorded a prescription, that prescription is linked straight away.
 */
async function resolveAppointmentRx(userId: string, appointmentId: string) {
  const appt = await appointmentsRepository.findOwned(userId, appointmentId);
  if (!appt) throw new NotFoundError("Appointment", appointmentId);
  if (appt.prescription) {
    await prescriptionsService.getUsable(userId, appt.prescription.id);
    return { prescriptionId: appt.prescription.id, appointmentId };
  }
  if (!LIVE_APPOINTMENT.includes(appt.status) && appt.status !== "completed") {
    throw new BadRequestError("That appointment was cancelled – book a new eye exam");
  }
  return { prescriptionId: null, appointmentId };
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

    // Optional prescription source chosen up front (can also be set later per line).
    let rx = { prescriptionId: null as string | null, appointmentId: null as string | null };
    if (input.prescriptionId || input.appointmentId) {
      if (!product.requiresPrescription) throw new BadRequestError("This product does not need a prescription");
      rx = input.prescriptionId ? await resolveExistingRx(userId, input.prescriptionId) : await resolveAppointmentRx(userId, input.appointmentId!);
    }

    // Stock check must include what's already in the cart for the same line.
    const cart = await cartRepository.getOrCreate(userId);
    const existing = cart.items.find(
      (i) =>
        i.variantId === variant.id &&
        i.variantLabel === variantLabel &&
        i.prescriptionId === rx.prescriptionId &&
        i.appointmentId === rx.appointmentId &&
        i.addonIds.length === addonIds.length &&
        i.addonIds.every((id, k) => id === addonIds[k]),
    );
    const wanted = (existing?.quantity ?? 0) + input.quantity;
    if (variant.stock < wanted) throw new BadRequestError(variant.stock === 0 ? "Out of stock" : `Only ${variant.stock} left in stock`);

    await cartRepository.upsertItem({ cartId: cart.id, productId: product.id, variantId: variant.id, quantity: input.quantity, addonIds, variantLabel, ...rx });
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

  /** Option 1 – fulfil the line with a prescription the customer already has. */
  async attachLinePrescription(userId: string, itemId: string, prescriptionId: string): Promise<CartDto> {
    const item = await this.ownedRxLine(userId, itemId);
    await cartRepository.setItemRx(item.id, await resolveExistingRx(userId, prescriptionId));
    log.debug({ userId, itemId, prescriptionId }, "Cart line prescription attached");
    return this.get(userId);
  },

  /**
   * Option 2 – fulfil the line with an eye exam. Either links an appointment the
   * customer already booked, or books a new slot (defaults reason to "rx").
   * When the clinic records the exam, the resulting prescription is linked here automatically.
   */
  async attachLineAppointment(userId: string, itemId: string, input: AttachLineAppointmentInput, userLocale: string | null): Promise<CartDto> {
    const item = await this.ownedRxLine(userId, itemId);
    const appointmentId = "appointmentId" in input ? input.appointmentId : (await appointmentsService.book(userId, input, userLocale)).id;
    await cartRepository.setItemRx(item.id, await resolveAppointmentRx(userId, appointmentId));
    log.debug({ userId, itemId, appointmentId }, "Cart line appointment attached");
    return this.get(userId);
  },

  async clearLineRx(userId: string, itemId: string): Promise<CartDto> {
    const item = await this.ownedRxLine(userId, itemId);
    await cartRepository.setItemRx(item.id, { prescriptionId: null, appointmentId: null });
    return this.get(userId);
  },

  /** A cart line of this user that needs a prescription. */
  async ownedRxLine(userId: string, itemId: string) {
    const cart = await cartRepository.getOrCreate(userId);
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) throw new NotFoundError("Cart item", itemId);
    if (!item.product.requiresPrescription) throw new BadRequestError("This item does not need a prescription");
    return item;
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
