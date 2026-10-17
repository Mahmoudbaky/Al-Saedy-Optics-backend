import { z } from "zod";
import { APPOINTMENT_REASONS, APPOINTMENT_STATUSES } from "../../db/schema/enums.js";
import { localizedStringSchema, optionalLocalizedStringSchema } from "../../lib/i18n.js";
import { paginationQuerySchema } from "../../lib/pagination.js";
import { urlSchema, uuidSchema } from "../../lib/schemas.js";
import { eyeValuesSchema } from "../prescriptions/prescriptions.schema.js";

export const availabilityQuerySchema = z.object({
  doctorId: uuidSchema.optional(),
  /** First day (YYYY-MM-DD, clinic timezone). Defaults to today. */
  from: z.iso.date().optional(),
  days: z.coerce.number().int().min(1).max(14).default(7),
});

export const bookAppointmentSchema = z.object({
  doctorId: uuidSchema.optional(),
  /** Slot start, ISO 8601 with offset, e.g. 2026-09-16T16:00:00+03:00 */
  scheduledAt: z.iso.datetime({ offset: true }),
  reason: z.enum(APPOINTMENT_REASONS).default("exam"),
  remindMe: z.boolean().default(true),
  notes: z.string().trim().max(300).optional(),
});

export const rescheduleSchema = bookAppointmentSchema.pick({ scheduledAt: true });

export const adminListAppointmentsQuerySchema = paginationQuerySchema.extend({
  doctorId: uuidSchema.optional(),
  status: z.enum(APPOINTMENT_STATUSES).optional(),
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: z.enum(APPOINTMENT_STATUSES),
  notes: z.string().trim().max(500).optional(),
});

export const doctorResponseSchema = z.object({
  id: z.uuid(),
  name: localizedStringSchema,
  specialty: localizedStringSchema.nullable(),
  imageUrl: z.string().nullable(),
  workingDays: z.array(z.number()),
  isActive: z.boolean(),
});

export const createDoctorSchema = z.object({
  name: localizedStringSchema,
  specialty: optionalLocalizedStringSchema,
  imageUrl: urlSchema.nullable().optional(),
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  workingDays: z.array(z.number().int().min(1).max(7)).min(1).default([1, 2, 3, 4, 6, 7]),
  isActive: z.boolean().default(true),
});
export const updateDoctorSchema = createDoctorSchema.partial();

export const appointmentResponseSchema = z.object({
  id: z.uuid(),
  /** Prescription recorded at this exam by the clinic, once available. */
  prescriptionId: z.uuid().nullable(),
  doctor: doctorResponseSchema.pick({ id: true, name: true, specialty: true, imageUrl: true }),
  scheduledAt: z.string(),
  reason: z.enum(APPOINTMENT_REASONS),
  status: z.enum(APPOINTMENT_STATUSES),
  remindMe: z.boolean(),
  notes: z.string().nullable(),
  canCancel: z.boolean(),
  createdAt: z.string(),
});

export const availabilityResponseSchema = z.object({
  doctor: doctorResponseSchema,
  timezone: z.string(),
  slotMinutes: z.number(),
  days: z.array(
    z.object({
      date: z.string(),
      weekday: z.number(),
      slots: z.array(z.object({ startsAt: z.string(), time: z.string(), available: z.boolean() })),
    }),
  ),
});

/**
 * Values the optometrist enters after the exam. Creates a `verified` prescription
 * (source = "clinic") linked to the appointment and to every cart / order line
 * that was waiting on it.
 */
export const recordExamPrescriptionSchema = z.object({
  od: eyeValuesSchema,
  os: eyeValuesSchema,
  pd: z.string().trim().max(12).nullable().optional(),
  add: z.string().trim().max(8).nullable().optional(),
  label: z.string().trim().max(100).nullable().optional(),
  expiresOn: z.iso.date().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});
export type RecordExamPrescriptionInput = z.infer<typeof recordExamPrescriptionSchema>;

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;
export type AdminListAppointmentsQuery = z.infer<typeof adminListAppointmentsQuerySchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type DoctorDto = z.infer<typeof doctorResponseSchema>;
export type AppointmentDto = z.infer<typeof appointmentResponseSchema>;
