import express from "express";
import { protect, authorize } from "../middleware/auth.js";

import * as orderControllers from "../controllers/orderControllers.js";

export const router = express.Router();

/**
 * @openapi
 * /api/orders/create:
 *   post:
 *     summary: Create a new order from the user's active cart
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shippingAddress
 *             properties:
 *               shippingAddress:
 *                 type: string
 *                 example: "123 Main St, Cairo, Egypt"
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 64c7a7f1d3a2f1a2b3c4d5e8
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                               name:
 *                                 type: string
 *                                 example: Product A
 *                               price:
 *                                 type: number
 *                                 example: 99.99
 *                               image:
 *                                 type: string
 *                                 example: "https://example.com/product.jpg"
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 99.99
 *                     totalAmount:
 *                       type: number
 *                       example: 199.98
 *                     shippingAddress:
 *                       type: string
 *                       example: "123 Main St, Cairo, Egypt"
 *                     status:
 *                       type: string
 *                       example: pending
 *       400:
 *         description: Bad request (missing address, empty cart, or product unavailable)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Cart is empty
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Not authorized to access this route
 *       500:
 *         description: Server error creating order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Error creating order
 */

router.post(
  "/create",
  protect,
  authorize("user", "admin"),
  orderControllers.createOrder
);

/**
 * @openapi
 * /api/orders/user-orders:
 *   get:
 *     summary: Get paginated orders for the authenticated user
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Orders retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     _id:
 *                                       type: string
 *                                       example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                                     name:
 *                                       type: string
 *                                       example: Product A
 *                                     price:
 *                                       type: number
 *                                       example: 49.99
 *                                     image:
 *                                       type: string
 *                                       example: "https://example.com/product.jpg"
 *                                 quantity:
 *                                   type: integer
 *                                   example: 2
 *                                 price:
 *                                   type: number
 *                                   example: 49.99
 *                           totalAmount:
 *                             type: number
 *                             example: 99.98
 *                           status:
 *                             type: string
 *                             example: pending
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-08-01T12:34:56.789Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalOrders:
 *                           type: integer
 *                           example: 42
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       500:
 *         description: Error retrieving orders
 */

router.get(
  "/user-orders",
  protect,
  authorize("user", "admin"),
  orderControllers.getUserOrders
);

/**
 * @openapi
 * /api/orders/user-order/{orderId}:
 *   get:
 *     summary: Get a specific order by ID for the authenticated user
 *     description: Retrieve a single order by its ID. The authenticated user can only access their own orders.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 64c7a7f1d3a2f1a2b3c4d5e8
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                               name:
 *                                 type: string
 *                                 example: Product A
 *                               price:
 *                                 type: number
 *                                 example: 49.99
 *                               image:
 *                                 type: string
 *                                 example: "https://example.com/product.jpg"
 *                               description:
 *                                 type: string
 *                                 example: "A high-quality product"
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 49.99
 *                     totalAmount:
 *                       type: number
 *                       example: 99.98
 *                     shippingAddress:
 *                       type: string
 *                       example: "123 Main St, Cairo, Egypt"
 *                     status:
 *                       type: string
 *                       example: pending
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-01T12:34:56.789Z
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Error retrieving order
 */
router.get(
  "/user-order/:orderId",
  protect,
  authorize("user", "admin"),
  orderControllers.getOrderById
);

/**
 * @openapi
 * /api/orders/cancel/{orderId}:
 *   put:
 *     summary: Cancel a pending order
 *     description: Allows an authenticated user to cancel one of their own orders, only if it is still pending.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the order to cancel
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order cancelled successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                     status:
 *                       type: string
 *                       example: cancelled
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                               name:
 *                                 type: string
 *                                 example: Product A
 *                               price:
 *                                 type: number
 *                                 example: 49.99
 *                               image:
 *                                 type: string
 *                                 example: "https://example.com/product.jpg"
 *                           quantity:
 *                             type: integer
 *                             example: 1
 *                           price:
 *                             type: number
 *                             example: 49.99
 *                     totalAmount:
 *                       type: number
 *                       example: 49.99
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-01T12:34:56.789Z
 *       400:
 *         description: Only pending orders can be cancelled
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       404:
 *         description: Order not found
 *       500:
 *         description: Error cancelling order
 */

