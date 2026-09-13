import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { timestamps, uuidPk } from "./_shared.js";
import { user } from "./auth.js";
import { appointmentReasonEnum, appointmentStatusEnum } from "./enums.js";

export const doctors = pgTable("doctors", {
  id: uuidPk(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en").notNull(),
  specialtyAr: text("specialty_ar"),
  specialtyEn: text("specialty_en"),
  imageUrl: text("image_url"),
  /** ISO weekday numbers the doctor is available (1 = Monday … 7 = Sunday). */
  workingDays: text("working_days").array().notNull().default(["1", "2", "3", "4", "6", "7"]),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const appointments = pgTable(
  "appointments",
  {
    id: uuidPk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "restrict" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    reason: appointmentReasonEnum("reason").notNull().default("exam"),
    status: appointmentStatusEnum("status").notNull().default("booked"),
    remindMe: boolean("remind_me").notNull().default(true),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("appointments_user_idx").on(t.userId),
    index("appointments_scheduled_idx").on(t.scheduledAt),
    // A doctor can't have two live bookings in the same slot (partial unique index).
    uniqueIndex("appointments_doctor_slot_uq")
      .on(t.doctorId, t.scheduledAt)
      .where(sql`status in ('booked', 'confirmed')`),
  ],
);
