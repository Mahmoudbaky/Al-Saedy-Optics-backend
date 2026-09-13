import mongoose from "mongoose";

const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    brand: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      optional: true,
      trim: true,
    },
    aboutItem: [
      {
        type: String,
        trim: true,
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
    },
    deliveryDate: {
      type: Date,
      optional: true,
    },
    discount: {
      type: Number,
      optional: true,
      min: 0,
      max: 100,
    },
    saleRate: {
      type: Number,
      optional: true,
      min: 0,
      max: 5000,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    banner: {
      type: String,
      optional: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
