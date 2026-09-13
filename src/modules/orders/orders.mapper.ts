import { env } from "../../config/env.js";
import { formatAddress } from "../addresses/addresses.service.js";
import { CUSTOMER_CANCELLABLE, timelineFor } from "./orders.status.js";
import type { OrderWithRelations } from "./orders.repository.js";
import type { AdminOrderDto, OrderDto } from "./orders.schema.js";

export function toOrderDto(o: OrderWithRelations): OrderDto {
  const steps = timelineFor(o.deliveryMethod);
  const eventByStatus = new Map(o.events.map((e) => [e.status, e]));
  const timeline = steps.map((status) => {
    const ev = eventByStatus.get(status);
    return { status, at: ev?.createdAt.toISOString() ?? null, note: ev?.note ?? null };
  });
  if (o.status === "cancelled") {
    const ev = eventByStatus.get("cancelled");
    timeline.push({ status: "cancelled", at: ev?.createdAt.toISOString() ?? o.cancelledAt?.toISOString() ?? null, note: ev?.note ?? null });
  }

  return {
    id: o.id,
    number: o.number,
    status: o.status,
    deliveryMethod: o.deliveryMethod,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    address: o.address
      ? {
          recipientName: o.address.recipientName,
          phone: o.address.phone,
          city: o.address.city,
          area: o.address.area,
          street: o.address.street ?? null,
          building: o.address.building ?? null,
          notes: o.address.notes ?? null,
          formatted: formatAddress(o.address),
        }
      : null,
    prescription: o.prescription ?? null,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      name: { ar: i.nameAr, en: i.nameEn },
      code: i.code,
      colorHex: i.colorHex,
      imageUrl: i.imageUrl,
      variantLabel: i.variantLabel || null,
      addons: i.addons.map((a) => ({ id: a.id, name: { ar: a.nameAr, en: a.nameEn }, price: a.price })),
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      lineTotal: i.lineTotal,
    })),
    itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
    subtotal: o.subtotal,
    discount: o.discount,
    deliveryFee: o.deliveryFee,
    total: o.total,
    currency: env.CURRENCY,
    promoCode: o.promoCode,
    customerNote: o.customerNote,
    courier: o.courierName ? { name: o.courierName, phone: o.courierPhone } : null,
    eta: o.etaAr || o.etaEn ? { ar: o.etaAr ?? o.etaEn ?? "", en: o.etaEn ?? o.etaAr ?? "" } : null,
    timeline,
    canCancel: CUSTOMER_CANCELLABLE.includes(o.status),
    cancelReason: o.cancelReason,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export function toAdminOrderDto(o: OrderWithRelations): AdminOrderDto {
  return {
    ...toOrderDto(o),
    adminNote: o.adminNote,
    user: { id: o.user.id, name: o.user.name, email: o.user.email, phone: o.user.phone },
    events: o.events.map((e) => ({ status: e.status, at: e.createdAt.toISOString(), note: e.note, actorId: e.actorId })),
  };
}
