import { and, count, eq, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import { prescriptions, productVariants, products } from "../../db/schema/index.js";
import { appointmentsRepository } from "../appointments/appointments.repository.js";
import { ordersRepository } from "../orders/orders.repository.js";
import { usersRepository } from "../users/users.repository.js";

const LOW_STOCK_THRESHOLD = 3;

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = () => {
  const d = startOfToday();
  d.setDate(1);
  return d;
};

export const dashboardService = {
  async overview() {
    const [byStatus, today, month, allTime, customers, newCustomers, [lowStock], [pendingRx], upcomingAppointments, [activeProducts]] = await Promise.all([
      ordersRepository.countByStatus(),
      ordersRepository.revenue(startOfToday()),
      ordersRepository.revenue(startOfMonth()),
      ordersRepository.revenue(null),
      usersRepository.countCustomers(null),
      usersRepository.countCustomers(startOfMonth()),
      db
        .select({ n: count() })
        .from(productVariants)
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(and(eq(products.isActive, true), eq(productVariants.isActive, true), lte(productVariants.stock, LOW_STOCK_THRESHOLD))),
      db.select({ n: count() }).from(prescriptions).where(eq(prescriptions.status, "pending")),
      appointmentsRepository.countUpcoming(),
      db.select({ n: count() }).from(products).where(eq(products.isActive, true)),
    ]);

    return {
      orders: {
        byStatus,
        needsAction: (byStatus.pending ?? 0) + (byStatus.confirmed ?? 0) + (byStatus.lab ?? 0),
        total: Object.values(byStatus).reduce((s, n) => s + (n ?? 0), 0),
      },
      revenue: { today: today.total, month: month.total, allTime: allTime.total, deliveredOrders: allTime.orders },
      customers: { total: customers, newThisMonth: newCustomers },
      catalog: { activeProducts: activeProducts?.n ?? 0, lowStockVariants: lowStock?.n ?? 0, lowStockThreshold: LOW_STOCK_THRESHOLD },
      clinic: { pendingPrescriptions: pendingRx?.n ?? 0, upcomingAppointments },
    };
  },

  revenueByDay: (days: number) => ordersRepository.revenueByDay(days),
  topProducts: (limit: number, days: number) =>
    ordersRepository.topProducts(limit, days).then((rows) => rows.map((r) => ({ productId: r.productId, name: { ar: r.nameAr, en: r.nameEn }, quantity: r.quantity, revenue: r.revenue }))),
};