router.put(
  "/cancel/:orderId",
  protect,
  authorize("user", "admin"),
  orderControllers.cancelOrder
);

/**
 * @openapi
 * /api/orders/admin-get-all-orders:
 *   get:
 *     summary: Get all orders (Admin only)
 *     description: Retrieves a paginated list of all orders. Only accessible by admin users. Supports optional filtering by order status.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of orders per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, completed, cancelled]
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: All orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: All orders retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     orders:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                           status:
 *                             type: string
 *                             example: pending
 *                           items:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     _id:
 *                                       type: string
 *                                       example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                                     name:
 *                                       type: string
 *                                       example: Product A
 *                                     price:
 *                                       type: number
 *                                       example: 49.99
 *                                     image:
 *                                       type: string
 *                                       example: "https://example.com/product.jpg"
 *                                 quantity:
 *                                   type: integer
 *                                   example: 2
 *                                 price:
 *                                   type: number
 *                                   example: 99.98
 *                           user:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c7b8f2d3a2f1a2b3c4d5f1
 *                               email:
 *                                 type: string
 *                                 example: user@example.com
 *                           totalAmount:
 *                             type: number
 *                             example: 199.99
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: 2025-08-01T12:34:56.789Z
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalOrders:
 *                           type: integer
 *                           example: 42
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrev:
 *                           type: boolean
 *                           example: false
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Access denied. Admin only
 *       500:
 *         description: Error retrieving orders
 */
router.get(
  "/admin-get-all-orders",
  protect,
  authorize("admin"),
  orderControllers.getAllOrders
);

/**
 * @openapi
 * /api/orders/admin-update-order/{orderId}:
 *   put:
 *     summary: Update order status (Admin only)
 *     description: Allows an admin to update the status of an order. Valid statuses are `pending`, `completed`, or `cancelled`.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the order to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, completed, cancelled]
 *                 example: completed
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order status updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9b1f2d3a2f1a2b3c4d5f8
 *                     status:
 *                       type: string
 *                       example: completed
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c7a7f1d3a2f1a2b3c4d5f9
 *                               name:
 *                                 type: string
 *                                 example: Product A
 *                               price:
 *                                 type: number
 *                                 example: 49.99
 *                               image:
 *                                 type: string
 *                                 example: "https://example.com/product.jpg"
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 99.98
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: 64c7b8f2d3a2f1a2b3c4d5f1
 *                         email:
 *                           type: string
 *                           example: user@example.com
 *                     totalAmount:
 *                       type: number
 *                       example: 199.99
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-01T12:34:56.789Z
 *       400:
 *         description: Invalid status provided
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Access denied. Admin only
 *       404:
 *         description: Order not found
 *       500:
 *         description: Error updating order status
 */
router.put(
  "/admin-update-order/:orderId",
  protect,
  authorize("admin"),
  orderControllers.updateOrderStatus
);

/**
 * @openapi
 * /api/orders/admin-orders-stats:
 *   get:
 *     summary: Get order statistics (Admin only)
 *     description: Returns aggregated statistics about orders, including counts by status and total revenue from completed orders.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Order statistics retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalOrders:
 *                       type: integer
 *                       example: 120
 *                     pendingOrders:
 *                       type: integer
 *                       example: 25
 *                     completedOrders:
 *                       type: integer
 *                       example: 80
 *                     cancelledOrders:
 *                       type: integer
 *                       example: 15
 *                     totalRevenue:
 *                       type: number
 *                       format: float
 *                       example: 4599.75
 *       401:
 *         description: Unauthorized - Missing or invalid token
 *       403:
 *         description: Access denied. Admin only
 *       500:
 *         description: Error retrieving order statistics
 */

router.get(
  "/admin-orders-stats",
  protect,
  authorize("admin"),
  orderControllers.getOrderStats
);

export default router;
