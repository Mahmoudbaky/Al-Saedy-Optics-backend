import mongoose from "mongoose";
import Product from "../models/product.js";
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

const quickProducts = [
  {
    name: "Nike Dri-FIT Training T-Shirt",
    brand: "Nike",
    description:
      "Lightweight and breathable training shirt designed to keep you cool.",
    aboutItem: [
      "Made from 100% recycled polyester fibers",
      "Sweat-wicking Dri-FIT technology",
      "Slim athletic fit",
      "Machine washable",
    ],
    price: 45.99,
    category: "68ee94087ed84fa385b6c9db", // Men's Sportswear
    stock: 120,
    deliveryDate: new Date("2025-10-20"),
    discount: 10,
    saleRate: 2400,
    images: [
      "/images/products/nike_dri_fit_tee_1.jpg",
      "/images/products/nike_dri_fit_tee_2.jpg",
    ],
    banner: "/images/banners/nike_dri_fit_banner.jpg",
    isActive: true,
  },
  {
    name: "Adidas Ultraboost 23 Running Shoes",
    brand: "Adidas",
    description:
      "Premium running shoes with responsive cushioning for long-distance comfort.",
    aboutItem: [
      "Boost midsole for maximum energy return",
      "Primeknit upper for adaptive fit",
      "Durable Continental™ rubber outsole",
      "Ideal for road running",
    ],
    price: 189.99,
    category: "68ee94097ed84fa385b6c9df", // Running Shoes
    stock: 75,
    deliveryDate: new Date("2025-10-22"),
    discount: 15,
    saleRate: 4100,
    images: [
      "/images/products/adidas_ultraboost_1.jpg",
      "/images/products/adidas_ultraboost_2.jpg",
    ],
    banner: "/images/banners/adidas_ultraboost_banner.jpg",
    isActive: true,
  },
  {
    name: "Puma Women's Yoga Leggings",
    brand: "Puma",
    description:
      "High-waist leggings designed for flexibility and comfort during yoga sessions.",
    aboutItem: [
      "Moisture-wicking fabric",
      "Four-way stretch material",
      "Flatlock seams to reduce chafing",
      "Hidden pocket for essentials",
    ],
    price: 59.99,
    category: "68ee94087ed84fa385b6c9dd", // Women's Sportswear
    stock: 95,
    deliveryDate: new Date("2025-10-21"),
    discount: 20,
    saleRate: 1800,
    images: [
      "/images/products/puma_yoga_leggings_1.jpg",
      "/images/products/puma_yoga_leggings_2.jpg",
    ],
    banner: "/images/banners/puma_yoga_banner.jpg",
    isActive: true,
  },
  {
    name: "Reebok Adjustable Dumbbell Set",
    brand: "Reebok",
    description:
      "Space-saving adjustable dumbbell set ideal for strength training at home.",
    aboutItem: [
      "Adjustable from 5–25 kg",
      "Durable metal build with grip handle",
      "Includes base rack",
      "Compact and portable",
    ],
    price: 229.99,
    category: "68ee94097ed84fa385b6c9e3", // Sports Equipment
    stock: 40,
    deliveryDate: new Date("2025-10-24"),
    discount: 12,
    saleRate: 1350,
    images: [
      "/images/products/reebok_dumbbell_1.jpg",
      "/images/products/reebok_dumbbell_2.jpg",
    ],
    banner: "/images/banners/reebok_dumbbell_banner.jpg",
    isActive: true,
  },
  {
    name: "Under Armour Gym Bag",
    brand: "Under Armour",
    description: "Durable and spacious gym bag with multiple compartments.",
    aboutItem: [
      "Water-resistant bottom panel",
      "Adjustable shoulder strap",
      "Ventilated pocket for shoes",
      "Capacity: 40L",
    ],
    price: 69.99,
    category: "68ee94097ed84fa385b6c9e1", // Fitness Accessories
    stock: 150,
    deliveryDate: new Date("2025-10-19"),
    discount: 5,
    saleRate: 950,
    images: [
      "/images/products/ua_gym_bag_1.jpg",
      "/images/products/ua_gym_bag_2.jpg",
    ],
    banner: "/images/banners/ua_gym_bag_banner.jpg",
    isActive: true,
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    // Insert new products
    console.log("Inserting sample products...");
    const products = await Product.insertMany(quickProducts);

    console.log(`✅ Successfully added ${products.length} products:`);
    products.forEach((p) => console.log(`   - ${p.name} ($${p.price})`));
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
};

// Run the seeder
seedDatabase();
