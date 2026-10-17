import { z } from "zod";
import type { AppointmentStatus, PrescriptionStatus } from "../../db/schema/enums.js";
import type { PrescriptionSnapshot } from "../../db/schema/index.js";

/**
 * A cart line / order line that needs a prescription can be fulfilled in two ways:
 *  - `existing`     the customer picked a saved prescription
 *  - `appointment`  the customer booked an eye exam; the clinic records the
 *                   prescription afterwards and it is linked to the line automatically
 */
export const LINE_RX_MODES = ["none", "existing", "appointment"] as const;
export type LineRxMode = (typeof LINE_RX_MODES)[number];

/**
 * Derived state shown to the customer / staff. Ordered from "most blocking" to
 * "done" so the worst state of an order can be picked with `worstRxState`.
 */
export const LINE_RX_STATES = ["rejected", "expired", "examCancelled", "missing", "awaitingExam", "pending", "verified", "notRequired"] as const;
export type LineRxState = (typeof LINE_RX_STATES)[number];

export const lineRxModeSchema = z.enum(LINE_RX_MODES);
export const lineRxStateSchema = z.enum(LINE_RX_STATES);

/** States that let a line be placed in an order (staff verify before the lab). */
const CHECKOUT_OK: readonly LineRxState[] = ["notRequired", "verified", "pending", "awaitingExam"];
/** The only state that lets a line go to the lab. */
export const isLabReady = (state: LineRxState) => state === "notRequired" || state === "verified";

export const LIVE_APPOINTMENT: readonly AppointmentStatus[] = ["booked", "confirmed"];

export interface RxInputs {
  required: boolean;
  prescription: { status: PrescriptionStatus; expiresOn: string | null } | null;
  appointment: { status: AppointmentStatus } | null;
}

export interface RxResolution {
  mode: LineRxMode;
  state: LineRxState;
  /** Can be checked out. */
  ready: boolean;
  /** Customer-facing reason when not ready. */
  issue: string | null;
}

export function resolveLineRx({ required, prescription, appointment }: RxInputs): RxResolution {
  const mode: LineRxMode = appointment ? "appointment" : prescription ? "existing" : "none";
  if (!required) return { mode, state: "notRequired", ready: true, issue: null };

  let state: LineRxState;
  if (prescription) {
    const expired = prescription.status === "expired" || (prescription.expiresOn !== null && new Date(prescription.expiresOn) < new Date());
    state = prescription.status === "rejected" ? "rejected" : expired ? "expired" : prescription.status === "verified" ? "verified" : "pending";
  } else if (appointment) {
    // completed-without-Rx means the clinic hasn't entered the values yet – still waiting
    state = LIVE_APPOINTMENT.includes(appointment.status) || appointment.status === "completed" ? "awaitingExam" : "examCancelled";
  } else {
    state = "missing";
  }

  const issues: Partial<Record<LineRxState, string>> = {
    rejected: "The attached prescription was rejected – choose another or book an eye exam",
    expired: "The attached prescription has expired – choose another or book an eye exam",
    examCancelled: "The linked eye exam was cancelled – book a new one or choose a prescription",
    missing: "Choose a prescription or book an eye exam for this item",
  };
  return { mode, state, ready: CHECKOUT_OK.includes(state), issue: issues[state] ?? null };
}

/** The most blocking state across an order's lines; null when no line needs a prescription. */
export function worstRxState(states: LineRxState[]): LineRxState | null {
  const relevant = states.filter((s) => s !== "notRequired");
  if (relevant.length === 0) return null;
  return relevant.sort((a, b) => LINE_RX_STATES.indexOf(a) - LINE_RX_STATES.indexOf(b))[0]!;
}

export function snapshotOf(rx: {
  id: string;
  odSph: string | null;
  odCyl: string | null;
  odAxis: string | null;
  osSph: string | null;
  osCyl: string | null;
  osAxis: string | null;
  pd: string | null;
  addPower: string | null;
}): PrescriptionSnapshot {
  return { id: rx.id, od: { sph: rx.odSph, cyl: rx.odCyl, axis: rx.odAxis }, os: { sph: rx.osSph, cyl: rx.osCyl, axis: rx.osAxis }, pd: rx.pd, add: rx.addPower };
}

/** Compact appointment info embedded in cart / order lines. */
export const appointmentSummarySchema = z.object({
  id: z.uuid(),
  scheduledAt: z.string(),
  status: z.string(),
  doctor: z.object({ id: z.uuid(), name: z.object({ ar: z.string(), en: z.string() }) }),
});
export type AppointmentSummary = z.infer<typeof appointmentSummarySchema>;
