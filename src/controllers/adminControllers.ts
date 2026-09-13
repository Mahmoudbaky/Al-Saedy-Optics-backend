import Product from "../models/product.js";
import Order from "../models/order.js";
import User from "../models/user.js";
import { Request, Response } from "express";

// Get data for overview dashboard
export const getOverviewData = async (req: Request, res: Response) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } },
    ]);

    // each month's revenue
    const monthlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Overview data retrieved successfully",
      data: {
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.totalAmount || 0,
        totalUsers,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
