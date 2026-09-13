import { env } from "../config/env.js";
import jwt, { JwtPayload } from "jsonwebtoken";
import { response, Request } from "express";
import crypto from "crypto";

export const extractTokenAndDecode = (req: Request): JwtPayload | null => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
};

export class OtpUtils {
  /**
   * Generate a 6-digit OTP
   */
  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate OTP expiration time (10 minutes from now)
   */
  static generateOtpExpiration(): Date {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 10);
    return expiration;
  }

  /**
   * Check if OTP is expired
   */
  static isOtpExpired(expiration: Date): boolean {
    return new Date() > expiration;
  }

  /**
   * Generate a secure random token for password reset
   */
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Generate reset token expiration (1 hour from now)
   */
  static generateResetTokenExpiration(): Date {
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1);
    return expiration;
  }
}
