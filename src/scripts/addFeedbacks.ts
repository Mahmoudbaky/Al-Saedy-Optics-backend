import mongoose from "mongoose";
import Product from "../models/product.js";
import Feedback from "../models/feedback.js";

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

const usersIds = [
  "68b31be67fb7d7e0d509fc41",
  "68b6f6287f07e97c9ba4ab00",
  "68b6f6287f07e97c9ba4ab01",
  "68b6f6397f07e97c9ba4ab04",
  "68b8943d34200220b3046e8c",
];

const productsIds = [
  "68b820841ad108bfba8c2a8e",
  "68b820841ad108bfba8c2a8f",
  "68b820841ad108bfba8c2a90",
  "68b820841ad108bfba8c2a91",
  "68b820841ad108bfba8c2a92",
  "68b820841ad108bfba8c2a93",
  "68b820841ad108bfba8c2a94",
  "68b820841ad108bfba8c2a95",
  "68b820841ad108bfba8c2a96",
  "68b820841ad108bfba8c2a97",
  "68b820841ad108bfba8c2a98",
  "68b820841ad108bfba8c2a99",
  "68b820841ad108bfba8c2a9a",
  "68b820841ad108bfba8c2a9b",
  "68b820841ad108bfba8c2a9c",
  "68b820841ad108bfba8c2a9d",
  "68b820841ad108bfba8c2a9e",
  "68b820841ad108bfba8c2a9f",
  "68b820841ad108bfba8c2aa0",
  "68b820841ad108bfba8c2aa1",
];

const ratings = [1, 2, 3, 4, 5];
const comments = [
  "Great product!",
  "Very satisfied with my purchase.",
  "Would definitely recommend to others.",
  "Quality could be better.",
  "Exceeded my expectations!",
  "Not worth the price.",
  "Fast shipping and good packaging.",
  "Customer service was very helpful.",
  "I love it! Will buy again.",
  "The product arrived damaged.",
  "Works as described.",
  "I'm very disappointed with this product.",
  "Five stars! Highly recommend.",
  "The color is not as shown in the pictures.",
  "Comfortable and stylish.",
  "Battery life is impressive.",
  "The size runs a bit small, consider ordering a size up.",
  "The material feels cheap.",
  "Perfect for my needs.",
  "I had high hopes, but it didn't deliver.",
];

const addFeedbacks = async () => {
  await connectDB();

  for (let i = 0; i < 50; i++) {
    const randomUser = usersIds[Math.floor(Math.random() * usersIds.length)];
    const randomProduct =
      productsIds[Math.floor(Math.random() * productsIds.length)];
    const randomRating = ratings[Math.floor(Math.random() * ratings.length)];
    const randomComment = comments[Math.floor(Math.random() * comments.length)];

    const feedback = new Feedback({
      user: randomUser,
      product: randomProduct,
      rating: randomRating,
      comment: randomComment,
    });

    try {
      await feedback.save();
      console.log("Feedback added successfully");
    } catch (err) {
      console.error("Error adding feedback:", err);
    }
  }
};

connectDB().then(addFeedbacks);
