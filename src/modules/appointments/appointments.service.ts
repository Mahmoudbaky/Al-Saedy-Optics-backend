import { and, eq, gte, lte } from "drizzle-orm";
import { env } from "../../config/env.js";
import { createLogger } from "../../config/logger.js";
import { appointments } from "../../db/schema/index.js";
import type { AppointmentStatus } from "./appointments.types.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { isUniqueViolation } from "../../lib/pg-errors.js";
import { localized, toColumns } from "../../lib/i18n.js";
import { pageMeta } from "../../lib/pagination.js";
import { addDays, hmIn, isoWeekday, ymdIn, zonedTimeToUtc } from "../../lib/time.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { appointmentsRepository, type AppointmentWithDoctor, type DoctorRow } from "./appointments.repository.js";
import type {
  AdminListAppointmentsQuery,
  AppointmentDto,
  AvailabilityQuery,
  BookAppointmentInput,
  CreateDoctorInput,
  DoctorDto,
  UpdateDoctorInput,
} from "./appointments.schema.js";

const log = createLogger("appointments");
const CANCEL_CUTOFF_HOURS = 2;
const CANCELLABLE: AppointmentStatus[] = ["booked", "confirmed"];

export const toDoctorDto = (d: DoctorRow): DoctorDto => ({
  id: d.id,
  name: localized(d, "name")!,
  specialty: localized(d, "specialty"),
  imageUrl: d.imageUrl,
  workingDays: d.workingDays.map(Number),
  isActive: d.isActive,
});

const canCancel = (a: { status: AppointmentStatus; scheduledAt: Date }) =>
  CANCELLABLE.includes(a.status) && a.scheduledAt.getTime() - Date.now() > CANCEL_CUTOFF_HOURS * 3_600_000;

export const toAppointmentDto = (a: AppointmentWithDoctor): AppointmentDto => ({
  id: a.id,
  doctor: { id: a.doctor.id, name: localized(a.doctor, "name")!, specialty: localized(a.doctor, "specialty"), imageUrl: a.doctor.imageUrl },
  scheduledAt: a.scheduledAt.toISOString(),
  reason: a.reason,
  status: a.status,
  remindMe: a.remindMe,
  notes: a.notes,
  canCancel: canCancel(a),
  createdAt: a.createdAt.toISOString(),
});

async function resolveDoctor(doctorId?: string): Promise<DoctorRow> {
  const doctor = doctorId ? await appointmentsRepository.findDoctor(doctorId) : await appointmentsRepository.firstActiveDoctor();
  if (!doctor || !doctor.isActive) throw new NotFoundError("Doctor", doctorId);
  return doctor;
}

/** All slot start instants for one clinic day. */
function slotsForDay(ymd: string): Date[] {
  const tz = env.CLINIC_TIMEZONE;
  const out: Date[] = [];
  for (let minutes = env.CLINIC_OPEN_HOUR * 60; minutes + env.CLINIC_SLOT_MINUTES <= env.CLINIC_CLOSE_HOUR * 60; minutes += env.CLINIC_SLOT_MINUTES) {
    out.push(zonedTimeToUtc(ymd, Math.floor(minutes / 60), minutes % 60, tz));
  }
  return out;
}

function assertValidSlot(doctor: DoctorRow, scheduledAt: Date) {
  const tz = env.CLINIC_TIMEZONE;
  if (scheduledAt.getTime() <= Date.now()) throw new BadRequestError("That time has already passed");
  const ymd = ymdIn(scheduledAt, tz);
  if (!doctor.workingDays.map(Number).includes(isoWeekday(ymd))) throw new BadRequestError("The doctor is not available on that day");
  if (!slotsForDay(ymd).some((s) => s.getTime() === scheduledAt.getTime())) {
    throw new BadRequestError(`Pick a ${env.CLINIC_SLOT_MINUTES}-minute slot between ${env.CLINIC_OPEN_HOUR}:00 and ${env.CLINIC_CLOSE_HOUR}:00 (${tz})`);
  }
}

