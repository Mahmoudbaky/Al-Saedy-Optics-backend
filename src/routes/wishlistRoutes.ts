import express from "express";
import { protect, authorize } from "../middleware/auth.js";

import * as wishlistController from "../controllers/wishlistControllers.js";

export const router = express.Router();

// Get user's wishlist
router.get(
  "/",
  protect,
  authorize("user", "admin"),
  wishlistController.getWishlist
);

// Add item to wishlist
router.post(
  "/add",
  protect,
  authorize("user", "admin"),
  wishlistController.addToWishlist
);

// Remove item from wishlist
router.delete(
  "/remove/:productId",
  protect,
  authorize("user", "admin"),
  wishlistController.removeFromWishlist
);

// Clear wishlist
router.delete(
  "/clear",
  protect,
  authorize("user", "admin"),
  wishlistController.clearWishlist
);

export default router;
