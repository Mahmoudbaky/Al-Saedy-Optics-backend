import User from "../models/user.js";
import { Request, Response } from "express";
import { extractTokenAndDecode } from "../lib/utils.js";
import { email } from "zod";
import { updateUserProfileValidationSchema } from "../lib/validators.js";

/**
 * Retrieves the user profile associated with the given JWT token
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>}
 */
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, message: "User found", data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }
    const userId = decoded.id;
    const { email, userName, userImage } =
      updateUserProfileValidationSchema.parse(req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.email = email;
    user.userName = userName;
    user.userImage = userImage;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const { searchTerm = "", page = 1, limit = 10 } = req.query;

    const filters: any = {};

    if (searchTerm) {
      filters.email = { $regex: `^${searchTerm}`, $options: "i" }; // Case-insensitive searchsearchTerm`, $options: "i" }; // Case-insensitive search
    }

    const total = await User.countDocuments(filters);

    const users = await User.find(filters)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.status(200).json({
      success: true,
      data: users,
      total,
      page,
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
