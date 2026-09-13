import Category from "../models/category.js";
import { Request, Response } from "express";
import { createCategoryValidationSchema } from "../lib/validators.js";

/**
 * Creates a new category
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @returns {Promise<void>}
 */

export const createCategory = async (req: Request, res: Response) => {
  try {
    const validationResponse = createCategoryValidationSchema.safeParse(
      req.body
    );

    if (!validationResponse.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid category data",
        errors: validationResponse.error,
      });
    }

    await Category.create(validationResponse.data);

    res.status(201).json({
      success: true,
      message: "Category created successfully",
    });
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

/**
 * Updates an existing category
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @returns {Promise<void>}
 */
export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validationResult = createCategoryValidationSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid category data",
        errors: validationResult.error,
      });
    }

    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: validationResult.data.name,
        description: validationResult.data.description,
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

/**
 * Fetches all categories from the database
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @returns {Promise<void>}
 */
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find();
    res.status(200).json({
      success: true,
      message: "categories fetched",
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const getCategoryById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedCategory = await Category.findByIdAndDelete(id);
    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error,
    });
  }
};
