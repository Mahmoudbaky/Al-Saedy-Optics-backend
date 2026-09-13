import User from "../models/user.js";
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { CookieOptions } from "express";
import { env } from "../config/env.js";
import { emailService } from "../services/emailService.js";
import { OtpUtils } from "../lib/utils.js";

/**
 * Registers a new user
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @returns {Promise<void>}
 *
 */

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { email, password, userName } = req.body;

    // check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      email,
      password: hashedPassword,
      userName,
    });

    res
      .status(201)
      .json({ success: true, message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

/**
 * Logs in a user
 * @param {Request} req Express request object
 * @param {Response} res Express response object
 * @returns {Promise<void>}
 */
export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    // Generate OTP
    const otp = OtpUtils.generateOTP();
    const otpExpiration = OtpUtils.generateOtpExpiration();

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.loginOtp = hashedOtp;
    user.otpExpiration = otpExpiration;
    await user.save();

    // Send email
    const emailSent = await emailService.sendOtpEmail(email, otp);
    if (!emailSent) {
      return res
        .status(500)
        .json({ success: false, message: "Failed to send email" });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      data: {
        email,
        expiresAt: otpExpiration,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};

export const verifyOtpAndLogin = async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    // Check if OTP exists
    if (!user.loginOtp || !user.otpExpiration) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new one.",
      });
    }

    // Check if OTP is expired
    if (user.otpExpiration.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    const isMatch = await bcrypt.compare(otp, user.loginOtp);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    );
    // Set cookie
    const cookieOptions: CookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
    };
    res.cookie("jwt", token, cookieOptions);

    user.loginOtp = undefined;
    user.otpExpiration = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        userName: user.userName,
        userImage: user.userImage,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error", error });
  }
};
