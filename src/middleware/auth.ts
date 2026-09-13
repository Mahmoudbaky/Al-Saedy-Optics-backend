import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/user.js";

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * Middleware to protect routes by verifying JWT tokens.
 *
 * Checks for the presence of a Bearer token in the request's authorization header,
 * verifies the token using a secret key, and ensures the user associated with the
 * token still exists in the database. If the token is valid and the user exists,
 * attaches the user information to the request object and calls the next middleware.
 *
 * @param req - Express request object, potentially augmented with a user property
 * @param res - Express response object
 * @param next - Express next function to pass control to the next middleware
 *
 * @returns 401 response if the token is not present, invalid, or the user no longer exists.
 */

export const protect = async (
  req: Request & { user?: JwtPayload },
  res: Response,
  next: NextFunction
) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized to access this route at protect middleware 1",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    // Check if user still exists using Mongoose
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        message: "User no longer exists",
      });
    }

    // Set user in request object
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);

    // Check if response has already been sent
    if (res.headersSent) {
      return next(error);
    }

    // Handle specific JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        message: "Token expired",
      });
    }

    return res.status(401).json({
      message: "Not authorized to access this route",
    });
  }
};

// Role-based authorization middleware

/**
 * Role-based authorization middleware
 *
 * @param {string[]} roles - List of authorized roles
 * @returns {import("express").RequestHandler} - Express middleware function
 *
 * Checks if the user is logged in and has one of the specified roles.
 * If the user is not logged in, returns 401 Unauthorized.
 * If the user is logged in but does not have one of the specified roles, returns 403 Forbidden.
 *
 * @example
 * // Only allow users with role "ADMIN" or "MANAGER" to access this route
 * router.get("/admin-only", authorize("ADMIN", "MANAGER"), (req, res) => {
 *   res.send("Authorized");
 * });
 */
export const authorize = (...roles: string[]) => {
  return (
    req: Request & { user?: JwtPayload },
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        message: "Not authorized to access this route at authorize middleware",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
      return;
    }

    next();
  };
};
