import { eq } from "drizzle-orm";
import { createLogger } from "../../config/logger.js";
import { db } from "../../db/index.js";
import { orders, type AddressSnapshot, type PrescriptionSnapshot } from "../../db/schema/index.js";
import type { OrderStatus } from "../../db/schema/enums.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { pageMeta } from "../../lib/pagination.js";
import { addressesRepository } from "../addresses/addresses.repository.js";
import { cartRepository } from "../cart/cart.repository.js";
import { deliveryFeeFor, priceLines } from "../cart/cart.service.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { prescriptionsRepository } from "../prescriptions/prescriptions.repository.js";
import { assertUsableForOrder } from "../prescriptions/prescriptions.service.js";
import { productsRepository } from "../products/products.repository.js";
import { promoCodesRepository } from "../promo-codes/promo-codes.repository.js";
import { promoCodesService } from "../promo-codes/promo-codes.service.js";
import { toAdminOrderDto, toOrderDto } from "./orders.mapper.js";
import { ordersRepository, type OrderWithRelations } from "./orders.repository.js";
import type { AdminListOrdersQuery, CheckoutInput, updateOrderDetailsSchema } from "./orders.schema.js";
import { canTransition, CUSTOMER_CANCELLABLE, ORDER_TRANSITIONS, STATUS_LABELS } from "./orders.status.js";
import type { z } from "zod";
import type { PaginationQuery } from "../../lib/pagination.js";

const log = createLogger("orders");

/** Puts reserved stock / promo usage back when an order is cancelled. */
async function releaseOrder(order: OrderWithRelations, tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  for (const item of order.items) {
    if (item.variantId) await productsRepository.adjustVariantStock(item.variantId, item.quantity, tx);
    if (item.productId) await productsRepository.incrementSold(item.productId, -item.quantity, tx);
  }
  if (order.promoCode) await promoCodesRepository.incrementUsed(order.promoCode, -1, tx);
}

async function notifyStatus(order: OrderWithRelations, status: OrderStatus) {
  const label = STATUS_LABELS[status];
  await notificationsService.notify(
    order.userId,
    {
      title: { ar: `طلب #${order.number}`, en: `Order #${order.number}` },
      body: label,
      link: `/orders/${order.id}`,
    },
    order.user.locale,
  );
}

