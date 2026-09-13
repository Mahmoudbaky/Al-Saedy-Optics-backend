import mongoose from "mongoose";
import Category from "../models/category.js";
import { MONGODB_URI } from "../lib/constants.js";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};

const categoriesToAdd = [
  {
    name: "Men's Sportswear",
    description:
      "Performance-driven apparel and footwear designed for men’s active lifestyle.",
  },
  {
    name: "Women's Sportswear",
    description:
      "Stylish and functional activewear tailored for women’s fitness and training.",
  },
  {
    name: "Running Shoes",
    description:
      "High-performance running shoes offering comfort and durability.",
  },
  {
    name: "Fitness Accessories",
    description:
      "Essential accessories for workouts including gloves, bottles, and gym bags.",
  },
  { name: "Sports Equipment", description: "Sports Equipment" },
];
const addCategories = async () => {
  try {
    await connectDB();
    for (const category of categoriesToAdd) {
      const newCategory = new Category(category);
      await newCategory.save();
    }
    console.log("Categories added successfully");
  } catch (err) {
    console.error("Error adding categories:", err);
  }
};

connectDB().then(addCategories);
