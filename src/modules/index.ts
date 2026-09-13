import { Router } from "express";
import { addressesRouter } from "./addresses/addresses.routes.js";
import { adminAppointmentsRouter, adminDoctorsRouter, appointmentsRouter, clinicRouter } from "./appointments/appointments.routes.js";
import { adminBannersRouter, bannersRouter } from "./banners/banners.routes.js";
import { adminBrandsRouter, brandsRouter } from "./brands/brands.routes.js";
import { cartRouter } from "./cart/cart.routes.js";
import { adminCategoriesRouter, categoriesRouter } from "./categories/categories.routes.js";
import { adminDashboardRouter } from "./dashboard/dashboard.routes.js";
import { homeRouter } from "./home/home.routes.js";
import { adminLensAddonsRouter, lensAddonsRouter } from "./lens-addons/lens-addons.routes.js";
import { devicesRouter, notificationsRouter } from "./notifications/notifications.routes.js";
import { adminOrdersRouter, ordersRouter } from "./orders/orders.routes.js";
import { adminPrescriptionsRouter, prescriptionsRouter } from "./prescriptions/prescriptions.routes.js";
import { adminProductsRouter, productsRouter } from "./products/products.routes.js";
import { adminPromoCodesRouter } from "./promo-codes/promo-codes.routes.js";
import { adminReviewsRouter, reviewsRouter } from "./reviews/reviews.routes.js";
import { adminUsersRouter, meRouter } from "./users/users.routes.js";
import { wishlistRouter } from "./wishlist/wishlist.routes.js";

/**
 * Mounts every module under /api/v1.
 *  - public catalogue:      /home, /categories, /brands, /products, /lens-addons, /banners, /clinic
 *  - signed-in customer:    /me/*
 *  - admin panel:           /admin/*
 */
export const apiRouter = Router();

// Public
apiRouter.use("/home", homeRouter);
apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/brands", brandsRouter);
apiRouter.use("/lens-addons", lensAddonsRouter);
apiRouter.use("/products/:productId/reviews", reviewsRouter);
apiRouter.use("/products", productsRouter);
apiRouter.use("/banners", bannersRouter);
apiRouter.use("/clinic", clinicRouter);

// Customer (session required)
apiRouter.use("/me/addresses", addressesRouter);
apiRouter.use("/me/prescriptions", prescriptionsRouter);
apiRouter.use("/me/wishlist", wishlistRouter);
apiRouter.use("/me/cart", cartRouter);
apiRouter.use("/me/orders", ordersRouter);
apiRouter.use("/me/appointments", appointmentsRouter);
apiRouter.use("/me/notifications", notificationsRouter);
apiRouter.use("/me/devices", devicesRouter);
apiRouter.use("/me", meRouter);

// Admin panel
apiRouter.use("/admin/dashboard", adminDashboardRouter);
apiRouter.use("/admin/categories", adminCategoriesRouter);
apiRouter.use("/admin/brands", adminBrandsRouter);
apiRouter.use("/admin/lens-addons", adminLensAddonsRouter);
apiRouter.use("/admin/products", adminProductsRouter);
apiRouter.use("/admin/orders", adminOrdersRouter);
apiRouter.use("/admin/users", adminUsersRouter);
apiRouter.use("/admin/prescriptions", adminPrescriptionsRouter);
apiRouter.use("/admin/reviews", adminReviewsRouter);
apiRouter.use("/admin/promo-codes", adminPromoCodesRouter);
apiRouter.use("/admin/banners", adminBannersRouter);
apiRouter.use("/admin/appointments", adminAppointmentsRouter);
apiRouter.use("/admin/doctors", adminDoctorsRouter);