export const ordersService = {
  // ---- customer ---------------------------------------------------------------
  async checkout(userId: string, input: CheckoutInput) {
    const orderId = await db.transaction(async (tx) => {
      const cart = await cartRepository.getOrCreate(userId, tx);
      const lines = await priceLines(cart);
      if (lines.length === 0) throw new BadRequestError("Your cart is empty");
      const blocked = lines.filter((l) => !l.available);
      if (blocked.length) {
        throw new BadRequestError("Some items in your cart are unavailable", blocked.map((l) => ({ itemId: l.item.id, issue: l.issue })));
      }

      // Address (home delivery only)
      let address: AddressSnapshot | null = null;
      if (input.deliveryMethod === "home") {
        const row = input.addressId ? await addressesRepository.findOwned(userId, input.addressId, tx) : await addressesRepository.findDefault(userId, tx);
        if (!row) throw new BadRequestError(input.addressId ? "Address not found" : "Please add a delivery address");
        address = { recipientName: row.recipientName, phone: row.phone, city: row.city, area: row.area, street: row.street, building: row.building, notes: row.notes };
      }

      // Prescription (only when a line needs one)
      let prescription: PrescriptionSnapshot | null = null;
      const prescriptionId = input.prescriptionId ?? cart.prescriptionId;
      if (lines.some((l) => l.item.product.requiresPrescription)) {
        if (!prescriptionId) throw new BadRequestError("A prescription is required for the items in your cart");
        const rx = await prescriptionsRepository.findOwned(userId, prescriptionId, tx);
        if (!rx) throw new BadRequestError("Prescription not found");
        assertUsableForOrder(rx);
        prescription = { id: rx.id, od: { sph: rx.odSph, cyl: rx.odCyl, axis: rx.odAxis }, os: { sph: rx.osSph, cyl: rx.osCyl, axis: rx.osAxis }, pd: rx.pd, add: rx.addPower };
      }

      // Totals – recomputed server side, never trusted from the client.
      const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
      const promo = cart.promoCode ? await promoCodesService.evaluate(cart.promoCode, subtotal, tx) : null;
      const discount = promo?.discount ?? 0;
      const deliveryFee = deliveryFeeFor(subtotal - discount, input.deliveryMethod);
      const total = subtotal - discount + deliveryFee;

      // Card / wallet payments aren't integrated yet – they wait for staff confirmation.
      const initialStatus: OrderStatus = input.paymentMethod === "cod" ? "confirmed" : "pending";

      const order = await ordersRepository.create(
        {
          userId,
          status: initialStatus,
          deliveryMethod: input.deliveryMethod,
          paymentMethod: input.paymentMethod,
          paymentStatus: "unpaid",
          address,
          prescription,
          subtotal,
          discount,
          deliveryFee,
          total,
          promoCode: promo?.code ?? null,
          customerNote: input.note ?? null,
        },
        lines.map((l) => ({
          productId: l.item.productId,
          variantId: l.item.variantId,
          nameAr: l.item.product.nameAr,
          nameEn: l.item.product.nameEn,
          code: l.item.product.code,
          colorHex: l.item.variant.colorHex,
          imageUrl: l.item.product.images.find((i) => i.variantId === l.item.variantId)?.url ?? l.item.product.images[0]?.url ?? null,
          variantLabel: l.item.variantLabel,
          addons: l.addons.map((a) => ({ id: a.id, nameAr: a.nameAr, nameEn: a.nameEn, price: a.price })),
          unitPrice: l.unitPrice,
          quantity: l.item.quantity,
          lineTotal: l.lineTotal,
        })),
        tx,
      );

      // Reserve stock & bump counters
      for (const l of lines) {
        const updated = await productsRepository.adjustVariantStock(l.item.variantId, -l.item.quantity, tx);
        if (!updated || updated.stock < 0) throw new ConflictError("Stock changed while placing your order, please try again");
        await productsRepository.incrementSold(l.item.productId, l.item.quantity, tx);
      }
      if (promo) await promoCodesRepository.incrementUsed(promo.code, 1, tx);

      await ordersRepository.addEvent(order.id, "pending", null, null, tx);
      if (initialStatus === "confirmed") await ordersRepository.addEvent(order.id, "confirmed", null, null, tx);
      await cartRepository.clear(cart.id, tx);
      return order.id;
    });

    const order = (await ordersRepository.findById(orderId))!;
    log.info({ orderId, number: order.number, userId, total: order.total }, "Order placed");
    void notifyStatus(order, order.status);
    return toOrderDto(order);
  },

  async listMine(userId: string, query: PaginationQuery & { status?: OrderStatus }) {
    const filters = [eq(orders.userId, userId)];
    if (query.status) filters.push(eq(orders.status, query.status));
    const { rows, total } = await ordersRepository.list(filters, query);
    return { items: rows.map(toOrderDto), meta: pageMeta(total, query) };
  },

  async getMine(userId: string, id: string) {
    const order = await ordersRepository.findOwned(userId, id);
    if (!order) throw new NotFoundError("Order", id);
    return toOrderDto(order);
  },

  async cancelMine(userId: string, id: string, reason?: string) {
    const order = await ordersRepository.findOwned(userId, id);
    if (!order) throw new NotFoundError("Order", id);
    if (!CUSTOMER_CANCELLABLE.includes(order.status)) {
      throw new BadRequestError("This order can no longer be cancelled. Please contact the store.");
    }
    await db.transaction(async (tx) => {
      await ordersRepository.update(id, { status: "cancelled", cancelledAt: new Date(), cancelReason: reason ?? "Cancelled by customer" }, tx);
      await ordersRepository.addEvent(id, "cancelled", reason ?? "Cancelled by customer", userId, tx);
      await releaseOrder(order, tx);
    });
    log.info({ orderId: id, userId }, "Order cancelled by customer");
    return this.getMine(userId, id);
  },

  // ---- admin ---------------------------------------------------------------------
  async adminList(query: AdminListOrdersQuery) {
    const { rows, total } = await ordersRepository.list(ordersRepository.adminFilters(query), query);
    return { items: rows.map(toAdminOrderDto), meta: pageMeta(total, query) };
  },

  async adminGet(id: string) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new NotFoundError("Order", id);
    return { ...toAdminOrderDto(order), nextStatuses: ORDER_TRANSITIONS[order.status] };
  },

  async updateStatus(id: string, status: OrderStatus, note: string | undefined, actorId: string) {
    const order = await ordersRepository.findById(id);
    if (!order) throw new NotFoundError("Order", id);
    if (!canTransition(order.status, status)) {
      throw new BadRequestError(`Cannot move an order from '${order.status}' to '${status}'`, { allowed: ORDER_TRANSITIONS[order.status] });
    }
    await db.transaction(async (tx) => {
      await ordersRepository.update(
        id,
        {
          status,
          ...(status === "delivered" ? { deliveredAt: new Date(), paymentStatus: order.paymentMethod === "cod" ? "paid" : order.paymentStatus } : {}),
          ...(status === "cancelled" ? { cancelledAt: new Date(), cancelReason: note ?? "Cancelled by store" } : {}),
        },
        tx,
      );
      await ordersRepository.addEvent(id, status, note ?? null, actorId, tx);
      if (status === "cancelled") await releaseOrder(order, tx);
    });
    log.info({ orderId: id, from: order.status, to: status, actorId }, "Order status updated");
    const updated = (await ordersRepository.findById(id))!;
    void notifyStatus(updated, status);
    return this.adminGet(id);
  },

  async updateDetails(id: string, input: z.infer<typeof updateOrderDetailsSchema>) {
    const row = await ordersRepository.update(id, {
      ...(input.courierName !== undefined ? { courierName: input.courierName } : {}),
      ...(input.courierPhone !== undefined ? { courierPhone: input.courierPhone } : {}),
      ...(input.eta !== undefined ? { etaAr: input.eta?.ar ?? null, etaEn: input.eta?.en ?? null } : {}),
      ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
      ...(input.paymentStatus !== undefined ? { paymentStatus: input.paymentStatus } : {}),
    });
    if (!row) throw new NotFoundError("Order", id);
    return this.adminGet(id);
  },
};
