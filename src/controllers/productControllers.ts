import Product from "../models/product.js";
import { Request, Response } from "express";
import { createProductValidationSchema } from "../lib/validators.js";

export const createProduct = async (req: Request, res: Response) => {
  try {
    const validationResponse = createProductValidationSchema.safeParse(
      req.body
    );

    console.log(validationResponse);

    if (!validationResponse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data",
        errors: validationResponse.error,
      });
    }

    await Product.create(validationResponse.data);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validationResponse = createProductValidationSchema.safeParse(
      req.body
    );

    console.log(validationResponse);

    if (!validationResponse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid product data",
        errors: validationResponse.error,
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      validationResponse.data,
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const skip = (page - 1) * limit;
    const products = await Product.find().skip(skip).limit(limit);
    const total = await Product.countDocuments();

    res.status(200).json({
      success: true,
      data: products,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const filterProducts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      brand,
      searchTerm,
      minPrice,
      maxPrice,
      stars,
      page = 1,
      limit = 10,
    } = req.query;

    const filters: any = {};

    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }
    if (stars) filters.stars = { $gte: Number(stars) };
    if (searchTerm) {
      filters.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(filters)
      .skip(skip)
      .limit(Number(limit))
      .populate("category", "name -_id");

    const total = await Product.countDocuments(filters);

    res.status(200).json({
      success: true,
      message: "Products filtered successfully",
      data: products,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Products fetched",
      data: product,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getBrands = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().select("brand -_id");
    const brands = products.map((product) => product.brand);

    res.status(200).json({
      success: true,
      message: "Brands fetched successfully",
      data: Array.from(new Set(brands)), // Unique brands
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getNewProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 }).limit(4);

    res.status(200).json({
      success: true,
      message: "New products fetched successfully",
      data: products,
    });
  } catch (error) {
    console.error("Error fetching new products:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getMostOrderedProducts = async (req: Request, res: Response) => {
  try {
    const products = await Product.find().sort({ orders: -1 }).limit(4);
    res.status(200).json({
      success: true,
      message: "Most ordered products fetched successfully",
      products,
    });
  } catch (error) {
    console.error("Error fetching most ordered products:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};
