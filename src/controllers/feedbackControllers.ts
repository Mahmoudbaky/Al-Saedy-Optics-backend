import Feedback from "../models/feedback.js";
import product from "../models/product.js";
import { extractTokenAndDecode } from "../lib/utils.js";
import { Request, Response } from "express";
import { createFeedbackValidationSchema } from "../lib/validators.js";
import { ObjectId } from "mongodb";
import mongoose, { mongo } from "mongoose";

interface Feedback {
  _id: ObjectId;
  user: {
    _id: ObjectId;
    email: string;
    userName: string;
  };
  product: ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface User {
  _id: ObjectId;
  email: string;
  userName: string;
}

export const createFeedback = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId, rating, comment } = createFeedbackValidationSchema.parse(
      req.body
    );

    const existingFeedback = await Feedback.findOne({
      user: userId,
      product: productId,
    });

    if (existingFeedback) {
      return res.status(400).json({
        success: false,
        message:
          "You have already submitted feedback for this product you can only update it!",
      });
    }

    await Feedback.create({
      user: userId,
      product: productId,
      rating,
      comment,
    });

    res.status(201).json({
      success: true,
      message: "Feedback created successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating feedback", error });
  }
};

export const updateFeedback = async (req: Request, res: Response) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId, rating, comment } = createFeedbackValidationSchema.parse(
      req.body
    );

    const existingFeedback = await Feedback.findOne({
      user: userId,
      product: productId,
    });

    if (!existingFeedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    existingFeedback.rating = rating;
    existingFeedback.comment = comment || existingFeedback.comment;
    await existingFeedback.save();

    res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating feedback", error });
  }
};

export const getUserFeedbackForProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const decoded = extractTokenAndDecode(req as Request);

    if (!decoded) {
      return res.status(401).json({
        message: "Not authorized to access this route",
      });
    }

    const userId = decoded.id;
    const { productId } = req.params;

    const feedback = await Feedback.findOne({
      user: userId,
      product: productId,
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: "Feedback not found",
      });
    }

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching feedback", error });
  }
};

export const getAllFeedbacksForProduct = async (
  req: Request,
  res: Response
) => {
  try {
    const { productId } = req.params;
    const feedbacks = await Feedback.find({ product: productId }).populate(
      "user",
      "email userName userImage"
    );

    const reformattedFeedbacks: Feedback[] = feedbacks.map((fb: any) => {
      const user = fb.user;
      return {
        _id: fb._id,
        user: user
          ? {
              _id: user._id,
              email: user.email,
              userName: user.userName,
              userImage: user.userImage,
            }
          : {
              _id: null,
              email: "",
              userName: "",
              userImage: "",
            },
        product: fb.product,
        rating: fb.rating,
        comment: fb.comment,
        createdAt: fb.createdAt,
        updatedAt: fb.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      message: "Feedbacks fetched successfully",
      data: reformattedFeedbacks, // <-- Use the reformatted array here
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching feedbacks", error });
  }
};

export const feedbackStatsForProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    // get feedback stats for a specific product
    const result = await Feedback.aggregate([
      {
        $match: {
          product: new mongoose.mongo.ObjectId(productId), // Match feedbacks for the specific product
        },
      },
      {
        $group: {
          _id: "$product",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          oneStar: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
          twoStar: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
          threeStar: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
          fourStar: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
          fiveStar: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
        },
      },
    ]);

    const reformattedResult = result.map((res) => ({
      productId: res._id,
      averageRating: Number(res.averageRating.toFixed(1)),
      totalReviews: res.totalReviews,
      oneStar: Number(
        ((res.oneStar / Number(res.totalReviews)) * 100).toFixed(1)
      ),
      twoStar: Number(
        ((res.twoStar / Number(res.totalReviews)) * 100).toFixed(1)
      ),
      threeStar: Number(
        ((res.threeStar / Number(res.totalReviews)) * 100).toFixed(1)
      ),
      fourStar: Number(
        ((res.fourStar / Number(res.totalReviews)) * 100).toFixed(1)
      ),
      fiveStar: Number(
        ((res.fiveStar / Number(res.totalReviews)) * 100).toFixed(1)
      ),
    }));

    res.status(200).json({
      success: true,
      stats: reformattedResult[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching feedback stats",
      error,
    });
  }
};
