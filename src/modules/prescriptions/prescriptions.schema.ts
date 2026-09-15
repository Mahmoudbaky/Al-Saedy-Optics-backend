import { z } from "zod";
import { PRESCRIPTION_SOURCES, PRESCRIPTION_STATUSES } from "../../db/schema/enums.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { urlSchema, uuidSchema } from "../../lib/schemas.js";

/** Optical values are kept as strings so "+0.50" / "-1.25" round-trip exactly. */
const diopter = z
  .string()
  .trim()
  .regex(/^[+-]?\d{1,2}(\.\d{1,2})?$/, "Expected a value like -1.25")
  .max(8);
const axis = z
  .string()
  .trim()
  .regex(/^\d{1,3}$/, "Axis must be 0–180")
  .refine((v) => Number(v) <= 180, "Axis must be 0–180");
const optional = <T extends z.ZodType>(s: T) => z.union([s, z.literal("")]).nullable().optional();

export const eyeValuesSchema = z.object({
  sph: optional(diopter),
  cyl: optional(diopter),
  axis: optional(axis),
});

export const createPrescriptionSchema = z
  .object({
    label: z.string().trim().max(100).nullable().optional(),
    doctorName: z.string().trim().max(100).nullable().optional(),
    issuedOn: z.iso.date().nullable().optional(),
    source: z.enum(PRESCRIPTION_SOURCES).default("manual"),
    od: eyeValuesSchema.default({}),
    os: eyeValuesSchema.default({}),
    pd: optional(z.string().trim().regex(/^\d{2}(\.\d)?(\/\d{2}(\.\d)?)?$/, "PD like 62 or 31/31")),
    add: optional(diopter),
    /** Required when source = "upload" (URL from /api/uploadthing prescriptionImage). */
    imageUrl: urlSchema.nullable().optional(),
  })
  .refine((v) => v.source !== "upload" || Boolean(v.imageUrl), { path: ["imageUrl"], message: "imageUrl is required for uploaded prescriptions" })
  .refine((v) => v.source !== "manual" || Boolean(v.od.sph || v.os.sph), { path: ["od", "sph"], message: "Enter at least one SPH value" });

export const updatePrescriptionSchema = z.object({
  label: z.string().trim().max(100).nullable().optional(),
  doctorName: z.string().trim().max(100).nullable().optional(),
  issuedOn: z.iso.date().nullable().optional(),
  od: eyeValuesSchema.optional(),
  os: eyeValuesSchema.optional(),
  pd: optional(z.string().trim().max(12)),
  add: optional(diopter),
  imageUrl: urlSchema.nullable().optional(),
});

export const reviewPrescriptionSchema = z.object({
  status: z.enum(["verified", "rejected", "expired"]),
  reviewNote: z.string().trim().max(500).nullable().optional(),
  /** Optional corrected values entered by the optometrist. */
  od: eyeValuesSchema.optional(),
  os: eyeValuesSchema.optional(),
  pd: optional(z.string().trim().max(12)),
  add: optional(diopter),
  expiresOn: z.iso.date().nullable().optional(),
});

export const adminListPrescriptionsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PRESCRIPTION_STATUSES).optional(),
  userId: uuidSchema.optional(),
});

export const prescriptionResponseSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  label: z.string().nullable(),
  doctorName: z.string().nullable(),
  issuedOn: z.string().nullable(),
  expiresOn: z.string().nullable(),
  source: z.enum(PRESCRIPTION_SOURCES),
  status: z.enum(PRESCRIPTION_STATUSES),
  od: z.object({ sph: z.string().nullable(), cyl: z.string().nullable(), axis: z.string().nullable() }),
  os: z.object({ sph: z.string().nullable(), cyl: z.string().nullable(), axis: z.string().nullable() }),
  pd: z.string().nullable(),
  add: z.string().nullable(),
  imageUrl: z.string().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type ReviewPrescriptionInput = z.infer<typeof reviewPrescriptionSchema>;
export type AdminListPrescriptionsQuery = z.infer<typeof adminListPrescriptionsQuerySchema>;
export type PrescriptionDto = z.infer<typeof prescriptionResponseSchema>;

/** Admin queue rows carry the owner and the open order (if any) blocked on this prescription. */
export const adminPrescriptionResponseSchema = prescriptionResponseSchema.extend({
  user: z.object({ id: z.uuid(), name: z.string(), email: z.string(), phone: z.string().nullable() }),
  waitingOrderNumber: z.number().nullable(),
});
export type AdminPrescriptionDto = z.infer<typeof adminPrescriptionResponseSchema>;
