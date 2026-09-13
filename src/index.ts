import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import {
  authRoutes,
  categoryRoutes,
  productRoutes,
  cartRoutes,
  orderRoutes,
  feedbackRoutes,
  userRoutes,
  wishlistRoutes,
  adminRoutes,
} from "./routes/index.js";
import { env } from "./config/env.js";
import cors from "cors";
import { setupSwagger } from "./config/swagger.js";
import { createRouteHandler } from "uploadthing/express";
import { uploadRouter } from "./config/uploadthing.js";

dotenv.config();

await mongoose
  .connect(env.MONGODB_URI as string)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      "https://dev-wave-sportswear-store.vercel.app",
      "https://dev-wave-shrimp-zone.vercel.app",
      "https://training-in-dev-wave-full-stack-e-c-dun.vercel.app",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:3001",
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Origin",
    "X-Requested-With",
    "Accept",
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers",
    "x-uploadthing-package",
    "x-uploadthing-version",
    "traceparent",
    "user-agent",
    "b3",
    "referer",
    "sec-ch-ua",
    "sec-ch-ua-mobile",
    "sec-ch-ua-platform",
  ],
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use(express.json());

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/admin", adminRoutes);

// Uploadthing routes
app.use(
  "/api/uploadthing",
  createRouteHandler({
    router: uploadRouter,
    config: { token: env.UPLOADTHING_TOKEN },
  })
);

// Setup swagger
setupSwagger(app);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is healthy" });
});

// Handle 404 - catch all unmatched routes
app.use((req, res) => {
  res.status(404).json({
    error: "Not Found, please use a valid endpoint",
  });
});

app.listen(env.PORT, () => {
  console.log(`Server is running on port ${env.PORT}`);
});

export default app;
