import { z } from "zod";
import { USER_ROLES } from "../../db/schema/enums.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { boolQuery, phoneSchema, urlSchema } from "../../lib/schemas.js";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    phone: phoneSchema.nullable().optional(),
    locale: z.enum(["ar", "en"]).optional(),
    image: urlSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const profileResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  phone: z.string().nullable(),
  locale: z.string(),
  image: z.string().nullable(),
  role: z.string(),
  createdAt: z.string(),
  stats: z.object({
    orders: z.number(),
    prescriptions: z.number(),
    wishlist: z.number(),
    unreadNotifications: z.number(),
    nextAppointmentAt: z.string().nullable(),
  }),
});

export const adminListUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(100).optional(),
  role: z.enum(USER_ROLES).optional(),
  banned: boolQuery,
});

export const adminUserResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  phone: z.string().nullable(),
  locale: z.string(),
  image: z.string().nullable(),
  role: z.string(),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.string().nullable(),
  createdAt: z.string(),
  stats: z.object({ orders: z.number(), totalSpent: z.number(), lastOrderAt: z.string().nullable() }),
});

export const setRoleSchema = z.object({ role: z.enum(USER_ROLES) });
export const banUserSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  /** Ban length in seconds; omit for a permanent ban. */
  expiresIn: z.number().int().positive().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AdminListUsersQuery = z.infer<typeof adminListUsersQuerySchema>;
