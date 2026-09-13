import CartItem from "./cartItem.js";
import mongoose from "mongoose";
const Schema = mongoose.Schema;
import { env } from "../config/env.js";

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [CartItem.schema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    shippingFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Calculate total amount before saving
cartSchema.pre("save", function (next) {
  this.subtotal = parseFloat(
    this.items
      .reduce((total, item) => {
        return total + item.price * item.quantity;
      }, 0)
      .toFixed(2)
  );

  if (this.subtotal <= 100) {
    this.shippingFee = 50;
  } else {
    this.shippingFee = 0;
  }

  this.taxAmount = parseFloat(
    (this.subtotal * Number(env.TAX_RATE)).toFixed(2)
  ); // 15% tax

  this.totalAmount = parseFloat(
    (this.subtotal + this.shippingFee + this.taxAmount).toFixed(2)
  );
  next();
});

// Index for better performance
cartSchema.index({ user: 1, isActive: 1 });

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
