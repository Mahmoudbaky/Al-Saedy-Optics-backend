import Cart from "../models/cart.js";
import Product from "../models/product.js";
import { Request, Response } from "express";
import { extractTokenAndDecode } from "../lib/utils.js";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// Get user's cart
export const getCart = async (req: Request, res: Response) => {
  try {
    // Verify token
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id; // Assuming user ID comes from auth middleware

    const cart = await Cart.findOne({ user: userId })
      .populate("items.product", "name price images")
      .exec();

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is empty",
        data: { items: [], totalAmount: 0 },
      });
    }

    res.status(200).json({
      success: true,
      message: "Cart retrieved successfully",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving cart",
      error,
    });
  }
};

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId, quantity = 1 } = req.body;

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

    // Find or create cart
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalAmount: 0,
      });
    }

    // Check if product already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      // Add new item to cart
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
      });
    }

    await cart.save(); // This will trigger the pre-save hook to calculate total

    // Populate and return updated cart
    const updatedCart = await Cart.findById(cart._id)
      .populate("items.product", "name price image")
      .exec();

    res.status(200).json({
      success: true,
      message: "Item added to cart successfully",
      data: updatedCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error adding item to cart",
      error,
    });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId, quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const newCart = await cart.populate("items.product", "name price images");

    res.status(200).json({
      success: true,
      message: "Cart item updated successfully",
      data: newCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating cart item",
      error,
    });
  }
};

// Remove item from cart
export const removeFromCart = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Remove item using filter to ensure array is modified
    const updatedCartItems: any = cart.items.filter(
      (item: any) => item.product.toString() !== productId
    );

    cart.items = updatedCartItems;

    await cart.save();

    const newCart = await cart.populate("items.product", "name price images");

    res.status(200).json({
      success: true,
      message: "Item removed from cart successfully",
      data: newCart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error removing item from cart",
      error,
    });
  }
};

// Clear entire cart
export const clearCart = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: "Cart is already empty",
      });
    }

    const emptyArray: any = [];

    cart.items = emptyArray;
    cart.totalAmount = 0;
    await cart.save();

    res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      data: cart,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error clearing cart",
      error,
    });
  }
};
