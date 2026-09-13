import { z } from "zod";

/** Reusable primitives shared by module validators. */
export const uuidSchema = z.uuid();
export const idParamSchema = z.object({ id: uuidSchema });
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Expected a hex colour like #22262B");
/** Whole dinars – IQD has no fractional unit in practice. */
export const moneySchema = z.number().int().min(0);
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]{7,20}$/, "Invalid phone number");
export const urlSchema = z.url().max(2048);
export const boolQuery = z
  .enum(["true", "false"])
  .transform((v) => v === "true")
  .optional();