export const appointmentsService = {
  listDoctors: async (includeInactive = false) => (await appointmentsRepository.listDoctors(includeInactive)).map(toDoctorDto),

  async availability(query: AvailabilityQuery) {
    const tz = env.CLINIC_TIMEZONE;
    const doctor = await resolveDoctor(query.doctorId);
    const start = query.from ?? ymdIn(new Date(), tz);
    const end = addDays(start, query.days);
    const taken = await appointmentsRepository.takenSlots(doctor.id, zonedTimeToUtc(start, 0, 0, tz), zonedTimeToUtc(end, 0, 0, tz));
    const now = Date.now();
    const workingDays = doctor.workingDays.map(Number);

    const days = [];
    for (let i = 0; i < query.days; i++) {
      const date = addDays(start, i);
      const weekday = isoWeekday(date);
      const slots = workingDays.includes(weekday)
        ? slotsForDay(date).map((s) => ({ startsAt: s.toISOString(), time: hmIn(s, tz), available: s.getTime() > now && !taken.has(s.getTime()) }))
        : [];
      days.push({ date, weekday, slots });
    }
    return { doctor: toDoctorDto(doctor), timezone: tz, slotMinutes: env.CLINIC_SLOT_MINUTES, days };
  },

  async listMine(userId: string) {
    return (await appointmentsRepository.listByUser(userId)).map(toAppointmentDto);
  },

  async book(userId: string, input: BookAppointmentInput, userLocale: string | null) {
    const doctor = await resolveDoctor(input.doctorId);
    const scheduledAt = new Date(input.scheduledAt);
    assertValidSlot(doctor, scheduledAt);

    let row;
    try {
      row = await appointmentsRepository.create({ userId, doctorId: doctor.id, scheduledAt, reason: input.reason, remindMe: input.remindMe, notes: input.notes ?? null });
    } catch (err) {
      // Partial unique index on (doctor, slot) for live bookings
      if (isUniqueViolation(err, "appointments_doctor_slot_uq")) throw new ConflictError("That slot was just taken, please choose another time");
      throw err;
    }
    log.info({ id: row.id, userId, scheduledAt }, "Appointment booked");
    const full = (await appointmentsRepository.findById(row.id))!;
    void notificationsService.notify(
      userId,
      {
        title: { ar: "تم حجز موعد الفحص", en: "Eye exam booked" },
        body: { ar: `موعدك مع ${full.doctor.nameAr} في ${hmIn(scheduledAt, env.CLINIC_TIMEZONE)}`, en: `Your visit with ${full.doctor.nameEn} at ${hmIn(scheduledAt, env.CLINIC_TIMEZONE)}` },
        link: `/appointments/${row.id}`,
      },
      userLocale,
    );
    return toAppointmentDto(full);
  },

  async reschedule(userId: string, id: string, scheduledAtIso: string) {
    const existing = await appointmentsRepository.findOwned(userId, id);
    if (!existing) throw new NotFoundError("Appointment", id);
    if (!canCancel(existing)) throw new BadRequestError("This appointment can no longer be changed – please call the clinic");
    const scheduledAt = new Date(scheduledAtIso);
    assertValidSlot(existing.doctor, scheduledAt);
    try {
      await appointmentsRepository.update(id, { scheduledAt, status: "booked" });
    } catch (err) {
      if (isUniqueViolation(err, "appointments_doctor_slot_uq")) throw new ConflictError("That slot is already taken");
      throw err;
    }
    return toAppointmentDto((await appointmentsRepository.findById(id))!);
  },

  async cancelMine(userId: string, id: string) {
    const existing = await appointmentsRepository.findOwned(userId, id);
    if (!existing) throw new NotFoundError("Appointment", id);
    if (!canCancel(existing)) throw new BadRequestError(`Appointments can be cancelled up to ${CANCEL_CUTOFF_HOURS} hours before the visit`);
    await appointmentsRepository.update(id, { status: "cancelled" });
    log.info({ id, userId }, "Appointment cancelled by customer");
    return toAppointmentDto((await appointmentsRepository.findById(id))!);
  },

  // ---- admin ---------------------------------------------------------------------
  async adminList(query: AdminListAppointmentsQuery) {
    const filters = [];
    if (query.doctorId) filters.push(eq(appointments.doctorId, query.doctorId));
    if (query.status) filters.push(eq(appointments.status, query.status));
    if (query.from) filters.push(gte(appointments.scheduledAt, new Date(query.from)));
    if (query.to) filters.push(lte(appointments.scheduledAt, new Date(query.to)));
    const { rows, total } = await appointmentsRepository.list(filters.length ? [and(...filters)!] : [], query);
    return {
      items: rows.map((r) => ({ ...toAppointmentDto(r), user: { id: r.user.id, name: r.user.name, email: r.user.email, phone: r.user.phone } })),
      meta: pageMeta(total, query),
    };
  },

  async updateStatus(id: string, status: AppointmentStatus, notes?: string) {
    const existing = await appointmentsRepository.findById(id);
    if (!existing) throw new NotFoundError("Appointment", id);
    await appointmentsRepository.update(id, { status, ...(notes !== undefined ? { notes } : {}) });
    if (status === "confirmed" || status === "cancelled") {
      void notificationsService.notify(
        existing.userId,
        {
          title: { ar: "تحديث موعد الفحص", en: "Appointment update" },
          body: status === "confirmed" ? { ar: "تم تأكيد موعدك", en: "Your appointment is confirmed" } : { ar: "تم إلغاء موعدك", en: "Your appointment was cancelled" },
          link: `/appointments/${id}`,
        },
        existing.user.locale,
      );
    }
    return toAppointmentDto((await appointmentsRepository.findById(id))!);
  },

  async createDoctor(input: CreateDoctorInput) {
    const row = await appointmentsRepository.createDoctor({
      nameAr: input.name.ar,
      nameEn: input.name.en,
      ...toColumns("specialty", input.specialty),
      imageUrl: input.imageUrl ?? null,
      workingDays: input.workingDays.map(String),
      isActive: input.isActive,
    });
    return toDoctorDto(row);
  },

  async updateDoctor(id: string, input: UpdateDoctorInput) {
    const row = await appointmentsRepository.updateDoctor(id, {
      ...(input.name ? { nameAr: input.name.ar, nameEn: input.name.en } : {}),
      ...toColumns("specialty", input.specialty),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.workingDays ? { workingDays: input.workingDays.map(String) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    if (!row) throw new NotFoundError("Doctor", id);
    return toDoctorDto(row);
  },
};
