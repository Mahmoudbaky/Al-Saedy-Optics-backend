import { rateLimit } from "express-rate-limit";
import { isTest } from "../config/env.js";
import { TooManyRequestsError } from "../lib/errors.js";

const handler = () => {
  throw new TooManyRequestsError();
};

/** Generous global limiter – protects against runaway clients, not brute force. */
export const apiRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isTest,
  handler,
});

/** Tighter limiter for write-heavy or abuse-prone endpoints (reviews, appointments…). */
export const strictRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => isTest,
  handler,
});
