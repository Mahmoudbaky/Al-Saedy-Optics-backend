import { z } from "zod";
import { createModuleRouter } from "../../lib/router.js";
import { dashboardService } from "./dashboard.service.js";

const admin = createModuleRouter({ prefix: "/api/v1/admin/dashboard", tags: ["Admin · Dashboard"], auth: "admin" });

admin.route({
  method: "get",
  path: "/overview",
  summary: "KPI cards: orders, revenue, customers, stock, clinic",
  handler: () => dashboardService.overview(),
});
admin.route({
  method: "get",
  path: "/revenue",
  summary: "Daily revenue & order count for charts",
  query: z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }),
  handler: ({ query }) => dashboardService.revenueByDay(query.days),
});
admin.route({
  method: "get",
  path: "/top-products",
  summary: "Best selling products",
  query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(10), days: z.coerce.number().int().min(1).max(365).default(30) }),
  handler: ({ query }) => dashboardService.topProducts(query.limit, query.days),
});

export const adminDashboardRouter = admin.router;
