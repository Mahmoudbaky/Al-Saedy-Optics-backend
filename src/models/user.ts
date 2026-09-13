import mongoose from "mongoose";

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: false,
    },
    userImage: {
      type: String,
      required: false,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "admin",
    },
    resetToken: String,
    resetTokenExpiration: Date,
    loginOtp: String,
    otpExpiration: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
