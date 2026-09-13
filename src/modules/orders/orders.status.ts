import type { OrderStatus } from "../../db/schema/enums.js";
import type { LocalizedString } from "../../lib/i18n.js";

/**
 * Order state machine. Keeping it declarative makes the admin panel's
 * "next actions" trivial and prevents impossible transitions.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["lab", "onTheWay", "ready", "cancelled"],
  lab: ["onTheWay", "ready", "cancelled"],
  onTheWay: ["delivered", "cancelled"],
  ready: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => ORDER_TRANSITIONS[from].includes(to);

/** Statuses a customer may still cancel from. */
export const CUSTOMER_CANCELLABLE: readonly OrderStatus[] = ["pending", "confirmed"];

/** Steps rendered on the tracking screen, per delivery method. */
export const timelineFor = (deliveryMethod: "home" | "pickup"): OrderStatus[] =>
  deliveryMethod === "home" ? ["confirmed", "lab", "onTheWay", "delivered"] : ["confirmed", "lab", "ready", "delivered"];

export const STATUS_LABELS: Record<OrderStatus, LocalizedString> = {
  pending: { ar: "بانتظار التأكيد", en: "Pending confirmation" },
  confirmed: { ar: "تم تأكيد الطلب", en: "Order confirmed" },
  lab: { ar: "قيد التجهيز في المختبر", en: "In the lab" },
  onTheWay: { ar: "في الطريق إليك", en: "On the way" },
  ready: { ar: "جاهز للاستلام", en: "Ready for pickup" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  cancelled: { ar: "تم الإلغاء", en: "Cancelled" },
};
