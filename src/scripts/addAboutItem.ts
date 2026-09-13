import mongoose from "mongoose";
import Product from "../models/product.js";

const connectDB = async () => {
  try {
    await mongoose.connect(
      "mongodb+srv://mahmoudsaleh3478y7:qDC4xfMnDZ5i3F3g@cluster0.xoowpfo.mongodb.net/Ecommerce?retryWrites=true&w=majority&appName=DevWaveEcommerce"
    );
    console.log("MongoDB Connected");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};

const aboutItemsToAdd = [
  "High-quality materials",
  "Ergonomic design",
  "Durable construction",
  "Long-lasting performance",
];

const addAboutItemsToProducts = async () => {
  try {
    const products = await Product.find();

    const productsIds = products.map((product) => product._id._id);
    console.log(productsIds);
    console.log("About items added to products successfully.");
  } catch (error) {
    console.error("Error adding about items to products:", error);
  }
};

connectDB().then(addAboutItemsToProducts);
