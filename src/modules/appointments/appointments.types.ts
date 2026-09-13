import type { APPOINTMENT_STATUSES } from "../../db/schema/enums.js";

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
