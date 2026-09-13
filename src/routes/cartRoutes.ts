import express from "express";
import { protect, authorize } from "../middleware/auth.js";

import * as cartController from "../controllers/cartControllers.js";

export const router = express.Router();

/**
 * @openapi
 * /api/cart/get-cart:
 *   get:
 *     summary: Get the active cart of the logged-in user
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved cart or empty cart
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
 *                   example: Cart retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9a9f2d3a2f1a2b3c4d5f7
 *                     user:
 *                       type: string
 *                       example: 64c7a7f1d3a2f1a2b3c4d5e8
 *                     items:
 *                       type: array
 *                       example: []
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                               name:
 *                                 type: string
 *                                 example: iPhone 15
 *                               price:
 *                                 type: number
 *                                 example: 1199.99
 *                               image:
 *                                 type: string
 *                                 example: https://example.com/images/iphone15.png
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 1199.99
 *                     totalAmount:
 *                       type: number
 *                       example: 2399.98
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
 *         description: Error retrieving cart
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
 *                   example: Error retrieving cart
 */

router.get(
  "/get-cart",
  protect,
  authorize("user", "admin"),
  cartController.getCart
);

/**
 * @openapi
 * /api/cart/add-to-cart:
 *   post:
 *     summary: Add an item to the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *               quantity:
 *                 type: integer
 *                 example: 2
 *                 default: 1
 *     responses:
 *       200:
 *         description: Item added to cart successfully
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
 *                   example: Item added to cart successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9a9f2d3a2f1a2b3c4d5f7
 *                     user:
 *                       type: string
 *                       example: 64c7a7f1d3a2f1a2b3c4d5e8
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
 *                                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                               name:
 *                                 type: string
 *                                 example: iPhone 15
 *                               price:
 *                                 type: number
 *                                 example: 1199.99
 *                               image:
 *                                 type: string
 *                                 example: https://example.com/images/iphone15.png
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 1199.99
 *                     totalAmount:
 *                       type: number
 *                       example: 2399.98
 *       400:
 *         description: Product is not available
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
 *                   example: Product is not available
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
 *       404:
 *         description: Product not found
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
 *                   example: Product not found
 *       500:
 *         description: Error adding item to cart
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
 *                   example: Error adding item to cart
 */

router.post(
  "/add-to-cart",
  protect,
  authorize("user", "admin"),
  cartController.addToCart
);

/**
 * @openapi
 * /api/cart/update-cart:
 *   put:
 *     summary: Update quantity of an item in the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *               quantity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       200:
 *         description: Cart item updated successfully
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
 *                   example: Cart item updated successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9a9f2d3a2f1a2b3c4d5f7
 *                     user:
 *                       type: string
 *                       example: 64c7a7f1d3a2f1a2b3c4d5e8
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
 *                                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                               name:
 *                                 type: string
 *                                 example: iPhone 15
 *                               price:
 *                                 type: number
 *                                 example: 1199.99
 *                               image:
 *                                 type: string
 *                                 example: https://example.com/images/iphone15.png
 *                           quantity:
 *                             type: integer
 *                             example: 3
 *                           price:
 *                             type: number
 *                             example: 1199.99
 *                     totalAmount:
 *                       type: number
 *                       example: 3599.97
 *       400:
 *         description: Invalid quantity
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
 *                   example: Quantity must be at least 1
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
 *       404:
 *         description: Cart or item not found
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
 *                   example: Item not found in cart
 *       500:
 *         description: Error updating cart item
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
 *                   example: Error updating cart item
 */

router.put(
  "/update-cart",
  protect,
  authorize("user", "admin"),
  cartController.updateCartItem
);

/**
 * @openapi
 * /api/cart/remove-from-cart/{productId}:
 *   delete:
 *     summary: Remove an item from the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *             properties:
 *               productId:
 *                 type: string
 *                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *     responses:
 *       200:
 *         description: Item removed from cart successfully
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
 *                   example: Item removed from cart successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9a9f2d3a2f1a2b3c4d5f7
 *                     user:
 *                       type: string
 *                       example: 64c7a7f1d3a2f1a2b3c4d5e8
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
 *                                 example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                               name:
 *                                 type: string
 *                                 example: iPhone 15
 *                               price:
 *                                 type: number
 *                                 example: 1199.99
 *                               image:
 *                                 type: string
 *                                 example: https://example.com/images/iphone15.png
 *                           quantity:
 *                             type: integer
 *                             example: 2
 *                           price:
 *                             type: number
 *                             example: 1199.99
 *                     totalAmount:
 *                       type: number
 *                       example: 2399.98
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
 *       404:
 *         description: Cart not found
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
 *                   example: Cart not found
 *       500:
 *         description: Error removing item from cart
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
 *                   example: Error removing item from cart
 */

router.delete(
  "/remove-from-cart/:productId",
  protect,
  authorize("user", "admin"),
  cartController.removeFromCart
);

/**
 * @openapi
 * /api/cart/clear-cart:
 *   delete:
 *     summary: Clear all items from the logged-in user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared or already empty
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
 *                   example: Cart cleared successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c9a9f2d3a2f1a2b3c4d5f7
 *                     user:
 *                       type: string
 *                       example: 64c7a7f1d3a2f1a2b3c4d5e8
 *                     items:
 *                       type: array
 *                       example: []
 *                     totalAmount:
 *                       type: number
 *                       example: 0
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
 *         description: Error clearing cart
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
 *                   example: Error clearing cart
 */
router.delete(
  "/clear-cart",
  protect,
  authorize("user", "admin"),
  cartController.clearCart
);

export default router;
