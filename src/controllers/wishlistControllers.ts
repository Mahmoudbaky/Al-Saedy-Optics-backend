import Product from "../models/product.js";
import Wishlist from "../models/wishlist.js";
import { Request, Response } from "express";
import { extractTokenAndDecode } from "../lib/utils.js";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// Get user's wishlist
export const getWishlist = async (req: Request, res: Response) => {
  try {
    // Verify token
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;

    const wishlist = await Wishlist.findOne({ user: userId }).populate(
      "products"
    );

    if (!wishlist) {
      return res.status(200).json({
        success: true,
        message: "Wishlist retrieved successfully",
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      message: "Wishlist retrieved successfully",
      data: wishlist.products,
    });
  } catch (error) {
    console.error("Error retrieving wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving wishlist",
    });
  }
};

// Add item to wishlist
export const addToWishlist = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: "Product is not available",
      });
    }

    // Find or create user's wishlist
    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      // Create new wishlist for user
      wishlist = new Wishlist({
        user: userId,
        products: [productId],
      });
    } else {
      // Check if product is already in wishlist
      if (wishlist.products.includes(productId)) {
        return res.status(400).json({
          success: false,
          message: "Product already in wishlist",
        });
      }
      // Add product to existing wishlist
      wishlist.products.push(productId);
    }

    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product added to wishlist successfully",
    });
  } catch (error) {
    console.error("Error adding product to wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error adding product to wishlist",
    });
  }
};

// Remove item from wishlist
export const removeFromWishlist = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId } = req.params;

    // Find user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found",
      });
    }

    // Check if product is in wishlist
    const productIndex = wishlist.products.indexOf(productId as any);
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Product not found in wishlist",
      });
    }

    // Remove product from wishlist
    wishlist.products.splice(productIndex, 1);
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Product removed from wishlist successfully",
    });
  } catch (error) {
    console.error("Error removing product from wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error removing product from wishlist",
    });
  }
};

// Clear entire wishlist
export const clearWishlist = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;

    // Find user's wishlist
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist || wishlist.products.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Wishlist is already empty",
      });
    }

    // Clear all products from wishlist
    wishlist.products = [];
    await wishlist.save();

    res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing wishlist:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing wishlist",
    });
  }
};
