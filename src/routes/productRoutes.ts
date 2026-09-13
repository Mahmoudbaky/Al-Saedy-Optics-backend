import express from "express";
import { protect, authorize } from "../middleware/auth.js";

import * as productControllers from "../controllers/productControllers.js";

export const router = express.Router();

/**
 * @openapi
 * /api/products/create:
 *   post:
 *     summary: Create a new product
 *     tags:
 *       - Products
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: iPhone 15
 *               brand:
 *                 type: string
 *                 example: Apple
 *               description:
 *                 type: string
 *                 example: Latest Apple smartphone with A17 chip
 *               price:
 *                 type: number
 *                 example: 1199.99
 *               category:
 *                 type: string
 *                 example: 64c8e8f1d3a2f1a2b3c4d5e6   # categoryId
 *               stock:
 *                 type: integer
 *                 example: 50
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: https://example.com/images/iphone15.png
 *               banner:
 *                 type: string
 *                 example: https://example.com/images/iphone15-banner.png
 *               deliveryDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-09-15T12:00:00Z
 *               stars:
 *                 type: integer
 *                 example: 4
 *               discount:
 *                 type: integer
 *                 example: 10
 *               saleRate:
 *                 type: integer
 *                 example: 1000
 *     responses:
 *       201:
 *         description: Product created successfully
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
 *                   example: Product created successfully
 *       400:
 *         description: Invalid product data
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
 *                   example: Invalid product data
 *                 errors:
 *                   type: object
 *                   description: Validation error details
 *       500:
 *         description: Internal server error
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
 *                   example: Internal server error
 */

router.post(
  "/create-product",
  protect,
  authorize("user", "admin"),
  productControllers.createProduct
);

/**
 * @openapi
 * /api/products/update/{id}:
 *   put:
 *     summary: Update an existing product
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - category
 *             properties:
 *               name:
 *                 type: string
 *                 example: iPhone 15 Pro
 *               description:
 *                 type: string
 *                 example: Updated description for iPhone 15 Pro
 *               price:
 *                 type: number
 *                 example: 1299.99
 *               category:
 *                 type: string
 *                 example: 64c8e8f1d3a2f1a2b3c4d5e6   # categoryId
 *               stock:
 *                 type: integer
 *                 example: 40
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   example: https://example.com/images/iphone15-pro.png
 *               banner:
 *                 type: string
 *                 example: https://example.com/images/iphone15-banner.png
 *               deliveryDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2023-09-15T12:00:00Z
 *               stars:
 *                 type: integer
 *                 example: 4
 *               discount:
 *                 type: integer
 *                 example: 10
 *               saleRate:
 *                 type: integer
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Product updated successfully
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
 *                   example: Product updated successfully
 *       400:
 *         description: Invalid product data
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
 *                   example: Invalid product data
 *                 errors:
 *                   type: object
 *                   description: Validation error details
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
 *         description: Internal server error
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
 *                   example: Internal server error
 */

router.put(
  "/update/:id",
  protect,
  authorize("user", "admin"),
  productControllers.updateProduct
);

/**
 * @openapi
 * /api/products/all:
 *   get:
 *     summary: Get all products with pagination
 *     description: Retrieve a paginated list of products.
 *     tags:
 *       - Products
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
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                   example: 42
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 pages:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Internal server error
 */

router.get(
  "/all",
  protect,
  authorize("user", "admin"),
  productControllers.getAllProducts
);

/**
 * @openapi
 * /api/products/filter:
 *   get:
 *     summary: Filter products
 *     description: Retrieve products filtered by category, brand, price range, rating, and delivery day, with pagination.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter products by brand
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: stars
 *         schema:
 *           type: number
 *         description: Minimum stars (greater than or equal)
 *       - in: query
 *         name: deliveryDay
 *         schema:
 *           type: integer
 *         description: Maximum delivery days allowed
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
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: Filtered products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 total:
 *                   type: integer
 *                   example: 120
 *                 page:
 *                   type: integer
 *                   example: 2
 *                 pages:
 *                   type: integer
 *                   example: 12
 *       500:
 *         description: Internal server error
 */

router.get("/filter", productControllers.filterProducts);

router.get("/new-products", productControllers.getNewProducts);

router.get("/most-ordered", productControllers.getMostOrderedProducts);

/**
 * @openapi
 * /api/products/brands/get-all-brands:
 *   get:
 *     summary: Get all product brands
 *     description: Retrieve a list of all unique product brands from the database.
 *     tags:
 *       - Products
 *     responses:
 *       200:
 *         description: Successfully retrieved product brands
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 brands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Apple", "Samsung", "Sony"]
 *       500:
 *         description: Internal server error
 */

router.get("/brands/get-all-brands", productControllers.getBrands);

/**
 * @openapi
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product to retrieve
 *     responses:
 *       200:
 *         description: Product retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 product:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                     name:
 *                       type: string
 *                       example: iPhone 15
 *                     description:
 *                       type: string
 *                       example: Latest Apple smartphone with A17 chip
 *                     price:
 *                       type: number
 *                       example: 1199.99
 *                     category:
 *                       type: string
 *                       example: 64c8e8f1d3a2f1a2b3c4d5e6
 *                     stock:
 *                       type: integer
 *                       example: 50
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                         example: https://example.com/images/iphone15.png
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
 *         description: Internal server error
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
 *                   example: Internal server error
 */

router.get("/:id", productControllers.getProductById);

/**
 * @swagger
 * /api/products/delete/{id}:
 *   delete:
 *     summary: Delete a product
 *     description: Delete a product by its unique ID.
 *     tags:
 *       - Products
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product
 *     responses:
 *       200:
 *         description: Product deleted successfully
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
 *                   example: Product deleted successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Internal server error
 */

router.delete(
  "/delete/:id",
  protect,
  authorize("admin"),
  productControllers.deleteProduct
);

export default router;
